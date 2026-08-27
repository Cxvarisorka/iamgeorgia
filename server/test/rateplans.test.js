import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import {
    createTracker,
    databaseAvailable,
    makeAdmin,
    makeDestination,
    makeHotel,
    makePartner,
    makePartnerUser,
    signIn,
    unique
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

describe('rate plans', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partnerCookie;
    let hotel;
    let roomType;
    let flexible;
    let payNow;

    before(async () => {
        const admin = await makeAdmin(tracker);
        adminCookie = (await signIn(app, admin.email)).cookie;

        const partner = await makePartner(tracker);
        partnerCookie = (await signIn(app, (await makePartnerUser(tracker, partner)).email)).cookie;

        hotel = await makeHotel(tracker, { destination: await makeDestination(tracker) });
        roomType = await prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                code: 'deluxe',
                name: 'Deluxe Double',
                maxOccupancy: 3,
                maxAdults: 2,
                maxChildren: 1,
                standardOccupancy: 2
            }
        });

        // The shared templates the seed installs. Every hotel may use them.
        flexible = await prisma.cancellationPolicy.findFirst({ where: { hotelId: null, kind: 'FLEXIBLE' } });
        payNow = await prisma.paymentPolicy.findFirst({ where: { hotelId: null, timing: 'PAY_NOW' } });

        assert.ok(flexible && payNow, 'run `node scripts/seed-reference.js` before the suite');
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const asAdmin = (method, path) => request(app)[method](path).set('Cookie', adminCookie);
    const plansPath = (rt = roomType.id, h = hotel.id) =>
        `/api/admin/hotels/${h}/room-types/${rt}/rate-plans`;
    const policiesPath = (h = hotel.id) => `/api/admin/hotels/${h}/policies`;

    const createPlan = (body = {}, rt = roomType.id, h = hotel.id) =>
        asAdmin('post', plansPath(rt, h)).send({
            code: unique('rp').slice(0, 40),
            name: 'Breakfast, flexible',
            mealPlanCode: 'BB',
            cancellationPolicyId: flexible.id,
            paymentPolicyId: payNow.id,
            ...body
        });

    describe('authorization and scoping', () => {
        it('refuses an unauthenticated caller and a partner user', async () => {
            assert.equal((await request(app).get(plansPath())).status, 401);
            assert.equal((await request(app).get(plansPath()).set('Cookie', partnerCookie)).status, 403);
        });

        it('will not reach a rate plan through the wrong room type', async () => {
            const plan = await createPlan();
            const other = await prisma.roomType.create({
                data: { hotelId: hotel.id, code: unique('o').slice(0, 40), name: 'Other', maxOccupancy: 2, maxAdults: 2 }
            });

            assert.equal((await asAdmin('get', `${plansPath(other.id)}/${plan.body.id}`)).status, 404);
        });

        it('will not reach a rate plan through the wrong hotel', async () => {
            const plan = await createPlan();
            const otherHotel = await makeHotel(tracker, { destination: await makeDestination(tracker) });

            assert.equal(
                (await asAdmin('get', `${plansPath(roomType.id, otherHotel.id)}/${plan.body.id}`)).status,
                404
            );
        });
    });

    describe('creating an offer', () => {
        it('joins a room, a board, cancellation terms and payment terms', async () => {
            const response = await createPlan();

            assert.equal(response.status, 201);
            assert.equal(response.body.mealPlan.code, 'BB');
            assert.equal(response.body.cancellation.kind, 'FLEXIBLE');
            assert.equal(response.body.payment.timing, 'PAY_NOW');
            assert.equal(response.body.currency, 'GEL', 'inherited from the hotel contract currency');
            assert.equal(response.body.cancellation.isTemplate, true);
        });

        // The whole reason this table exists: one room, several offers, without
        // duplicating the room and therefore duplicating its inventory.
        it('sells one room four ways without duplicating the room', async () => {
            const room = await prisma.roomType.create({
                data: {
                    hotelId: hotel.id,
                    code: unique('multi').slice(0, 40),
                    name: 'Deluxe Double',
                    maxOccupancy: 3,
                    maxAdults: 2,
                    standardOccupancy: 2
                }
            });

            const nonRefundable = await prisma.cancellationPolicy.findFirst({
                where: { hotelId: null, kind: 'NON_REFUNDABLE' }
            });

            for (const [code, meal, policy] of [
                ['bb-flex', 'BB', flexible.id],
                ['bb-nr', 'BB', nonRefundable.id],
                ['hb-flex', 'HB', flexible.id],
                ['ro-nr', 'RO', nonRefundable.id]
            ]) {
                const created = await createPlan({ code, mealPlanCode: meal, cancellationPolicyId: policy }, room.id);
                assert.equal(created.status, 201, `${code} should be created`);
            }

            const list = await asAdmin('get', plansPath(room.id));
            assert.equal(list.body.data.length, 4);
            assert.equal(
                await prisma.roomType.count({ where: { hotelId: hotel.id, id: room.id } }),
                1,
                'still exactly one room type'
            );
        });

        it('refuses a meal plan that does not exist', async () => {
            const response = await createPlan({ mealPlanCode: 'XX' });

            assert.equal(response.status, 400);
        });

        // The policy lookup is the authorization check: a rate plan must not be
        // able to reference another property's negotiated terms by id.
        it('refuses another hotel-specific policy', async () => {
            const otherHotel = await makeHotel(tracker, { destination: await makeDestination(tracker) });
            const theirs = await prisma.cancellationPolicy.create({
                data: { hotelId: otherHotel.id, name: 'Theirs', kind: 'FLEXIBLE' }
            });

            const response = await createPlan({ cancellationPolicyId: theirs.id });

            assert.equal(response.status, 404);
        });

        it('refuses a rate plan that claims more adults than the room holds', async () => {
            const response = await createPlan({ maxAdults: 5 });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /more adults than the room/);
        });

        it('keeps codes unique within a room type', async () => {
            const code = unique('dup').slice(0, 40);

            assert.equal((await createPlan({ code })).status, 201);
            assert.equal((await createPlan({ code })).status, 409);
        });

        it('refuses a sellable window that ends before it begins', async () => {
            const response = await createPlan({ sellableFrom: '2026-12-20', sellableUntil: '2026-12-01' });

            assert.equal(response.status, 400);
        });

        it('round-trips a sellable window as calendar dates, not instants', async () => {
            const response = await createPlan({ sellableFrom: '2026-12-01', sellableUntil: '2027-03-31' });

            assert.equal(response.body.sellableFrom, '2026-12-01');
            assert.equal(response.body.sellableUntil, '2027-03-31');
        });
    });

    describe('archiving', () => {
        it('archives instead of deleting, and refuses to edit afterwards', async () => {
            const plan = await createPlan();

            const archived = await asAdmin('post', `${plansPath()}/${plan.body.id}/archive`);
            assert.equal(archived.status, 200);
            assert.equal(archived.body.status, 'ARCHIVED');

            assert.equal((await asAdmin('patch', `${plansPath()}/${plan.body.id}`).send({ name: 'X' })).status, 409);
        });
    });

    describe('restrictions', () => {
        it('stores a date-ranged minimum stay', async () => {
            const plan = await createPlan();

            const response = await asAdmin('post', `${plansPath()}/${plan.body.id}/restrictions`).send({
                startDate: '2026-12-20',
                endDate: '2027-01-05',
                minStay: 3,
                closedToArrival: true
            });

            assert.equal(response.status, 201);
            assert.equal(response.body.startDate, '2026-12-20');
            assert.equal(response.body.minStay, 3);
            assert.equal(response.body.closedToArrival, true);
        });

        // A two-night minimum for December plus no arrivals on Christmas Day is
        // two rules, and forcing them into one row makes both harder to edit.
        it('allows two windows to overlap', async () => {
            const plan = await createPlan();
            const path = `${plansPath()}/${plan.body.id}/restrictions`;

            assert.equal(
                (await asAdmin('post', path).send({ startDate: '2026-12-01', endDate: '2026-12-31', minStay: 2 }))
                    .status,
                201
            );
            assert.equal(
                (await asAdmin('post', path).send({
                    startDate: '2026-12-25',
                    endDate: '2026-12-25',
                    closedToArrival: true
                })).status,
                201
            );

            const reloaded = await asAdmin('get', `${plansPath()}/${plan.body.id}`);
            assert.equal(reloaded.body.restrictions.length, 2);
        });

        it('refuses a window that ends before it begins, or a maxStay below minStay', async () => {
            const plan = await createPlan();
            const path = `${plansPath()}/${plan.body.id}/restrictions`;

            assert.equal(
                (await asAdmin('post', path).send({ startDate: '2026-12-31', endDate: '2026-12-01' })).status,
                400
            );
            assert.equal(
                (await asAdmin('post', path).send({
                    startDate: '2026-12-01',
                    endDate: '2026-12-31',
                    minStay: 5,
                    maxStay: 2
                })).status,
                400
            );
        });

        it('removes a restriction', async () => {
            const plan = await createPlan();
            const created = await asAdmin('post', `${plansPath()}/${plan.body.id}/restrictions`).send({
                startDate: '2026-12-01',
                endDate: '2026-12-31',
                minStay: 2
            });

            const removed = await asAdmin(
                'delete',
                `${plansPath()}/${plan.body.id}/restrictions/${created.body.id}`
            );

            assert.equal(removed.status, 204);
            assert.equal((await asAdmin('get', `${plansPath()}/${plan.body.id}`)).body.restrictions.length, 0);
        });
    });

    describe('cancellation policies', () => {
        it('offers the platform templates alongside the hotel own policies', async () => {
            const response = await asAdmin('get', `${policiesPath()}/cancellation`);

            assert.equal(response.status, 200);
            const names = response.body.data.map((policy) => policy.name);
            assert.ok(names.includes('Flexible'));
            assert.ok(names.includes('Non-refundable'));
            assert.ok(names.includes('Tiered'));
            assert.ok(response.body.data.every((policy) => policy.isTemplate));
        });

        it('creates a hotel-specific tiered policy with its rules', async () => {
            const response = await asAdmin('post', `${policiesPath()}/cancellation`).send({
                name: 'Ski season',
                kind: 'TIERED',
                description: 'Stricter over the ski season.',
                rules: [
                    { hoursBeforeCheckIn: 1440, chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 2_500 },
                    { hoursBeforeCheckIn: 336, chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 10_000 }
                ]
            });

            assert.equal(response.status, 201);
            assert.equal(response.body.isTemplate, false);
            assert.equal(response.body.rules.length, 2);
            // Returned widest deadline first, which is the order they apply in.
            assert.equal(response.body.rules[0].hoursBeforeCheckIn, 1440);
        });

        it('refuses two tiers starting at the same deadline', async () => {
            const response = await asAdmin('post', `${policiesPath()}/cancellation`).send({
                name: 'Ambiguous',
                kind: 'TIERED',
                rules: [
                    { hoursBeforeCheckIn: 168, chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 3_000 },
                    { hoursBeforeCheckIn: 168, chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 5_000 }
                ]
            });

            assert.equal(response.status, 400);
        });

        it('refuses a percentage above 100%', async () => {
            const response = await asAdmin('post', `${policiesPath()}/cancellation`).send({
                name: 'Punitive',
                kind: 'TIERED',
                rules: [{ hoursBeforeCheckIn: 0, chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 15_000 }]
            });

            assert.equal(response.status, 400);
        });

        // A template belongs to the platform. Editing one from inside a hotel
        // would change terms for every other property using it.
        it('refuses to edit a shared template from a hotel', async () => {
            const response = await asAdmin('put', `${policiesPath()}/cancellation/${flexible.id}`).send({
                name: 'Hijacked',
                kind: 'FLEXIBLE',
                rules: []
            });

            assert.equal(response.status, 409);
            assert.match(response.body.error.message, /shared policy template/);

            const untouched = await prisma.cancellationPolicy.findUnique({ where: { id: flexible.id } });
            assert.equal(untouched.name, 'Flexible');
        });

        it('replaces the rules of its own policy rather than adding to them', async () => {
            const created = await asAdmin('post', `${policiesPath()}/cancellation`).send({
                name: unique('own'),
                kind: 'TIERED',
                rules: [
                    { hoursBeforeCheckIn: 720, chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 3_000 },
                    { hoursBeforeCheckIn: 168, chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 10_000 }
                ]
            });

            const updated = await asAdmin('put', `${policiesPath()}/cancellation/${created.body.id}`).send({
                name: created.body.name,
                kind: 'FLEXIBLE',
                rules: [{ hoursBeforeCheckIn: 24, chargeBasis: 'PERCENT_OF_FIRST_NIGHT', chargeValue: 10_000 }]
            });

            assert.equal(updated.status, 200);
            assert.equal(updated.body.rules.length, 1);
            assert.equal(updated.body.rules[0].hoursBeforeCheckIn, 24);
        });
    });

    describe('payment policies', () => {
        it('creates a deposit policy', async () => {
            const response = await asAdmin('post', `${policiesPath()}/payment`).send({
                name: 'Winter deposit',
                timing: 'DEPOSIT',
                depositBps: 3_000,
                balanceDueDaysBeforeCheckIn: 14
            });

            assert.equal(response.status, 201);
            assert.equal(response.body.depositBps, 3_000);
        });

        it('refuses a deposit policy with no deposit', async () => {
            const response = await asAdmin('post', `${policiesPath()}/payment`).send({
                name: 'Nonsense',
                timing: 'DEPOSIT'
            });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /Invalid request body/);
        });

        // The two are separate entities for exactly this reason.
        it('lets a non-refundable rate settle on a credit account', async () => {
            const nonRefundable = await prisma.cancellationPolicy.findFirst({
                where: { hotelId: null, kind: 'NON_REFUNDABLE' }
            });
            const credit = await prisma.paymentPolicy.findFirst({
                where: { hotelId: null, timing: 'CREDIT_ACCOUNT' }
            });

            const response = await createPlan({
                cancellationPolicyId: nonRefundable.id,
                paymentPolicyId: credit.id
            });

            assert.equal(response.status, 201);
            assert.equal(response.body.cancellation.kind, 'NON_REFUNDABLE');
            assert.equal(response.body.payment.timing, 'CREDIT_ACCOUNT');
        });
    });

    describe('what a hotel means by a board code', () => {
        it('records inclusions and service times against a standard code', async () => {
            const response = await asAdmin('put', `/api/admin/hotels/${hotel.id}/meal-plans`).send({
                mealPlanCode: 'HB',
                description: 'Breakfast and dinner in the main restaurant.',
                inclusions: ['Buffet breakfast', 'Three-course dinner'],
                serviceTimes: { breakfast: '07:00-10:00', dinner: '18:00-21:30' }
            });

            assert.equal(response.status, 200);
            assert.equal(response.body.code, 'HB');
            assert.equal(response.body.name, 'Half Board', 'the standard name is still the standard name');
            assert.equal(response.body.serviceTimes.dinner, '18:00-21:30');
            assert.deepEqual(response.body.inclusions, ['Buffet breakfast', 'Three-course dinner']);
        });

        it('updates in place rather than adding a second description', async () => {
            const path = `/api/admin/hotels/${hotel.id}/meal-plans`;

            await asAdmin('put', path).send({ mealPlanCode: 'BB', description: 'First' });
            await asAdmin('put', path).send({ mealPlanCode: 'BB', description: 'Second' });

            const list = await asAdmin('get', path);
            const bb = list.body.data.filter((plan) => plan.code === 'BB');

            assert.equal(bb.length, 1);
            assert.equal(bb[0].hotelDescription, 'Second');
        });
    });

    describe('publishing', () => {
        it('will not publish a room that is not actually for sale', async () => {
            const bare = await makeHotel(tracker, {
                destination: await makeDestination(tracker),
                status: 'DRAFT'
            });
            await prisma.roomType.create({
                data: { hotelId: bare.id, code: 'std', name: 'Standard', maxOccupancy: 2, maxAdults: 2 }
            });

            const response = await asAdmin('get', `/api/admin/hotels/${bare.id}`);
            const codes = response.body.publishChecklist.map((item) => item.code);

            assert.ok(!codes.includes('roomTypes'), 'there is a room');
            assert.ok(codes.includes('ratePlans'), 'but nothing to sell it as');
        });
    });
});
