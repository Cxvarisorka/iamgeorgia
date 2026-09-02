import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { disconnect, prisma } from '../db/index.js';
import {
    createTracker,
    databaseAvailable,
    makeAdmin,
    makeDriver,
    makeDriverUser,
    makeFleetVehicle,
    makePartner,
    makePartnerUser,
    makeTransferBooking,
    makeTransferPoint,
    makeTransferProvider,
    makeTransferVehicle,
    signIn
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

const HOUR = 3_600_000;
const inHours = (hours) => new Date(Date.now() + hours * HOUR);

/**
 * Phase 3 of the fleet module: dispatch. Offering a leg, the driver's answer,
 * the milestones, the roll-up, and every way the database and the service
 * refuse to put one driver in two places.
 */
describe('dispatch', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let dispatcherCookie;
    let partner;
    let partnerCookie;
    let provider;
    let vehicleClass;
    let airport;
    let city;
    let car;
    let driverA;
    let driverACookie;
    let driverB;
    let driverBCookie;
    let driverC;
    let driverCCookie;

    const dispatch = (legId, body, cookie = dispatcherCookie) =>
        request(app).post(`/api/admin/transfers/dispatch/legs/${legId}/assign`).set('Cookie', cookie).send(body);

    const newBooking = (overrides = {}) =>
        makeTransferBooking(tracker, { vehicleId: vehicleClass.id, from: airport, to: city, ...overrides });

    before(async () => {
        const admin = await makeAdmin(tracker);
        const dispatcher = await makeAdmin(tracker, { role: 'DISPATCHER' });
        partner = await makePartner(tracker);
        const partnerUser = await makePartnerUser(tracker, partner);

        provider = tracker.transferProvider(await makeTransferProvider());
        vehicleClass = tracker.transferVehicle(await makeTransferVehicle({ providerId: provider.id }));
        airport = tracker.transferPoint(await makeTransferPoint({ kind: 'AIRPORT' }));
        city = tracker.transferPoint(await makeTransferPoint({ latitude: 42.4781, longitude: 44.4783 }));

        car = await makeFleetVehicle(tracker, { providerId: provider.id, vehicleClassId: vehicleClass.id });
        driverA = await makeDriver(tracker, { providerId: provider.id, firstName: 'Levan' });
        driverB = await makeDriver(tracker, {
            providerId: provider.id,
            firstName: 'Nika',
            verificationStatus: 'PENDING',
            verifiedAt: null
        });
        driverC = await makeDriver(tracker, { providerId: provider.id, firstName: 'Dato' });
        const userA = await makeDriverUser(tracker, driverA);
        const userB = await makeDriverUser(tracker, driverB);
        const userC = await makeDriverUser(tracker, driverC);
        await prisma.transferDriverVehicle.create({ data: { driverId: driverA.id, fleetVehicleId: car.id, isPrimary: true } });

        adminCookie = (await signIn(app, admin.email)).cookie;
        dispatcherCookie = (await signIn(app, dispatcher.email)).cookie;
        partnerCookie = (await signIn(app, partnerUser.email)).cookie;
        driverACookie = (await signIn(app, userA.email)).cookie;
        driverBCookie = (await signIn(app, userB.email)).cookie;
        driverCCookie = (await signIn(app, userC.email)).cookie;
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    describe('offering a leg', () => {
        it('records an offer, occupies the driver, and shows it on the board', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 10) });
            const leg = booking.legs[0];

            const res = await dispatch(leg.id, { driverId: driverA.id, fleetVehicleId: car.id });
            assert.equal(res.status, 201, JSON.stringify(res.body));
            assert.equal(res.body.status, 'ASSIGNED');
            assert.equal(res.body.assignment.status, 'OFFERED');
            assert.equal(res.body.assignment.driver.firstName, 'Levan');
            assert.equal(res.body.assignment.driver.phone, driverA.phone);
            assert.equal(res.body.assignment.vehicle.id, car.id);
            assert.deepEqual(res.body.assignment.overrides, []);
            assert.ok(res.body.allowedTransitions.includes('UNASSIGNED'));

            const window = res.body.assignment;
            assert.equal(new Date(window.windowStart).getTime(), leg.pickupAt.getTime() - 45 * 60_000);
            assert.equal(new Date(window.windowEnd).getTime(), leg.pickupAt.getTime() + (90 + 30) * 60_000);

            const board = await request(app)
                .get('/api/admin/transfers/dispatch/legs')
                .set('Cookie', dispatcherCookie)
                .query({ legStatus: 'ASSIGNED' });
            assert.equal(board.status, 200);
            assert.ok(board.body.data.some((row) => row.id === leg.id));
        });

        it('refuses a car that cannot carry the party, and an unverified driver without a say-so', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 11) });
            const small = await makeFleetVehicle(tracker, {
                providerId: provider.id,
                vehicleClassId: vehicleClass.id,
                passengerCapacity: 1
            });

            const tooSmall = await dispatch(booking.legs[0].id, { driverId: driverA.id, fleetVehicleId: small.id });
            assert.equal(tooSmall.status, 422);
            assert.equal(tooSmall.body.error.details.reason, 'CAPACITY');

            const unverified = await dispatch(booking.legs[0].id, { driverId: driverB.id });
            assert.equal(unverified.status, 422);
            assert.equal(unverified.body.error.details.reason, 'OVERRIDE_REQUIRED');
            assert.deepEqual(unverified.body.error.details.overrides, ['UNVERIFIED_DRIVER']);

            const overridden = await dispatch(booking.legs[0].id, { driverId: driverB.id, overrideUnverified: true });
            assert.equal(overridden.status, 201, JSON.stringify(overridden.body));
            assert.deepEqual(overridden.body.assignment.overrides, ['UNVERIFIED_DRIVER']);
        });

        it('refuses a driver who is already busy, naming the booking in the way', async () => {
            const first = await newBooking({ pickupAt: inHours(24 * 12) });
            const second = await newBooking({ pickupAt: inHours(24 * 12 + 1) });

            assert.equal((await dispatch(first.legs[0].id, { driverId: driverA.id })).status, 201);

            const clash = await dispatch(second.legs[0].id, { driverId: driverA.id });
            assert.equal(clash.status, 409, JSON.stringify(clash.body));
            assert.equal(clash.body.error.details.reason, 'SCHEDULE_CONFLICT');
            assert.equal(clash.body.error.details.conflicts[0].bookingReference, first.reference);
            assert.equal(clash.body.error.details.conflicts[0].resourceType, 'DRIVER');

            // Far enough apart, and the same driver is fine.
            const later = await newBooking({ pickupAt: inHours(24 * 12 + 4) });
            assert.equal((await dispatch(later.legs[0].id, { driverId: driverA.id })).status, 201);
        });

        it('lets exactly one of two simultaneous dispatchers have the driver', async () => {
            const first = await newBooking({ pickupAt: inHours(24 * 13) });
            const second = await newBooking({ pickupAt: inHours(24 * 13 + 0.5) });

            const [a, b] = await Promise.all([
                dispatch(first.legs[0].id, { driverId: driverB.id, overrideUnverified: true }, adminCookie),
                dispatch(second.legs[0].id, { driverId: driverB.id, overrideUnverified: true }, dispatcherCookie)
            ]);

            assert.deepEqual([a.status, b.status].sort(), [201, 409]);

            const live = await prisma.transferAssignment.count({
                where: { driverId: driverB.id, status: { in: ['OFFERED', 'ACCEPTED'] }, windowStart: { gte: inHours(24 * 12.9) } }
            });
            assert.equal(live, 1);
        });

        it('reassigns by superseding, and the old offer can no longer be accepted', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 14) });
            const first = await dispatch(booking.legs[0].id, { driverId: driverA.id });
            assert.equal(first.status, 201);
            const oldId = first.body.assignment.id;

            const second = await dispatch(booking.legs[0].id, { driverId: driverB.id, overrideUnverified: true });
            assert.equal(second.status, 201, JSON.stringify(second.body));
            assert.notEqual(second.body.assignment.id, oldId);
            assert.equal(second.body.status, 'ASSIGNED');

            const old = await prisma.transferAssignment.findUnique({ where: { id: oldId } });
            assert.equal(old.status, 'REVOKED');
            assert.equal(old.revokeReason, 'REASSIGNED');
            assert.equal(old.supersededByAssignmentId, second.body.assignment.id);

            const stale = await request(app).post(`/api/driver/assignments/${oldId}/accept`).set('Cookie', driverACookie);
            assert.equal(stale.status, 409);
            assert.equal(stale.body.error.details.reason, 'ASSIGNMENT_NOT_ACTIVE');
        });

        it('lists candidates with their conflicts shown rather than hidden', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 12) });

            const res = await request(app)
                .get(`/api/admin/transfers/dispatch/legs/${booking.legs[0].id}/candidates`)
                .set('Cookie', dispatcherCookie);
            assert.equal(res.status, 200, JSON.stringify(res.body));

            const levan = res.body.data.find((row) => row.driver.id === driverA.id);
            assert.ok(levan);
            assert.ok(levan.conflicts.length > 0, 'Levan holds a job at that time already');
            assert.equal(levan.verified, true);
            assert.ok(levan.vehicles.some((entry) => entry.id === car.id && entry.classMatches));
        });

        it('offers only drivers with an active car of the booked class, and only those cars', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 12.5) });

            // Levan also drives a minivan; Dato drives only the minivan; Nika has no car at all.
            const otherClass = tracker.transferVehicle(
                await makeTransferVehicle({ providerId: provider.id, name: 'Test Minivan', vehicleClass: 'MINIVAN' })
            );
            const van = await makeFleetVehicle(tracker, {
                providerId: provider.id,
                vehicleClassId: otherClass.id,
                model: 'Alphard',
                passengerCapacity: 6
            });
            const retired = await makeFleetVehicle(tracker, {
                providerId: provider.id,
                vehicleClassId: vehicleClass.id,
                status: 'INACTIVE'
            });
            await prisma.transferDriverVehicle.createMany({
                data: [
                    { driverId: driverA.id, fleetVehicleId: van.id, isPrimary: false },
                    { driverId: driverC.id, fleetVehicleId: van.id, isPrimary: true },
                    { driverId: driverC.id, fleetVehicleId: retired.id, isPrimary: false }
                ]
            });

            try {
                const res = await request(app)
                    .get(`/api/admin/transfers/dispatch/legs/${booking.legs[0].id}/candidates`)
                    .set('Cookie', dispatcherCookie);
                assert.equal(res.status, 200, JSON.stringify(res.body));

                const ids = res.body.data.map((row) => row.driver.id);
                assert.ok(ids.includes(driverA.id), 'Levan has a car of the booked class');
                assert.ok(!ids.includes(driverB.id), 'Nika has no car');
                assert.ok(!ids.includes(driverC.id), "Dato's only car of the class is off the road");

                const levan = res.body.data.find((row) => row.driver.id === driverA.id);
                assert.deepEqual(
                    levan.vehicles.map((entry) => entry.id),
                    [car.id],
                    'the minivan is not offered for a sedan booking'
                );
                assert.ok(levan.vehicles.every((entry) => entry.classMatches));
            } finally {
                await prisma.transferDriverVehicle.deleteMany({
                    where: { OR: [{ fleetVehicleId: van.id }, { fleetVehicleId: retired.id }] }
                });
            }
        });
    });

    describe("the driver's answer", () => {
        it('accepts, then the partner sees who is coming — and the phone only once close', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 15), partnerId: partner.id });
            const legId = booking.legs[0].id;
            const offered = await dispatch(legId, { driverId: driverA.id, fleetVehicleId: car.id });
            const assignmentId = offered.body.assignment.id;

            const before = await request(app)
                .get(`/api/partner/transfers/bookings/${booking.reference}`)
                .set('Cookie', partnerCookie);
            assert.equal(before.status, 200);
            assert.equal(before.body.legs[0].status, 'ASSIGNED');
            assert.equal(before.body.legs[0].assignment, null);

            const other = await request(app).post(`/api/driver/assignments/${assignmentId}/accept`).set('Cookie', driverBCookie);
            assert.equal(other.status, 404, 'another driver cannot even see it');

            const accepted = await request(app).post(`/api/driver/assignments/${assignmentId}/accept`).set('Cookie', driverACookie);
            assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
            assert.equal(accepted.body.status, 'ACCEPTED');
            assert.equal(accepted.body.leg.status, 'ACCEPTED');
            assert.equal(accepted.body.booking.leadPassengerPhone, booking.leadPassengerPhone);
            assert.equal('sellCents' in accepted.body.leg, false);
            assert.equal('netCents' in accepted.body.leg, false);

            const after = await request(app)
                .get(`/api/partner/transfers/bookings/${booking.reference}`)
                .set('Cookie', partnerCookie);
            const shown = after.body.legs[0].assignment;
            assert.equal(shown.driver.firstName, 'Levan');
            assert.equal(shown.driver.lastName, driverA.lastName);
            assert.equal(shown.driver.verified, true);
            assert.equal('phone' in shown.driver, false, 'not until the day before');
            assert.equal('licenceNumber' in shown.driver, false);
            assert.equal(shown.vehicle.plateNumber, car.plateNumber);

            const guest = await request(app)
                .get(`/api/transfers/bookings/${booking.reference}`)
                .query({ email: booking.leadPassengerEmail });
            assert.equal(guest.status, 404, 'a partner booking is never readable by email');

            // Move the pick-up to within the reveal window and the number appears.
            await prisma.transferBookingLeg.update({ where: { id: legId }, data: { pickupAt: inHours(3) } });
            const close = await request(app)
                .get(`/api/partner/transfers/bookings/${booking.reference}`)
                .set('Cookie', partnerCookie);
            assert.equal(close.body.legs[0].assignment.driver.phone, driverA.phone);
        });

        it('shows the passenger the surname initial only', async () => {
            const booking = await newBooking({ pickupAt: inHours(20) });
            const offered = await dispatch(booking.legs[0].id, { driverId: driverA.id, acceptOnBehalf: true });
            assert.equal(offered.body.status, 'ACCEPTED');

            const guest = await request(app)
                .get(`/api/transfers/bookings/${booking.reference}`)
                .query({ email: booking.leadPassengerEmail });
            assert.equal(guest.status, 200);
            const shown = guest.body.legs[0].assignment;
            assert.equal(shown.driver.lastName, `${driverA.lastName[0]}.`);
            assert.equal(shown.driver.phone, driverA.phone, 'within a day of pick-up');
        });

        it('declines an offer back to the board, but not an accepted job at the last minute', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 16) });
            const offered = await dispatch(booking.legs[0].id, { driverId: driverA.id });

            const declined = await request(app)
                .post(`/api/driver/assignments/${offered.body.assignment.id}/decline`)
                .set('Cookie', driverACookie)
                .send({ reason: 'Family' });
            assert.equal(declined.status, 200, JSON.stringify(declined.body));
            assert.equal(declined.body.status, 'DECLINED');
            assert.equal(declined.body.leg.status, 'UNASSIGNED');

            const soon = await newBooking({ pickupAt: inHours(2) });
            const accepted = await dispatch(soon.legs[0].id, { driverId: driverA.id, acceptOnBehalf: true });
            const late = await request(app)
                .post(`/api/driver/assignments/${accepted.body.assignment.id}/decline`)
                .set('Cookie', driverACookie)
                .send({});
            assert.equal(late.status, 409);
            assert.equal(late.body.error.details.reason, 'LATE_DECLINE');
        });

        it('lists only their own jobs, split into today, upcoming and history', async () => {
            const upcoming = await request(app)
                .get('/api/driver/assignments')
                .set('Cookie', driverACookie)
                .query({ scope: 'upcoming' });
            assert.equal(upcoming.status, 200);
            assert.ok(upcoming.body.data.length > 0);
            assert.ok(upcoming.body.data.every((row) => ['OFFERED', 'ACCEPTED'].includes(row.status)));

            const theirs = await request(app)
                .get('/api/driver/assignments')
                .set('Cookie', driverBCookie)
                .query({ scope: 'upcoming' });
            const ids = new Set(upcoming.body.data.map((row) => row.id));
            assert.ok(theirs.body.data.every((row) => !ids.has(row.id)));
        });
    });

    describe('the job itself', () => {
        it('walks the leg to COMPLETED with server-side times, and closes the booking', async () => {
            const booking = await newBooking({ pickupAt: inHours(1) });
            const legId = booking.legs[0].id;
            const offered = await dispatch(legId, { driverId: driverC.id, fleetVehicleId: car.id });
            const assignmentId = offered.body.assignment.id;
            await request(app).post(`/api/driver/assignments/${assignmentId}/accept`).set('Cookie', driverCCookie);

            const status = (body, cookie = driverCCookie) =>
                request(app).post(`/api/driver/assignments/${assignmentId}/status`).set('Cookie', cookie).send(body);

            const enRoute = await status({ to: 'EN_ROUTE', expectedFrom: 'ACCEPTED' });
            assert.equal(enRoute.status, 200, JSON.stringify(enRoute.body));
            assert.equal(enRoute.body.leg.status, 'EN_ROUTE');
            assert.ok(enRoute.body.milestones.enRouteAt);

            const stale = await status({ to: 'ARRIVED', expectedFrom: 'ACCEPTED' });
            assert.equal(stale.status, 409);
            assert.equal(stale.body.error.details.reason, 'STALE_STATE');

            const replay = await status({ to: 'EN_ROUTE' });
            assert.equal(replay.status, 200, 'the same state again is a no-op, not a conflict');

            const skipped = await status({ to: 'ON_BOARD' });
            assert.equal(skipped.status, 200);
            assert.ok(skipped.body.milestones.arrivedAt, 'the skipped milestone is filled in');
            assert.ok(skipped.body.milestones.pickedUpAt);

            const early = await status({ to: 'COMPLETED' });
            assert.equal(early.status, 409);
            assert.equal(early.body.error.details.reason, 'TOO_EARLY');

            await prisma.transferBookingLeg.update({ where: { id: legId }, data: { pickupAt: inHours(-1) } });
            const done = await status({ to: 'COMPLETED' });
            assert.equal(done.status, 200, JSON.stringify(done.body));
            assert.equal(done.body.status, 'COMPLETED');
            assert.equal(done.body.leg.status, 'COMPLETED');
            assert.deepEqual(done.body.allowedTransitions, []);

            const closed = await prisma.transferBooking.findUnique({ where: { id: booking.id } });
            assert.equal(closed.status, 'COMPLETED');
            assert.ok(closed.completedAt);

            const driver = await prisma.transferDriver.findUnique({ where: { id: driverC.id } });
            assert.equal(driver.completedCount >= 1, true);

            const invite = await prisma.outboxEvent.findFirst({ where: { topic: 'transfer.rating.invite', entityId: legId } });
            assert.ok(invite, 'a rating invite is queued');
        });

        it('lets the driver report a no-show after the wait, and operations confirm it', async () => {
            const booking = await newBooking({ pickupAt: inHours(-1.5) });
            const legId = booking.legs[0].id;
            const offered = await dispatch(legId, { driverId: driverC.id, acceptOnBehalf: true });
            const assignmentId = offered.body.assignment.id;

            const status = (body) =>
                request(app).post(`/api/driver/assignments/${assignmentId}/status`).set('Cookie', driverCCookie).send(body);

            assert.equal((await status({ to: 'ARRIVED' })).status, 200);

            const reported = await status({ to: 'NO_SHOW_REPORTED' });
            assert.equal(reported.status, 200, JSON.stringify(reported.body));
            assert.ok(reported.body.milestones.noShowReportedAt);

            const driverFinal = await status({ to: 'NO_SHOW' });
            assert.equal(driverFinal.status, 409);
            assert.equal(driverFinal.body.error.details.reason, 'INVALID_TRANSITION');

            const confirmed = await request(app)
                .post(`/api/admin/transfers/dispatch/legs/${legId}/status`)
                .set('Cookie', dispatcherCookie)
                .send({ to: 'NO_SHOW' });
            assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
            assert.equal(confirmed.body.status, 'NO_SHOW');

            const closed = await prisma.transferBooking.findUnique({ where: { id: booking.id } });
            assert.equal(closed.status, 'NO_SHOW');
        });

        it('refuses to set off hours before the pick-up', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 17) });
            const offered = await dispatch(booking.legs[0].id, { driverId: driverC.id, acceptOnBehalf: true });

            const early = await request(app)
                .post(`/api/driver/assignments/${offered.body.assignment.id}/status`)
                .set('Cookie', driverCCookie)
                .send({ to: 'EN_ROUTE' });
            assert.equal(early.status, 409);
            assert.equal(early.body.error.details.reason, 'TOO_EARLY');
        });
    });

    describe('cancellation and blocks', () => {
        it('cancelling a booking revokes the driver, but not once the passenger is aboard', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 18) });
            const legId = booking.legs[0].id;
            const offered = await dispatch(legId, { driverId: driverC.id, acceptOnBehalf: true });

            const cancelled = await request(app)
                .post(`/api/admin/transfers/bookings/${booking.reference}/cancel`)
                .set('Cookie', adminCookie)
                .send({ reason: 'Flight cancelled' });
            assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));

            const leg = await prisma.transferBookingLeg.findUnique({ where: { id: legId } });
            assert.equal(leg.status, 'CANCELLED');
            const assignment = await prisma.transferAssignment.findUnique({ where: { id: offered.body.assignment.id } });
            assert.equal(assignment.status, 'REVOKED');
            assert.equal(assignment.revokeReason, 'BOOKING_CANCELLED');

            const aboard = await newBooking({ pickupAt: inHours(-0.5) });
            const second = await dispatch(aboard.legs[0].id, { driverId: driverC.id, acceptOnBehalf: true });
            await request(app)
                .post(`/api/driver/assignments/${second.body.assignment.id}/status`)
                .set('Cookie', driverCCookie)
                .send({ to: 'ON_BOARD' });

            const refused = await request(app)
                .post(`/api/admin/transfers/bookings/${aboard.reference}/cancel`)
                .set('Cookie', adminCookie)
                .send({});
            assert.equal(refused.status, 409);
            assert.equal(refused.body.error.details.reason, 'LEG_IN_PROGRESS');
        });

        it('takes a driver off a leg and puts it back on the board', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 19) });
            const offered = await dispatch(booking.legs[0].id, { driverId: driverC.id });

            const res = await request(app)
                .post(`/api/admin/transfers/dispatch/legs/${booking.legs[0].id}/unassign`)
                .set('Cookie', dispatcherCookie)
                .send({ reason: 'Driver asked to swap' });
            assert.equal(res.status, 200, JSON.stringify(res.body));
            assert.equal(res.body.status, 'UNASSIGNED');
            assert.equal(res.body.assignment, null);

            const old = await prisma.transferAssignment.findUnique({ where: { id: offered.body.assignment.id } });
            assert.equal(old.status, 'REVOKED');
        });

        it('a block cannot sit on a job, and a job cannot sit on a block', async () => {
            const booking = await newBooking({ pickupAt: inHours(24 * 20) });
            await dispatch(booking.legs[0].id, { driverId: driverC.id, acceptOnBehalf: true });

            const onTop = await request(app)
                .post('/api/admin/transfers/dispatch/blocks')
                .set('Cookie', dispatcherCookie)
                .send({
                    driverId: driverC.id,
                    startsAt: inHours(24 * 20 - 2).toISOString(),
                    endsAt: inHours(24 * 20 + 2).toISOString(),
                    reason: 'DAY_OFF'
                });
            assert.equal(onTop.status, 409, JSON.stringify(onTop.body));
            assert.equal(onTop.body.error.details.reason, 'SCHEDULE_CONFLICT');

            const dayOff = await request(app)
                .post('/api/admin/transfers/dispatch/blocks')
                .set('Cookie', dispatcherCookie)
                .send({
                    driverId: driverC.id,
                    startsAt: inHours(24 * 21).toISOString(),
                    endsAt: inHours(24 * 22).toISOString(),
                    reason: 'DAY_OFF',
                    note: 'Wedding'
                });
            assert.equal(dayOff.status, 201, JSON.stringify(dayOff.body));

            const during = await newBooking({ pickupAt: inHours(24 * 21 + 5) });
            const blocked = await dispatch(during.legs[0].id, { driverId: driverC.id });
            assert.equal(blocked.status, 409);
            assert.equal(blocked.body.error.details.conflicts[0].sourceKind, 'BLOCK');

            const schedule = await request(app)
                .get('/api/admin/transfers/dispatch/schedule')
                .set('Cookie', dispatcherCookie)
                .query({
                    driverId: driverC.id,
                    from: inHours(24 * 19).toISOString().slice(0, 10),
                    to: inHours(24 * 23).toISOString().slice(0, 10)
                });
            assert.equal(schedule.status, 200, JSON.stringify(schedule.body));
            const kinds = new Set(schedule.body.data.map((row) => row.sourceKind));
            assert.ok(kinds.has('BLOCK'));
            assert.ok(kinds.has('ASSIGNMENT'));

            const removed = await request(app)
                .delete(`/api/admin/transfers/dispatch/blocks/${dayOff.body.id}`)
                .set('Cookie', dispatcherCookie);
            assert.equal(removed.status, 204);
        });
    });
});
