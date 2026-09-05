import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import { readOfferToken } from '../lib/hotel/offerToken.js';
import { readPackageOfferToken } from '../lib/package/offerToken.js';
import { allocate, computeAdjustment } from '../services/package/quote.service.js';
import { createTracker, databaseAvailable, makeAdmin, makeDestination, makePartner, makePartnerUser, signIn } from './support/factories.js';
import { makeSellableHotel, makeService, makeTourDeparture, makeTransferLeg } from './support/packages.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

/** A Friday early in 2027: inside every horizon, inside the tour factory's season. */
const START = '2027-01-08';
const TOUR_DATE = '2027-01-09';

describe('package arithmetic (pure)', () => {
    it('allocates an adjustment by largest remainder so the lines sum exactly', () => {
        assert.deepEqual(allocate(-1000, [3333, 3333, 3334]), [-333, -333, -334]);
        assert.deepEqual(allocate(7, [1, 1, 1]), [3, 2, 2]);
        assert.deepEqual(allocate(-7, [1, 1, 1]), [-3, -2, -2]);
        assert.deepEqual(allocate(0, [5, 5]), [0, 0]);
        assert.deepEqual(allocate(5, [0, 0]), [5, 0]);
        for (const [total, weights] of [[-12_345, [1, 999, 50_000]], [999, [7, 11, 13, 17]]]) {
            assert.equal(allocate(total, weights).reduce((a, b) => a + b, 0), total);
        }
    });

    it('computes each adjustment kind against the eligible total', () => {
        const party = { adults: 2, children: 1 };
        assert.equal(computeAdjustment({ adjustmentKind: 'NONE', adjustmentValue: 0 }, party, 100_000), 0);
        assert.equal(computeAdjustment({ adjustmentKind: 'DISCOUNT_BPS', adjustmentValue: 1250 }, party, 100_000), -12_500);
        assert.equal(computeAdjustment({ adjustmentKind: 'FIXED_SELL', adjustmentValue: 90_000 }, party, 100_000), -10_000);
        assert.equal(computeAdjustment({ adjustmentKind: 'PER_PERSON_FIXED', adjustmentValue: 40_000 }, party, 100_000), 20_000);
    });
});

/**
 * A package quoted through the real engines: a hotel, a transfer, a tour and
 * a service resolve into one price, the discount is allocated across the
 * required lines, and every token on the quote is a token the standalone
 * checkout would accept.
 */
describe('package quotes', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partnerCookie;
    let destination;
    let hotel;
    let leg;
    let tour;
    let service;

    before(async () => {
        adminCookie = (await signIn(app, (await makeAdmin(tracker)).email)).cookie;
        partnerCookie = (await signIn(app, (await makePartnerUser(tracker, await makePartner(tracker))).email)).cookie;
        destination = await makeDestination(tracker);
        hotel = await makeSellableHotel(app, adminCookie, tracker, { destination, checkIn: START, nights: 3 });
        leg = await makeTransferLeg(tracker, { destination });
        tour = await makeTourDeparture(tracker, { destination, date: TOUR_DATE });
        service = await makeService(tracker, { destination });
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const components = () => [
        { componentType: 'HOTEL_STAY', label: 'Two nights in town', nights: 2, hotelId: hotel.hotel.id },
        { componentType: 'TRANSFER', label: 'Airport pick-up', fromPointId: leg.from.id, toPointId: leg.to.id, timeOfDay: '11:00' },
        { componentType: 'TOUR', label: 'A day in the mountains', dayOffset: 1, tourId: tour.tour.id },
        { componentType: 'SERVICE', label: 'Kosher dinner', required: false, serviceId: service.id, quantityRule: 'PER_PERSON' }
    ];

    const createPackage = async (overrides = {}) => {
        const response = await request(app)
            .post('/api/admin/packages')
            .set('Cookie', adminCookie)
            .send({
                slug: `weekend-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                name: 'Weekend in the mountains',
                destinationId: destination.id,
                summary: 'Two nights, a trek and a transfer.',
                image: '/images/packages/test.jpg',
                nights: 2,
                b2cEnabled: true,
                adjustmentKind: 'DISCOUNT_BPS',
                adjustmentValue: 1000,
                components: components(),
                ...overrides
            });

        if (response.status === 201) {
            tracker.package(response.body);
        }

        return response;
    };

    const publish = (id) => request(app).post(`/api/admin/packages/${id}/publish`).set('Cookie', adminCookie);

    it('refuses a template whose fixed products cannot be sold as written', async () => {
        const otherCurrency = await makeSellableHotel(app, adminCookie, tracker, { destination, checkIn: START, nights: 2, currency: 'USD' });

        const bad = await createPackage({
            components: [
                { componentType: 'HOTEL_STAY', label: 'Dollar hotel', nights: 2, hotelId: otherCurrency.hotel.id },
                { componentType: 'TOUR', label: 'Too late', dayOffset: 5, tourId: tour.tour.id }
            ]
        });
        assert.equal(bad.status, 422, JSON.stringify(bad.body));
        const codes = bad.body.error.details.problems.map((problem) => `${problem.slotIndex}:${problem.code}`);
        assert.deepEqual(codes.sort(), ['0:CURRENCY', '1:OUTSIDE_PACKAGE']);
    });

    it('quotes every slot through its own engine and allocates the discount', async () => {
        const created = await createPackage();
        assert.equal(created.status, 201, JSON.stringify(created.body));
        assert.equal(created.body.status, 'DRAFT');
        assert.equal(created.body.components.length, 4);

        const published = await publish(created.body.id);
        assert.equal(published.status, 200, JSON.stringify(published.body));

        // Anonymous, so every product is priced at the platform markup of 15%.
        // The transfer slot is pinned to the test's own vehicle: the shared
        // database carries other classes that would win on price.
        const pin = encodeURIComponent(JSON.stringify({ 1: { vehicleId: leg.vehicle.id } }));
        const quote = await request(app).get(`/api/packages/${created.body.slug}/quote?startDate=${START}&adults=2&choices=${pin}`);
        assert.equal(quote.status, 200, JSON.stringify(quote.body));
        assert.equal(quote.body.available, true);
        assert.equal(quote.body.endDate, '2027-01-10');
        assert.ok(quote.body.token);

        const [stay, transfer, trek, dinner] = quote.body.components;
        assert.equal(stay.resolved.hotel.id, hotel.hotel.id);
        assert.equal(stay.resolved.checkIn, START);
        assert.equal(stay.resolved.checkOut, '2027-01-10');
        // Two nights at 200.00 net + 15% = 460.00.
        assert.equal(stay.resolved.sellCents, 46_000);
        assert.equal(stay.resolved.netCents, undefined, 'net is never public');
        assert.equal(transfer.resolved.vehicle.id, leg.vehicle.id);
        // A curated fare is a fixed selling price, not a net to mark up.
        assert.equal(transfer.resolved.sellCents, 20_000);
        assert.equal(transfer.resolved.legs[0].pickupAt, '2027-01-08T07:00:00.000Z', '11:00 Tbilisi');
        assert.equal(trek.resolved.option.id, tour.option.id);
        assert.equal(trek.resolved.date, TOUR_DATE);
        assert.equal(trek.resolved.sellCents, 23_000, 'two adults at 100.00 + 15%');
        assert.equal(dinner.included, true);
        assert.equal(dinner.resolved.quantity, 2, 'one per person');
        assert.equal(dinner.resolved.sellCents, 46_000, '2 quantity × 2 pax × 100.00 + 15%');

        // The discount applies to the required lines only, and the allocation
        // lands each share on its line so the lines sum to the total.
        const required = 46_000 + 20_000 + 23_000;
        assert.equal(quote.body.totals.componentsSellCents, required + 46_000);
        assert.equal(quote.body.totals.adjustmentCents, -8_900);
        assert.equal(quote.body.totals.totalCents, required + 46_000 - 8_900);
        assert.equal(dinner.adjustmentCents, 0);
        assert.equal(
            quote.body.components.reduce((sum, component) => sum + component.lineTotalCents, 0),
            quote.body.totals.totalCents
        );

        // The hotel token on the quote is a real hotel offer token.
        const decoded = readOfferToken(stay.resolved.token);
        assert.equal(decoded.ratePlanId, hotel.ratePlan.id);
        assert.equal(decoded.quotedSellCents, 46_000);

        // And the package token names every slot.
        const pkgToken = readPackageOfferToken(quote.body.token);
        assert.equal(pkgToken.slots.length, 4);
        assert.equal(pkgToken.quotedTotalCents, quote.body.totals.totalCents);
        assert.deepEqual(pkgToken.slots[3].service.serviceId, service.id);

        // A partner is quoted at its own commission (10%), and sees no net either.
        const trade = await request(app).get(`/api/packages/${created.body.slug}/quote?startDate=${START}&adults=2&choices=${pin}`).set('Cookie', partnerCookie);
        assert.equal(trade.body.components[0].resolved.sellCents, 44_000);
        assert.equal(trade.body.totals.componentsNetCents, undefined);

        // An admin preview sees the net beside the sell, on the same draft or live template.
        const preview = await request(app).get(`/api/admin/packages/${created.body.id}/preview-quote?startDate=${START}&adults=2&choices=${pin}`).set('Cookie', adminCookie);
        assert.equal(preview.status, 200);
        assert.equal(preview.body.totals.componentsNetCents, 40_000 + preview.body.components[1].resolved.netCents + 20_000 + 40_000);
        assert.ok(preview.body.components[1].resolved.netCents > 0);
        assert.equal(preview.body.token, null, 'a preview issues no token');
    });

    it('honours choices and exclusions, and re-prices a token', async () => {
        const created = await createPackage();
        await publish(created.body.id);
        const privateOption = await prisma.tourOption.create({
            data: {
                tourId: tour.tour.id,
                code: 'private',
                name: 'Private car',
                kind: 'PRIVATE',
                pricingBasis: 'PER_GROUP',
                unitKind: 'GROUP',
                maxPax: 6,
                cancellationPolicyId: tour.option.cancellationPolicyId,
                seasons: {
                    create: [{ name: 'Year', validFrom: new Date('2027-01-01T00:00:00.000Z'), validUntil: new Date('2027-12-31T00:00:00.000Z'), currency: 'GEL', tiers: { create: [{ minPax: 1, groupNetCents: 60_000 }] } }]
                },
                inventory: { create: [{ date: new Date(`${TOUR_DATE}T00:00:00.000Z`), totalUnits: 2 }] }
            }
        });

        const choices = encodeURIComponent(JSON.stringify({ 1: { vehicleId: leg.vehicle.id }, 2: { tourOptionId: privateOption.id } }));
        const quote = await request(app).get(`/api/packages/${created.body.slug}/quote?startDate=${START}&adults=2&choices=${choices}&exclude=3`);
        assert.equal(quote.status, 200, JSON.stringify(quote.body));
        const trek = quote.body.components[2];
        assert.equal(trek.resolved.option.id, privateOption.id);
        assert.equal(trek.resolved.sellCents, 69_000);
        assert.ok(trek.alternatives.some((alternative) => alternative.tourOptionId === tour.option.id), 'the cheaper seat is offered back');
        assert.equal(quote.body.components[3].included, false);
        assert.equal(quote.body.components[3].reason, 'EXCLUDED');

        // Re-pricing the token lands on the same choices and the same figure…
        const same = await request(app).post('/api/packages/quotes/revalidate').send({ token: quote.body.token });
        assert.equal(same.status, 200, JSON.stringify(same.body));
        assert.equal(same.body.priceChanged, false);
        assert.equal(same.body.components[2].resolved.option.id, privateOption.id);
        assert.equal(same.body.components[3].included, false);

        // …until the operator reprices the private car.
        await prisma.tourSeasonTier.updateMany({ where: { season: { tourOptionId: privateOption.id } }, data: { groupNetCents: 70_000 } });
        const moved = await request(app).post('/api/packages/quotes/revalidate').send({ token: quote.body.token });
        assert.equal(moved.status, 200);
        assert.equal(moved.body.priceChanged, true);
        assert.equal(moved.body.quotedTotalCents, quote.body.totals.totalCents);
        assert.equal(moved.body.totals.totalCents - quote.body.totals.totalCents, Math.round(11_500 * 0.9));
    });

    it('is unavailable when a required slot cannot be filled, and says which', async () => {
        const created = await createPackage();
        await publish(created.body.id);

        // No tour departure the day after this start.
        const quote = await request(app).get(`/api/packages/${created.body.slug}/quote?startDate=2027-01-15&adults=2`);
        assert.equal(quote.status, 200, JSON.stringify(quote.body));
        assert.equal(quote.body.available, false);
        assert.equal(quote.body.unavailableReason, 'COMPONENT_UNAVAILABLE');
        assert.equal(quote.body.token, null);
        assert.equal(quote.body.components[2].resolved, null);
        assert.ok(quote.body.components[2].reason);
        assert.equal(quote.body.totals.adjustmentCents, 0, 'no discount on an unsellable package');

        // A party the template does not take.
        const big = await request(app).get(`/api/packages/${created.body.slug}/quote?startDate=${START}&adults=2&childAges=3&childAges=5`);
        assert.equal(big.status, 200, 'children are allowed by default');
        await request(app).patch(`/api/admin/packages/${created.body.id}`).set('Cookie', adminCookie).send({ maxChildren: 1 });
        const refused = await request(app).get(`/api/packages/${created.body.slug}/quote?startDate=${START}&adults=2&childAges=3&childAges=5`);
        assert.equal(refused.status, 422);
        assert.equal(refused.body.error.details.reason, 'PARTY_SIZE');

        // Off the public channel: the catalogue hides it and the quote is a 404.
        await request(app).patch(`/api/admin/packages/${created.body.id}`).set('Cookie', adminCookie).send({ b2cEnabled: false });
        assert.equal((await request(app).get(`/api/packages/${created.body.slug}`)).status, 404);
        assert.equal((await request(app).get(`/api/packages/${created.body.slug}`).set('Cookie', partnerCookie)).status, 200);
    });
});
