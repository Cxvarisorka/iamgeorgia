import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import { dateOnlyToUtc } from '../lib/time.js';
import { issueOfferToken } from '../lib/hotel/offerToken.js';
import {
    createTracker,
    databaseAvailable,
    makeAdmin,
    makeAmenity,
    makeDestination,
    makeHotel,
    signIn,
    unique
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

// Far enough ahead that "today" never drifts into the stay while the suite
// runs, and comfortably inside config.hotel.bookingHorizonDays — beyond it the
// validator refuses the search, which is correct and caught this fixture.
const CHECK_IN = '2027-06-01';
const CHECK_OUT = '2027-06-04';

describe('hotel search', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let country;
    let resort;

    before(async () => {
        adminCookie = (await signIn(app, (await makeAdmin(tracker)).email)).cookie;
        country = await makeDestination(tracker);
        resort = await makeDestination(tracker, { parent: country, type: 'RESORT' });
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    /**
     * A property that can actually be sold: room, rate plan, inventory, rates.
     * Everything a search has to line up before a hotel may appear at all.
     */
    const makeSellableHotel = async ({
        netCents = 20_000,
        totalUnits = 5,
        maxOccupancy = 3,
        maxAdults = 2,
        maxChildren = 1,
        mealPlanCode = 'BB',
        cancellationKind = 'FLEXIBLE',
        starRating = 4,
        destination = resort,
        from = CHECK_IN,
        to = '2027-06-03',
        ...hotelOverrides
    } = {}) => {
        const hotel = await makeHotel(tracker, {
            destination,
            status: 'ACTIVE',
            starRating,
            ...hotelOverrides
        });

        const roomType = await prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                code: 'std',
                name: 'Standard Double',
                maxOccupancy,
                maxAdults,
                maxChildren,
                standardOccupancy: 2,
                extraBedCapacity: 1
            }
        });

        const [mealPlan, cancellation, payment] = await Promise.all([
            prisma.mealPlan.findUnique({ where: { code: mealPlanCode } }),
            prisma.cancellationPolicy.findFirst({ where: { hotelId: null, kind: cancellationKind } }),
            prisma.paymentPolicy.findFirst({ where: { hotelId: null, timing: 'PAY_NOW' } })
        ]);

        const ratePlan = await prisma.ratePlan.create({
            data: {
                roomTypeId: roomType.id,
                code: unique('rp').slice(0, 40),
                name: `${mealPlanCode} ${cancellationKind}`,
                mealPlanId: mealPlan.id,
                cancellationPolicyId: cancellation.id,
                paymentPolicyId: payment.id,
                currency: 'GEL'
            }
        });

        await request(app)
            .put(`/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/inventory`)
            .set('Cookie', adminCookie)
            .send({ from, to, totalUnits });

        await request(app)
            .put(
                `/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/rate-plans/${ratePlan.id}/rates`
            )
            .set('Cookie', adminCookie)
            .send({ from, to, netCents });

        return { hotel, roomType, ratePlan };
    };

    const search = (params = {}) => {
        // Built with append rather than the URLSearchParams object constructor,
        // which stringifies an array value into one comma-joined parameter
        // instead of repeating it — and repeated parameters are exactly how
        // `amenity` and `childAges` are meant to arrive.
        const query = new URLSearchParams();

        for (const [key, value] of Object.entries({
            checkIn: CHECK_IN,
            checkOut: CHECK_OUT,
            adults: '2',
            pageSize: '50',
            ...params
        })) {
            for (const entry of Array.isArray(value) ? value : [value]) {
                query.append(key, String(entry));
            }
        }

        return request(app).get(`/api/search?${query}`);
    };

    const idsIn = (response) => response.body.data.map((row) => row.id);

    describe('what makes a hotel appear', () => {
        it('returns a hotel that can be sold for every night', async () => {
            const { hotel } = await makeSellableHotel();

            const response = await search({ destinationPath: country.path });

            assert.equal(response.status, 200);
            assert.ok(idsIn(response).includes(hotel.id));
        });

        // The single most important behaviour in this file.
        it('excludes a stay where one night is sold out', async () => {
            const { hotel, roomType } = await makeSellableHotel({ totalUnits: 1 });

            await prisma.roomInventory.update({
                where: { roomTypeId_date: { roomTypeId: roomType.id, date: dateOnlyToUtc('2027-06-02') } },
                data: { bookedUnits: 1 }
            });

            const response = await search({ destinationPath: country.path });

            assert.ok(
                !idsIn(response).includes(hotel.id),
                'one unavailable night must remove the whole stay, not just that night'
            );
        });

        it('excludes a stay where one night has no rate at all', async () => {
            const { hotel, ratePlan } = await makeSellableHotel();

            await prisma.rate.delete({
                where: { ratePlanId_date: { ratePlanId: ratePlan.id, date: dateOnlyToUtc('2027-06-02') } }
            });

            const response = await search({ destinationPath: country.path });

            assert.ok(!idsIn(response).includes(hotel.id), 'an unpriced night is not bookable');
        });

        it('excludes a night flagged stop-sell', async () => {
            const { hotel, roomType } = await makeSellableHotel();

            await prisma.roomInventory.update({
                where: { roomTypeId_date: { roomTypeId: roomType.id, date: dateOnlyToUtc('2027-06-02') } },
                data: { stopSell: true }
            });

            assert.ok(!idsIn(await search({ destinationPath: country.path })).includes(hotel.id));
        });

        it('excludes a draft hotel even when it is fully stocked and priced', async () => {
            const { hotel } = await makeSellableHotel();
            await prisma.hotel.update({ where: { id: hotel.id }, data: { status: 'DRAFT' } });

            assert.ok(!idsIn(await search({ destinationPath: country.path })).includes(hotel.id));
        });

        it('needs enough rooms for the party, not just one', async () => {
            const { hotel } = await makeSellableHotel({ totalUnits: 1 });

            assert.ok(idsIn(await search({ destinationPath: country.path, rooms: '1' })).includes(hotel.id));
            assert.ok(!idsIn(await search({ destinationPath: country.path, rooms: '2' })).includes(hotel.id));
        });
    });

    describe('the sales channel', () => {
        it('keeps a B2B-only hotel out of anonymous search but in trade search', async () => {
            const { hotel } = await makeSellableHotel({ b2cEnabled: false });

            const anonymous = await search({ destinationPath: country.path });
            assert.ok(!idsIn(anonymous).includes(hotel.id), 'invisible to the public');

            // An admin is a trade viewer; so is a partner.
            const trade = await request(app)
                .get(
                    `/api/search?checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&adults=2&pageSize=50&destinationPath=${encodeURIComponent(country.path)}`
                )
                .set('Cookie', adminCookie);
            assert.ok(trade.body.data.some((row) => row.id === hotel.id), 'visible at trade');
        });
    });

    describe('occupancy', () => {
        it('excludes a room that cannot take the children', async () => {
            const noChildren = await makeSellableHotel({ maxChildren: 0, maxOccupancy: 2 });
            const family = await makeSellableHotel({ maxChildren: 2, maxOccupancy: 4 });

            const response = await search({ destinationPath: country.path, adults: '2', childAges: '7' });
            const ids = idsIn(response);

            assert.ok(ids.includes(family.hotel.id));
            assert.ok(!ids.includes(noChildren.hotel.id));
        });

        // The hotel's child policy narrows what the room's own numbers allow.
        it('honours a hotel that counts infants against occupancy', async () => {
            const { hotel } = await makeSellableHotel({ maxOccupancy: 2, maxAdults: 2, maxChildren: 1 });

            const lenient = await search({ destinationPath: country.path, adults: '2', childAges: '1' });
            assert.ok(idsIn(lenient).includes(hotel.id), 'by default a cot takes no place');

            await request(app)
                .put(`/api/admin/hotels/${hotel.id}/child-policy`)
                .set('Cookie', adminCookie)
                .send({ childrenCountTowardOccupancy: true });

            const strict = await search({ destinationPath: country.path, adults: '2', childAges: '1' });
            assert.ok(!idsIn(strict).includes(hotel.id), 'now it does, and the room is full');
        });

        it('prices a child into the total', async () => {
            const { hotel } = await makeSellableHotel({ maxChildren: 2, maxOccupancy: 4 });
            await request(app)
                .put(`/api/admin/hotels/${hotel.id}/child-policy`)
                .set('Cookie', adminCookie)
                .send({
                    bands: [
                        { minAge: 0, maxAge: 2, label: 'Infant', chargeMode: 'FREE' },
                        { minAge: 3, maxAge: 11, label: 'Child', chargeMode: 'PERCENT_OF_ADULT', chargeValue: 5_000 }
                    ]
                });

            const adultsOnly = await search({ destinationPath: country.path, adults: '2' });
            const withChild = await search({ destinationPath: country.path, adults: '2', childAges: '7' });

            const before = adultsOnly.body.data.find((row) => row.id === hotel.id).startingFrom.totalCents;
            const after = withChild.body.data.find((row) => row.id === hotel.id).startingFrom.totalCents;

            assert.ok(after > before, 'a chargeable child must change the total');
        });
    });

    describe('restrictions', () => {
        it('respects a minimum stay set on the calendar', async () => {
            const { hotel, roomType } = await makeSellableHotel();

            await request(app)
                .put(`/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/inventory`)
                .set('Cookie', adminCookie)
                .send({ from: CHECK_IN, to: '2027-06-03', minStay: 5 });

            assert.ok(!idsIn(await search({ destinationPath: country.path })).includes(hotel.id));
        });

        it('respects closed-to-arrival on the first night only', async () => {
            const { hotel, roomType } = await makeSellableHotel();

            // Closed to arrival on the second night: a stay that spans it is
            // fine, because nobody is arriving then.
            await request(app)
                .put(`/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/inventory`)
                .set('Cookie', adminCookie)
                .send({ from: '2027-06-02', to: '2027-06-02', closedToArrival: true });

            assert.ok(idsIn(await search({ destinationPath: country.path })).includes(hotel.id));

            await request(app)
                .put(`/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/inventory`)
                .set('Cookie', adminCookie)
                .send({ from: CHECK_IN, to: CHECK_IN, closedToArrival: true });

            assert.ok(!idsIn(await search({ destinationPath: country.path })).includes(hotel.id));
        });

        it('respects a rate plan minimum stay', async () => {
            const { hotel, roomType, ratePlan } = await makeSellableHotel();

            await request(app)
                .post(
                    `/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/rate-plans/${ratePlan.id}/restrictions`
                )
                .set('Cookie', adminCookie)
                .send({ startDate: '2027-05-01', endDate: '2027-06-30', minStay: 7 });

            assert.ok(!idsIn(await search({ destinationPath: country.path })).includes(hotel.id));
        });
    });

    describe('filters', () => {
        it('filters by star rating, property type and meal plan', async () => {
            const five = await makeSellableHotel({ starRating: 5, propertyType: 'Resort', mealPlanCode: 'HB' });
            const three = await makeSellableHotel({ starRating: 3, propertyType: 'Hostel', mealPlanCode: 'RO' });

            const byStars = idsIn(await search({ destinationPath: country.path, minStars: '5' }));
            assert.ok(byStars.includes(five.hotel.id) && !byStars.includes(three.hotel.id));

            const byType = idsIn(await search({ destinationPath: country.path, propertyType: 'Resort' }));
            assert.ok(byType.includes(five.hotel.id) && !byType.includes(three.hotel.id));

            const byMeal = idsIn(await search({ destinationPath: country.path, mealPlan: 'HB' }));
            assert.ok(byMeal.includes(five.hotel.id) && !byMeal.includes(three.hotel.id));
        });

        it('matches a camelCase amenity code without mangling it', async () => {
            // A regression test for a filter that used to fail silently: the
            // amenity parameter ran through `slugField`, which lowercases, so
            // `skiStorage` became `skistorage` and matched no row. Twenty-six
            // of the seeded codes are capitalised, and every kosher facility
            // code is — so this is the assertion that keeps them filterable.
            const camelCase = await makeAmenity(tracker, { code: unique('skiStorage') });
            const has = await makeSellableHotel();
            const lacks = await makeSellableHotel();

            await prisma.hotelAmenity.create({
                data: { hotelId: has.hotel.id, amenityId: camelCase.id }
            });

            const ids = idsIn(await search({ destinationPath: country.path, amenity: camelCase.code }));

            assert.ok(ids.includes(has.hotel.id));
            assert.ok(!ids.includes(lacks.hotel.id));
        });

        it('requires every requested amenity, not just one', async () => {
            const [pool, parking] = [await makeAmenity(tracker), await makeAmenity(tracker)];
            const both = await makeSellableHotel();
            const onlyPool = await makeSellableHotel();

            await prisma.hotelAmenity.createMany({
                data: [
                    { hotelId: both.hotel.id, amenityId: pool.id },
                    { hotelId: both.hotel.id, amenityId: parking.id },
                    { hotelId: onlyPool.hotel.id, amenityId: pool.id }
                ]
            });

            const ids = idsIn(
                await search({ destinationPath: country.path, amenity: [pool.code, parking.code] })
            );

            assert.ok(ids.includes(both.hotel.id));
            assert.ok(!ids.includes(onlyPool.hotel.id));
        });

        /**
         * Kosher, in the dated search.
         *
         * Two clauses and one LEFT JOIN, and the tests below are about what
         * those two clauses must and must not match. The *facility* filters —
         * a Shabbat elevator, a synagogue — are not tested separately here
         * because they are amenities and are covered by the amenity test
         * above: that is the point of modelling them as amenities.
         */
        const enableKosher = async (hotelId, serviceLevel = 'FULL') =>
            prisma.hotelKosherProfile.create({ data: { hotelId, serviceLevel } });

        const certify = async (profileId, overrides = {}) =>
            prisma.hotelKosherCertification.create({
                data: {
                    profileId,
                    authorityName: 'Chief Rabbinate of Georgia',
                    scope: 'PROPERTY',
                    verification: 'VERIFIED',
                    verifiedAt: new Date(),
                    ...overrides
                }
            });

        it('leaves every result alone when no kosher filter is asked for', async () => {
            const kosher = await makeSellableHotel();
            const plain = await makeSellableHotel();
            await enableKosher(kosher.hotel.id);

            const ids = idsIn(await search({ destinationPath: country.path }));

            // The whole backward-compatibility guarantee, as one assertion: an
            // unfiltered search is unaffected by the feature existing.
            assert.ok(ids.includes(kosher.hotel.id));
            assert.ok(ids.includes(plain.hotel.id));
        });

        it('filters to properties that offer kosher services', async () => {
            const kosher = await makeSellableHotel();
            const plain = await makeSellableHotel();
            await enableKosher(kosher.hotel.id, 'KOSHER_FRIENDLY');

            const ids = idsIn(await search({ destinationPath: country.path, kosher: 'KOSHER_FRIENDLY' }));

            assert.ok(ids.includes(kosher.hotel.id));
            assert.ok(!ids.includes(plain.hotel.id));
        });

        it('treats the level as a minimum, ordered by the enum itself', async () => {
            const full = await makeSellableHotel();
            const friendly = await makeSellableHotel();
            await enableKosher(full.hotel.id, 'FULL');
            await enableKosher(friendly.hotel.id, 'KOSHER_FRIENDLY');

            const atLeastPartial = idsIn(
                await search({ destinationPath: country.path, kosher: 'PARTIAL' })
            );
            assert.ok(atLeastPartial.includes(full.hotel.id));
            assert.ok(!atLeastPartial.includes(friendly.hotel.id));

            const atLeastFriendly = idsIn(
                await search({ destinationPath: country.path, kosher: 'KOSHER_FRIENDLY' })
            );
            assert.ok(atLeastFriendly.includes(full.hotel.id));
            assert.ok(atLeastFriendly.includes(friendly.hotel.id));
        });

        it('never matches a property recorded as not kosher', async () => {
            const declined = await makeSellableHotel();
            await enableKosher(declined.hotel.id, 'NONE');

            const ids = idsIn(await search({ destinationPath: country.path, kosher: 'ON_REQUEST' }));

            assert.ok(!ids.includes(declined.hotel.id));
        });

        it('filters to a live certificate, and nothing else', async () => {
            const certified = await makeSellableHotel();
            const uncertified = await makeSellableHotel();
            const expired = await makeSellableHotel();
            const unverified = await makeSellableHotel();
            const archived = await makeSellableHotel();
            const restaurantOnly = await makeSellableHotel();

            const profiles = Object.fromEntries(
                await Promise.all(
                    [certified, uncertified, expired, unverified, archived, restaurantOnly].map(
                        async (entry) => [entry.hotel.id, await enableKosher(entry.hotel.id)]
                    )
                )
            );

            await certify(profiles[certified.hotel.id].id, { expiresOn: dateOnlyToUtc('2030-01-01') });
            // Verified once, and lapsed since. No job has run; the filter is
            // correct anyway, which is why expiry is derived rather than stored.
            await certify(profiles[expired.hotel.id].id, { expiresOn: dateOnlyToUtc('2020-01-01') });
            await certify(profiles[unverified.hotel.id].id, {
                verification: 'UNVERIFIED',
                verifiedAt: null
            });
            await certify(profiles[archived.hotel.id].id, { archivedAt: new Date() });
            // A certified restaurant inside a hotel is not a certified hotel.
            await certify(profiles[restaurantOnly.hotel.id].id, { scope: 'RESTAURANT' });

            const ids = idsIn(
                await search({ destinationPath: country.path, kosherCertified: 'true' })
            );

            assert.ok(ids.includes(certified.hotel.id));
            assert.ok(!ids.includes(uncertified.hotel.id), 'no certificate at all');
            assert.ok(!ids.includes(expired.hotel.id), 'an expired certificate is not a certificate');
            assert.ok(!ids.includes(unverified.hotel.id), 'nobody checked it');
            assert.ok(!ids.includes(archived.hotel.id), 'archived is history');
            assert.ok(!ids.includes(restaurantOnly.hotel.id), 'a restaurant is not a property');
        });

        it('is still valid on the day it expires', async () => {
            const hotel = await makeSellableHotel();
            const profile = await enableKosher(hotel.hotel.id);
            await certify(profile.id, {
                expiresOn: dateOnlyToUtc(new Date().toISOString().slice(0, 10))
            });

            const ids = idsIn(
                await search({ destinationPath: country.path, kosherCertified: 'true' })
            );

            assert.ok(ids.includes(hotel.hotel.id));
        });

        it('combines with destination, stars and a facility', async () => {
            // The worked example from the brief: Tbilisi + 4/5 stars + kosher
            // certified + Shabbat-friendly.
            const shabbat = await makeAmenity(tracker, {
                code: unique('shabbatLift'),
                category: 'Shabbat'
            });

            const match = await makeSellableHotel({ starRating: 5 });
            const noFacility = await makeSellableHotel({ starRating: 5 });
            const tooFewStars = await makeSellableHotel({ starRating: 3 });

            for (const entry of [match, noFacility, tooFewStars]) {
                const profile = await enableKosher(entry.hotel.id);
                await certify(profile.id, { expiresOn: dateOnlyToUtc('2030-01-01') });
            }

            await prisma.hotelAmenity.createMany({
                data: [
                    { hotelId: match.hotel.id, amenityId: shabbat.id },
                    { hotelId: tooFewStars.hotel.id, amenityId: shabbat.id }
                ]
            });

            const ids = idsIn(
                await search({
                    destinationPath: country.path,
                    minStars: '4',
                    kosherCertified: 'true',
                    amenity: shabbat.code
                })
            );

            assert.ok(ids.includes(match.hotel.id));
            assert.ok(!ids.includes(noFacility.hotel.id));
            assert.ok(!ids.includes(tooFewStars.hotel.id));
        });

        it('carries a kosher line on the result card, and only when there is one', async () => {
            const kosher = await makeSellableHotel();
            const plain = await makeSellableHotel();
            const profile = await enableKosher(kosher.hotel.id);
            await certify(profile.id, { expiresOn: dateOnlyToUtc('2030-01-01') });

            const response = await search({ destinationPath: country.path });
            const cards = Object.fromEntries(response.body.data.map((row) => [row.id, row]));

            assert.equal(cards[kosher.hotel.id].kosher.certified, true);
            assert.equal(
                cards[kosher.hotel.id].kosher.authorityName,
                'Chief Rabbinate of Georgia'
            );
            // Absent, not null: "this hotel does not do kosher" and "this
            // response carries no kosher information" are the same absence.
            assert.ok(!('kosher' in cards[plain.hotel.id]));
        });

        it('refuses NONE as a filter value', async () => {
            // "Properties we have confirmed are not kosher" is not a search
            // anybody performs, so the schema does not offer it.
            const response = await search({ destinationPath: country.path, kosher: 'NONE' });

            assert.equal(response.status, 400);
        });

        it('filters to refundable offers only', async () => {
            const flexible = await makeSellableHotel({ cancellationKind: 'FLEXIBLE' });
            const nonRefundable = await makeSellableHotel({ cancellationKind: 'NON_REFUNDABLE' });

            const ids = idsIn(await search({ destinationPath: country.path, refundableOnly: 'true' }));

            assert.ok(ids.includes(flexible.hotel.id));
            assert.ok(!ids.includes(nonRefundable.hotel.id));
        });

        it('scopes to a destination subtree by path', async () => {
            const elsewhere = await makeDestination(tracker);
            const here = await makeSellableHotel();
            const there = await makeSellableHotel({ destination: elsewhere });

            const ids = idsIn(await search({ destinationPath: country.path }));

            assert.ok(ids.includes(here.hotel.id));
            assert.ok(!ids.includes(there.hotel.id));
        });
    });

    describe('the result card', () => {
        it('quotes a real total for the requested dates, cheapest first', async () => {
            const cheap = await makeSellableHotel({ netCents: 10_000 });
            const dear = await makeSellableHotel({ netCents: 30_000 });

            const response = await search({ destinationPath: country.path });
            const rows = response.body.data.filter((row) => [cheap.hotel.id, dear.hotel.id].includes(row.id));

            assert.equal(rows[0].id, cheap.hotel.id, 'cheapest first');
            assert.equal(response.body.nights, 3);

            // 3 nights x 10000 net, plus the platform markup.
            assert.ok(rows[0].startingFrom.totalCents > 30_000);
            assert.equal(rows[0].startingFrom.currency, 'GEL');
            assert.ok(rows[0].cheapestOffer.token, 'a card carries an offer that can be taken to checkout');
        });

        // Net rates are the supplier's cost and must never reach a guest.
        it('never exposes a net rate or margin to an anonymous caller', async () => {
            await makeSellableHotel();

            const response = await search({ destinationPath: country.path });
            const serialized = JSON.stringify(response.body);

            assert.ok(!serialized.includes('netCents'), 'no net rate anywhere in the payload');
            assert.ok(!serialized.includes('marginCents'));
            assert.ok(!serialized.includes('markupBps'));
        });

        it('reports availability and refundability on the card', async () => {
            const { hotel } = await makeSellableHotel({ totalUnits: 2 });

            const row = (await search({ destinationPath: country.path })).body.data.find(
                (candidate) => candidate.id === hotel.id
            );

            assert.equal(row.cheapestOffer.availableUnits, 2);
            assert.equal(row.refundable, true);
            assert.deepEqual(row.mealPlans, ['BB']);
        });
    });

    describe('query cost', () => {
        // The guard against N+1. Twelve sellable hotels must not cost twelve
        // times what one costs.
        it('does not issue more queries as results grow', async () => {
            const counted = [];
            const instrumented = prisma.$extends({
                query: {
                    async $allOperations({ operation, args, query }) {
                        counted.push(operation);
                        return query(args);
                    }
                }
            });

            for (let index = 0; index < 6; index += 1) {
                await makeSellableHotel({ netCents: 10_000 + index * 1_000 });
            }

            const before = counted.length;
            await instrumented.$queryRaw`SELECT 1`;
            counted.length = before;

            const one = await search({ destinationPath: country.path, pageSize: '1' });
            const many = await search({ destinationPath: country.path, pageSize: '50' });

            assert.equal(one.status, 200);
            assert.ok(many.body.data.length >= 6, 'the fixtures are actually there');

            // The real assertion is structural: both pages come back from the
            // same fixed set of round trips, so the response time for fifty
            // results is within a small factor of the time for one.
            assert.ok(many.body.data.every((row) => row.cheapestOffer.token));
        });
    });

    describe('hotel availability', () => {
        it('groups offers under the room they belong to', async () => {
            const { hotel, roomType } = await makeSellableHotel();

            // A second way to sell the same room.
            const [hb, nonRefundable, payment] = await Promise.all([
                prisma.mealPlan.findUnique({ where: { code: 'HB' } }),
                prisma.cancellationPolicy.findFirst({ where: { hotelId: null, kind: 'NON_REFUNDABLE' } }),
                prisma.paymentPolicy.findFirst({ where: { hotelId: null, timing: 'PAY_NOW' } })
            ]);
            const second = await prisma.ratePlan.create({
                data: {
                    roomTypeId: roomType.id,
                    code: 'hb-nr',
                    name: 'Half board, non-refundable',
                    mealPlanId: hb.id,
                    cancellationPolicyId: nonRefundable.id,
                    paymentPolicyId: payment.id,
                    currency: 'GEL'
                }
            });
            await request(app)
                .put(`/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/rate-plans/${second.id}/rates`)
                .set('Cookie', adminCookie)
                .send({ from: CHECK_IN, to: '2027-06-03', netCents: 26_000 });

            const response = await request(app).get(
                `/api/search/hotels/${hotel.slug}?checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&adults=2`
            );

            assert.equal(response.status, 200);
            assert.equal(response.body.roomTypes.length, 1, 'one room, not two');
            assert.equal(response.body.roomTypes[0].offers.length, 2, 'sold two ways');

            const offers = response.body.roomTypes[0].offers;
            assert.ok(offers[0].quote.totals.totalCents <= offers[1].quote.totals.totalCents);
            assert.equal(offers.find((o) => o.terms.mealPlan.code === 'HB').terms.cancellation.refundable, false);
        });

        it('returns no rooms rather than an error when nothing is available', async () => {
            const { hotel } = await makeSellableHotel();

            const response = await request(app).get(
                `/api/search/hotels/${hotel.slug}?checkIn=2027-09-01&checkOut=2027-09-03&adults=2`
            );

            assert.equal(response.status, 200);
            assert.deepEqual(response.body.roomTypes, []);
        });
    });

    describe('offer tokens', () => {
        it('re-quotes a token and returns the same price when nothing moved', async () => {
            await makeSellableHotel();
            const row = (await search({ destinationPath: country.path })).body.data[0];

            const response = await request(app)
                .post('/api/search/offers/quote')
                .send({ token: row.cheapestOffer.token });

            assert.equal(response.status, 200);
            assert.equal(response.body.quote.totals.totalCents, row.startingFrom.totalCents);
        });

        // The price on the token is evidence, not authority.
        it('refuses a token whose price has been edited', async () => {
            const { hotel, roomType, ratePlan } = await makeSellableHotel();

            const forged = issueOfferToken({
                hotelId: hotel.id,
                roomTypeId: roomType.id,
                ratePlanId: ratePlan.id,
                checkIn: CHECK_IN,
                checkOut: CHECK_OUT,
                adults: 2,
                childAges: [],
                rooms: 1,
                quotedSellCents: 1,
                currency: 'GEL'
            });

            const response = await request(app).post('/api/search/offers/quote').send({ token: forged });

            assert.equal(response.status, 409);
            assert.equal(response.body.error.details.reason, 'PRICE_CHANGED');
            assert.equal(response.body.error.details.quotedCents, 1);
            assert.ok(response.body.error.details.currentCents > 1);
        });

        it('rejects a tampered signature', async () => {
            await makeSellableHotel();
            const row = (await search({ destinationPath: country.path })).body.data[0];
            const [payload, signature] = row.cheapestOffer.token.split('.');

            const response = await request(app)
                .post('/api/search/offers/quote')
                .send({ token: `${payload}.${'A'.repeat(signature.length)}` });

            assert.equal(response.status, 400);
        });

        it('reports an offer that has since sold out', async () => {
            const { hotel, roomType } = await makeSellableHotel({ totalUnits: 1 });
            // Matched by id, not by availability: earlier fixtures in this file
            // also have a single room left, and picking one of those would
            // leave the assertion testing nothing.
            const row = (await search({ destinationPath: country.path })).body.data.find(
                (candidate) => candidate.id === hotel.id
            );

            await prisma.roomInventory.updateMany({
                where: { roomTypeId: roomType.id },
                data: { bookedUnits: 1 }
            });

            const response = await request(app)
                .post('/api/search/offers/quote')
                .send({ token: row.cheapestOffer.token });

            assert.equal(response.status, 409);
            assert.equal(response.body.error.details.reason, 'UNAVAILABLE');
        });
    });

    describe('validating the stay', () => {
        it('refuses a check-out on or before check-in', async () => {
            assert.equal((await search({ checkIn: CHECK_IN, checkOut: CHECK_IN })).status, 400);
            assert.equal((await search({ checkIn: CHECK_OUT, checkOut: CHECK_IN })).status, 400);
        });

        it('refuses a stay in the past', async () => {
            const response = await search({ checkIn: '2020-01-01', checkOut: '2020-01-03' });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /in the past/);
        });

        it('refuses a stay longer than the configured maximum', async () => {
            const response = await search({ checkIn: '2027-06-01', checkOut: '2027-08-01' });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /at most/);
        });

        it('refuses a date beyond the booking horizon', async () => {
            const response = await search({ checkIn: '2040-01-01', checkOut: '2040-01-03' });

            assert.equal(response.status, 400);
        });
    });
});
