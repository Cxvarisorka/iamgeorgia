import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { disconnect } from '../db/index.js';
import {
    createTracker,
    databaseAvailable,
    futureDate,
    makeTransferPoint,
    makeTransferPrice,
    makeTransferRoute,
    makeTransferVehicle,
    unique
} from './support/factories.js';
import {
    durationFor,
    haversineKm,
    isBlackedOut,
    isNightPickup,
    legFare,
    pickupInstant,
    quoteJourney,
    routeMetrics
} from '../services/transfer/pricing.service.js';
import { prisma } from '../db/index.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

/**
 * The pure maths first, then the same maths reached through HTTP.
 *
 * The split matters: the pure tests pin the arithmetic against numbers that can
 * be checked by hand, and the HTTP tests prove the catalogue, the visibility
 * rules and the token all agree with it. A bug in either half shows up in only
 * one of them, which is what makes them worth having separately.
 */

describe('transfer pricing — the pure engine', () => {
    it('measures real Georgian roads within a sensible margin', () => {
        const tbs = { latitude: 41.6692, longitude: 44.9547, kind: 'AIRPORT' };
        const gudauri = { latitude: 42.4781, longitude: 44.4783, kind: 'RESORT' };
        const batumi = { latitude: 41.6168, longitude: 41.6367, kind: 'CITY' };

        // The Georgian Military Highway is about 120 km of road.
        const toGudauri = routeMetrics(tbs, gudauri);
        assert.ok(toGudauri.distanceKm > 100 && toGudauri.distanceKm < 150, `got ${toGudauri.distanceKm} km`);
        assert.equal(toGudauri.touchesAirport, true);

        // Tbilisi to Batumi is about 370 km.
        const toBatumi = routeMetrics(tbs, batumi);
        assert.ok(toBatumi.distanceKm > 320 && toBatumi.distanceKm < 420, `got ${toBatumi.distanceKm} km`);

        // A great-circle distance is always shorter than the road.
        assert.ok(haversineKm(tbs, batumi) < toBatumi.distanceKm);
    });

    it('takes the minimum fare on a short hop and the per-km rate on a long one', () => {
        const vehicle = { perKmCents: 120, minimumFareCents: 6750, airportFeeCents: 1350 };

        const short = legFare({ vehicle, distanceKm: 10, touchesAirport: false, curated: null, tripType: 'ONE_WAY' });
        assert.equal(short.sellCents, 6750, 'a 10 km hop falls back to the minimum');

        const long = legFare({ vehicle, distanceKm: 300, touchesAirport: false, curated: null, tripType: 'ONE_WAY' });
        assert.equal(long.sellCents, 36_000, '300 km at 1.20 GEL/km');

        const fromAirport = legFare({ vehicle, distanceKm: 300, touchesAirport: true, curated: null, tripType: 'ONE_WAY' });
        assert.equal(fromAirport.sellCents, 37_350, 'the airport fee is added on top');
    });

    it('prefers a curated price over the distance estimate', () => {
        const vehicle = { perKmCents: 120, minimumFareCents: 6750, airportFeeCents: 1350 };
        const curated = { oneWayCents: 19_900, returnCents: null, netCents: 15_000 };

        const priced = legFare({ vehicle, distanceKm: 300, touchesAirport: true, curated, tripType: 'ONE_WAY' });

        assert.equal(priced.sellCents, 19_900);
        assert.equal(priced.netCents, 15_000);
        assert.equal(priced.source, 'curated');
    });

    it('reads a discounted return price as half per leg, not as a one-way', () => {
        const vehicle = { perKmCents: 120, minimumFareCents: 1, airportFeeCents: 0 };
        const curated = { oneWayCents: 20_000, returnCents: 36_000, netCents: null };

        const oneWay = legFare({ vehicle, distanceKm: 100, touchesAirport: false, curated, tripType: 'ONE_WAY' });
        const returnLeg = legFare({ vehicle, distanceKm: 100, touchesAirport: false, curated, tripType: 'RETURN' });

        assert.equal(oneWay.sellCents, 20_000);
        assert.equal(returnLeg.sellCents, 18_000, 'both legs of a 36,000 return are 18,000 each');
    });

    it('recognises a night pick-up across the midnight wrap', () => {
        const tz = 'Asia/Tbilisi';
        const day = pickupInstant('2027-02-10', '09:00', tz);
        const lateEvening = pickupInstant('2027-02-10', '23:30', tz);
        const smallHours = pickupInstant('2027-02-10', '04:00', tz);
        const justBefore = pickupInstant('2027-02-10', '21:59', tz);

        assert.equal(isNightPickup(day, tz), false);
        assert.equal(isNightPickup(lateEvening, tz), true);
        assert.equal(isNightPickup(smallHours, tz), true, 'the window wraps midnight');
        assert.equal(isNightPickup(justBefore, tz), false);
    });

    it('charges the night surcharge on the fare, and only at night', () => {
        const vehicle = { kind: 'PRIVATE', perKmCents: 100, minimumFareCents: 1, airportFeeCents: 0, paceFactor: 1, currency: 'GEL' };
        const leg = (isNight) => ({
            direction: 'OUTBOUND',
            fromPointName: 'A',
            toPointName: 'B',
            pickupAt: new Date(),
            distanceKm: 100,
            durationMinutes: 110,
            touchesAirport: false,
            curated: null,
            tripType: 'ONE_WAY',
            isNight
        });

        const day = quoteJourney({ vehicle, legs: [leg(false)], passengers: 2, markupBps: 1500, currency: 'GEL' });
        const night = quoteJourney({ vehicle, legs: [leg(true)], passengers: 2, markupBps: 1500, currency: 'GEL' });

        assert.equal(day.totals.sellCents, 10_000);
        // 20% by default.
        assert.equal(night.totals.sellCents, 12_000);
    });

    it('sells a shared vehicle by the seat and a private one by the car', () => {
        const base = { perKmCents: 100, minimumFareCents: 1, airportFeeCents: 0, paceFactor: 1, currency: 'GEL' };
        const leg = {
            direction: 'OUTBOUND',
            fromPointName: 'A',
            toPointName: 'B',
            pickupAt: new Date(),
            distanceKm: 100,
            durationMinutes: 110,
            touchesAirport: false,
            curated: null,
            tripType: 'ONE_WAY',
            isNight: false
        };

        const priv = quoteJourney({ vehicle: { ...base, kind: 'PRIVATE' }, legs: [leg], passengers: 4, markupBps: 1500, currency: 'GEL' });
        const shared = quoteJourney({ vehicle: { ...base, kind: 'SHARED' }, legs: [leg], passengers: 4, markupBps: 1500, currency: 'GEL' });

        assert.equal(priv.perSeat, false);
        assert.equal(priv.totals.sellCents, 10_000, 'the car costs the same whoever is in it');
        assert.equal(shared.perSeat, true);
        assert.equal(shared.totals.sellCents, 40_000, 'four seats at 10,000 each');
    });

    it('sums the leg lines to the total, so a voucher adds up', () => {
        const vehicle = { kind: 'PRIVATE', perKmCents: 137, minimumFareCents: 1, airportFeeCents: 0, paceFactor: 1, currency: 'GEL' };
        const makeLeg = (direction, isNight) => ({
            direction,
            fromPointName: 'A',
            toPointName: 'B',
            pickupAt: new Date(),
            distanceKm: 173,
            durationMinutes: 200,
            touchesAirport: true,
            curated: null,
            tripType: 'RETURN',
            isNight
        });

        const quote = quoteJourney({
            vehicle,
            legs: [makeLeg('OUTBOUND', false), makeLeg('RETURN', true)],
            passengers: 3,
            markupBps: 1500,
            currency: 'GEL'
        });

        const summed = quote.legs.reduce((total, leg) => total + leg.sellCents, 0);

        assert.equal(quote.legs.length, 2);
        assert.equal(summed, quote.totals.sellCents);
        assert.ok(quote.legs[1].sellCents > quote.legs[0].sellCents, 'the night leg costs more');
    });

    it('slows a heavier vehicle over the same road', () => {
        const sedan = durationFor(200, 1);
        const coach = durationFor(200, 1.5);

        assert.ok(coach > sedan);
        assert.equal(sedan % 5, 0, 'rounded to five minutes, not to a false precision');
    });

    it('treats a blackout window as closed at both ends', () => {
        const window = [{ from: '2027-02-01', to: '2027-02-10' }];

        assert.equal(isBlackedOut('2027-01-31', window), false);
        assert.equal(isBlackedOut('2027-02-01', window), true, 'the first day is shut');
        assert.equal(isBlackedOut('2027-02-10', window), true, 'so is the last');
        assert.equal(isBlackedOut('2027-02-11', window), false);
    });
});

describe('transfer quotes over HTTP', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let from;
    let to;
    let sedan;
    let van;
    let route;

    before(async () => {
        from = tracker.transferPoint(
            await makeTransferPoint({
                slug: unique('tbs'),
                name: 'Test Airport',
                kind: 'AIRPORT',
                latitude: 41.6692,
                longitude: 44.9547
            })
        );
        to = tracker.transferPoint(
            await makeTransferPoint({ slug: unique('resort'), name: 'Test Resort', latitude: 42.4781, longitude: 44.4783 })
        );

        sedan = tracker.transferVehicle(
            await makeTransferVehicle({ slug: unique('sedan'), maxPassengers: 3, maxLuggage: 2 })
        );
        van = tracker.transferVehicle(
            await makeTransferVehicle({
                slug: unique('van'),
                name: 'Test Van',
                vehicleClass: 'VAN',
                body: 'van',
                maxPassengers: 12,
                maxLuggage: 12,
                recommendedRank: 9
            })
        );

        route = tracker.transferRoute(
            await makeTransferRoute({
                slug: unique('route'),
                fromPointId: from.id,
                toPointId: to.id,
                category: 'AIRPORT',
                distanceKm: 128
            })
        );

        await makeTransferPrice(route.id, sedan.id, { oneWayCents: 17_500 });
        await makeTransferPrice(route.id, van.id, { oneWayCents: 31_500 });
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const quote = (params = {}) => {
        const query = new URLSearchParams({
            from: from.slug,
            to: to.slug,
            date: futureDate(),
            time: '09:00',
            adults: '2',
            luggage: '2',
            ...params
        });

        return request(app).get(`/api/transfers/quotes?${query}`);
    };

    it('prices a curated route from its own table', async () => {
        const res = await quote();

        assert.equal(res.status, 200);
        assert.equal(res.body.route.slug, route.slug);

        const offer = res.body.offers.find((entry) => entry.vehicle.slug === sedan.slug);
        assert.equal(offer.quote.totals.sellCents, 17_500);
    });

    it('still quotes a pair with no curated route at all', async () => {
        const orphan = tracker.transferPoint(
            await makeTransferPoint({ slug: unique('orphan'), name: 'Unlisted', latitude: 41.9847, longitude: 44.1086 })
        );

        const res = await quote({ to: orphan.slug });

        assert.equal(res.status, 200);
        assert.equal(res.body.route, null, 'no catalogue route');
        assert.ok(res.body.offers.length > 0, 'and yet it is bookable');
        assert.ok(res.body.offers[0].quote.totals.sellCents > 0);
    });

    it('refuses to show a vehicle the party will not fit in', async () => {
        const res = await quote({ adults: '8', luggage: '8' });

        assert.equal(res.status, 200);

        const slugs = res.body.offers.map((offer) => offer.vehicle.slug);
        assert.ok(!slugs.includes(sedan.slug), 'a three-seat saloon is not an option for eight people');
        assert.ok(slugs.includes(van.slug));
    });

    /**
     * The way back is its own route, and this is where that stops being a
     * design note and becomes a number.
     *
     * Only the outbound direction is priced in the fixture, so the return leg
     * falls through to the distance engine — which is the intended behaviour
     * and not a rounding artefact. Quietly reusing the outbound price would
     * charge a fare nobody set.
     */
    it('prices the return leg on its own, falling back when the reverse is unpriced', async () => {
        const oneWay = await quote();
        const returned = await quote({
            tripType: 'RETURN',
            returnDate: futureDate(32),
            returnTime: '18:00'
        });

        const single = oneWay.body.offers.find((entry) => entry.vehicle.slug === sedan.slug);
        const both = returned.body.offers.find((entry) => entry.vehicle.slug === sedan.slug);

        assert.equal(both.quote.legs.length, 2);
        assert.equal(both.quote.legs[1].direction, 'RETURN');
        assert.equal(both.quote.legs[0].sellCents, single.quote.totals.sellCents, 'outbound is the curated fare');
        assert.notEqual(
            both.quote.legs[1].sellCents,
            both.quote.legs[0].sellCents,
            'the unpriced return is estimated, not copied from the outbound'
        );
        assert.equal(
            both.quote.totals.sellCents,
            both.quote.legs[0].sellCents + both.quote.legs[1].sellCents
        );
    });

    it('doubles exactly when both directions carry the same curated price', async () => {
        const back = tracker.transferRoute(
            await makeTransferRoute({
                slug: unique('route-back'),
                fromPointId: to.id,
                toPointId: from.id,
                category: 'AIRPORT',
                distanceKm: 128
            })
        );

        await makeTransferPrice(back.id, sedan.id, { oneWayCents: 17_500 });

        const returned = await quote({
            tripType: 'RETURN',
            returnDate: futureDate(32),
            returnTime: '18:00'
        });

        const both = returned.body.offers.find((entry) => entry.vehicle.slug === sedan.slug);

        assert.equal(both.quote.totals.sellCents, 35_000);
    });

    it('refuses a return that leaves before it arrives', async () => {
        const res = await quote({
            tripType: 'RETURN',
            returnDate: futureDate(29),
            returnTime: '18:00'
        });

        assert.equal(res.status, 422);
        assert.equal(res.body.error.details.reason, 'RETURN_BEFORE_OUTBOUND');
    });

    it('refuses a pick-up sooner than a car can be sent', async () => {
        const res = await quote({ date: futureDate(0), time: '00:01' });

        assert.equal(res.status, 422);
        assert.equal(res.body.error.details.reason, 'TOO_SOON');
    });

    it('charges an extra, and only where it applies', async () => {
        const withSeat = await quote({ extra: 'childSeat' });
        const plain = await quote();

        const before = plain.body.offers.find((entry) => entry.vehicle.slug === sedan.slug);
        const after = withSeat.body.offers.find((entry) => entry.vehicle.slug === sedan.slug);

        assert.ok(
            after.quote.totals.sellCents > before.quote.totals.sellCents,
            'a child seat costs something'
        );
        assert.equal(after.quote.legs[0].extras[0].code, 'childSeat');
    });

    it('takes a route off the market while the road is closed', async () => {
        const closed = await prisma.transferBlackout.create({
            data: {
                routeId: route.id,
                from: new Date(`${futureDate(25)}T00:00:00.000Z`),
                to: new Date(`${futureDate(35)}T00:00:00.000Z`),
                reason: 'Snow'
            }
        });

        try {
            const res = await quote();

            assert.equal(res.status, 200);
            assert.equal(res.body.closed, true);
            assert.equal(res.body.offers.length, 0);
        } finally {
            await prisma.transferBlackout.delete({ where: { id: closed.id } });
        }
    });

    it('takes one vehicle off the market without closing the route', async () => {
        const grounded = await prisma.transferBlackout.create({
            data: {
                vehicleId: van.id,
                from: new Date(`${futureDate(25)}T00:00:00.000Z`),
                to: new Date(`${futureDate(35)}T00:00:00.000Z`),
                reason: 'Servicing'
            }
        });

        try {
            const res = await quote();
            const slugs = res.body.offers.map((offer) => offer.vehicle.slug);

            assert.ok(slugs.includes(sedan.slug));
            assert.ok(!slugs.includes(van.slug));
        } finally {
            await prisma.transferBlackout.delete({ where: { id: grounded.id } });
        }
    });

    it('never shows a net fare or a margin to the public', async () => {
        const res = await quote();
        const body = JSON.stringify(res.body);

        assert.ok(!body.includes('netCents'), 'net is absent, not null');
        assert.ok(!body.includes('marginCents'));
        assert.ok(!body.includes('markupBps'));
    });

    it('hides a vehicle that has not been opened to the public', async () => {
        const trade = tracker.transferVehicle(
            await makeTransferVehicle({ slug: unique('trade'), name: 'Trade Only', b2cEnabled: false })
        );

        const res = await quote();
        const slugs = res.body.offers.map((offer) => offer.vehicle.slug);

        assert.ok(!slugs.includes(trade.slug));
    });
});
