import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import { isRestDay, restWindowAt, restWindowsBetween, shabbatWindow, sunsetUtc } from '../lib/kosher/shabbat.js';
import { createTracker, databaseAvailable, makeAdmin, makeDestination, signIn } from './support/factories.js';
import { makeKosherProfile, makeSellableHotel, makeTourDeparture, makeTransferLeg } from './support/packages.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

const TBILISI = { lat: 41.7151, lng: 44.8271 };
const SOLAR = { shabbatMode: 'SOLAR', candleLightingOffsetMin: 18, havdalahOffsetMin: 42, extraRestDays: [] };

const minutesApart = (a, b) => Math.abs(a.getTime() - b.getTime()) / 60_000;

describe('shabbat windows (pure)', () => {
    it('computes sunset in Tbilisi within a few minutes of the almanac', () => {
        // Friday 4 June 2027: solar noon in Tbilisi is 13:01 local (UTC+4) and
        // the day is fifteen hours long, so the sun sets about 20:32 local.
        assert.ok(minutesApart(sunsetUtc('2027-06-04', TBILISI), new Date('2027-06-04T16:32:00Z')) < 10);
        // Friday 8 January 2027: about 17:45 local.
        assert.ok(minutesApart(sunsetUtc('2027-01-08', TBILISI), new Date('2027-01-08T13:46:00Z')) < 10);
    });

    it('opens at candle lighting on Friday and closes after havdalah on Saturday', () => {
        const window = shabbatWindow('2027-06-02', 'Asia/Tbilisi', TBILISI, SOLAR);
        // Candle lighting 20:14 Friday, havdalah about 21:15 Saturday, local.
        assert.ok(minutesApart(window.startsAt, new Date('2027-06-04T16:14:00Z')) < 10);
        assert.ok(minutesApart(window.endsAt, new Date('2027-06-05T17:15:00Z')) < 10);

        const windows = restWindowsBetween('2027-06-02', '2027-06-06', 'Asia/Tbilisi', TBILISI, SOLAR);
        assert.equal(windows.length, 1);
        // A Friday 19:00 pick-up is before candle lighting in June; 22:00 is not.
        assert.equal(restWindowAt(new Date('2027-06-04T15:00:00Z'), windows), null);
        assert.ok(restWindowAt(new Date('2027-06-04T18:00:00Z'), windows));
        // Saturday 22:30 local is after havdalah.
        assert.equal(restWindowAt(new Date('2027-06-05T18:30:00Z'), windows), null);
        assert.equal(isRestDay('2027-06-05', windows, SOLAR), true);
        assert.equal(isRestDay('2027-06-04', windows, SOLAR), false);
    });

    it('takes fixed hours and festivals from the profile', () => {
        const fixed = { shabbatMode: 'FIXED_HOURS', shabbatFixedStart: '18:00', shabbatFixedEnd: '20:00', extraRestDays: [{ from: '2027-06-08', to: '2027-06-09', label: 'Shavuot' }] };
        const windows = restWindowsBetween('2027-06-04', '2027-06-10', 'Asia/Tbilisi', null, fixed);
        assert.equal(windows.length, 2);
        assert.equal(windows[0].startsAt.toISOString(), '2027-06-04T14:00:00.000Z');
        assert.equal(windows[1].label, 'Shavuot');
        assert.equal(isRestDay('2027-06-08', windows, fixed), true);
        assert.equal(isRestDay('2027-06-10', windows, fixed), false);
        assert.equal(shabbatWindow('2027-06-04', 'Asia/Tbilisi', TBILISI, { shabbatMode: 'NONE' }), null);
    });
});

/**
 * Kosher packages: eligibility at template save, and the rules a quote
 * applies to real dates — certificates, Shabbat transfers, tours on rest
 * days — with the admin override that turns a blocker into a warning.
 */
describe('kosher packages', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let destination;
    // A Friday in June, so a 21:30 pick-up is inside Shabbat and Saturday is a rest day.
    const START = '2027-06-04';

    before(async () => {
        adminCookie = (await signIn(app, (await makeAdmin(tracker)).email)).cookie;
        destination = await makeDestination(tracker, { latitude: 41.7151, longitude: 44.8271 });
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const createPackage = async (components, overrides = {}) => {
        const response = await request(app)
            .post('/api/admin/packages')
            .set('Cookie', adminCookie)
            .send({
                slug: `kosher-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                name: 'Kosher Shabbat in Tbilisi',
                destinationId: destination.id,
                summary: 'A kosher weekend.',
                image: '/images/packages/kosher.jpg',
                nights: 2,
                b2cEnabled: true,
                components,
                ...overrides
            });
        assert.equal(response.status, 201, JSON.stringify(response.body));
        tracker.package(response.body);

        return response.body;
    };

    const setProfile = (id, profile = {}) =>
        request(app).put(`/api/admin/packages/${id}/kosher`).set('Cookie', adminCookie).send(profile);

    it('refuses a kosher profile whose fixed hotel is not eligible, naming why', async () => {
        const plain = await makeSellableHotel(app, adminCookie, tracker, { destination, checkIn: START, nights: 2 });
        const pkg = await createPackage([{ componentType: 'HOTEL_STAY', label: 'Stay', nights: 2, hotelId: plain.hotel.id }]);

        const none = await setProfile(pkg.id);
        assert.equal(none.status, 422, JSON.stringify(none.body));
        assert.equal(none.body.error.details.reason, 'KOSHER_INELIGIBLE');
        assert.equal(none.body.error.details.blockers[0].code, 'NOT_KOSHER');

        // A kosher-friendly hotel with a restaurant-only certificate: two more reasons.
        await makeKosherProfile(plain.hotel.id, { serviceLevel: 'KOSHER_FRIENDLY', scope: 'RESTAURANT', expiresOn: '2028-01-01' });
        const weak = await setProfile(pkg.id);
        assert.equal(weak.status, 422);
        assert.deepEqual(
            weak.body.error.details.blockers.map((blocker) => blocker.code).sort(),
            ['NOT_CERTIFIED', 'SERVICE_LEVEL']
        );

        // Lower the bar and it saves, with the restaurant certificate noted as insufficient only if required.
        const friendly = await setProfile(pkg.id, { minServiceLevel: 'KOSHER_FRIENDLY', certifiedRequired: false });
        assert.equal(friendly.status, 200, JSON.stringify(friendly.body));
        assert.equal(friendly.body.minServiceLevel, 'KOSHER_FRIENDLY');

        const listed = await request(app).get('/api/admin/packages?kosher=true').set('Cookie', adminCookie);
        assert.ok(listed.body.data.some((row) => row.id === pkg.id));
        const plainOnly = await request(app).get('/api/admin/packages?kosher=false').set('Cookie', adminCookie);
        assert.ok(!plainOnly.body.data.some((row) => row.id === pkg.id));
    });

    it('blocks a Shabbat transfer and a Saturday tour, and freezes warnings about a certificate', async () => {
        const certified = await makeSellableHotel(app, adminCookie, tracker, { destination, checkIn: START, nights: 2 });
        // Expires three weeks after check-out: valid through the stay, worth a warning.
        await makeKosherProfile(certified.hotel.id, { serviceLevel: 'FULL', scope: 'KITCHEN', expiresOn: '2027-06-25' });
        const leg = await makeTransferLeg(tracker, { destination });
        const saturday = await makeTourDeparture(tracker, { destination, date: '2027-06-05' });

        const pkg = await createPackage([
            { componentType: 'HOTEL_STAY', label: 'Stay', nights: 2, hotelId: certified.hotel.id },
            { componentType: 'TRANSFER', label: 'Friday night pick-up', fromPointId: leg.from.id, toPointId: leg.to.id, timeOfDay: '21:30' },
            { componentType: 'TOUR', label: 'Saturday trek', dayOffset: 1, tourId: saturday.tour.id }
        ]);
        const profile = await setProfile(pkg.id, { hotelRequestCodes: ['kosherMealOnRequest'] });
        assert.equal(profile.status, 200, JSON.stringify(profile.body));
        await request(app).post(`/api/admin/packages/${pkg.id}/publish`).set('Cookie', adminCookie);

        const quote = await request(app).get(`/api/packages/${pkg.slug}/quote?startDate=${START}&adults=2`);
        assert.equal(quote.status, 200, JSON.stringify(quote.body));
        assert.equal(quote.body.available, false);
        assert.equal(quote.body.unavailableReason, 'KOSHER_INELIGIBLE');
        assert.deepEqual(
            quote.body.kosher.blockers.map((blocker) => blocker.code).sort(),
            ['TOUR_ON_REST_DAY', 'TRANSFER_IN_SHABBAT']
        );
        assert.ok(quote.body.kosher.warnings.some((warning) => warning.code === 'CERTIFICATE_EXPIRING'));

        // Move the pick-up before candle lighting and let the tour run on Shabbat.
        await request(app)
            .patch(`/api/admin/packages/${pkg.id}`)
            .set('Cookie', adminCookie)
            .send({
                components: [
                    { componentType: 'HOTEL_STAY', label: 'Stay', nights: 2, hotelId: certified.hotel.id },
                    { componentType: 'TRANSFER', label: 'Afternoon pick-up', fromPointId: leg.from.id, toPointId: leg.to.id, timeOfDay: '15:00' },
                    { componentType: 'TOUR', label: 'Saturday trek', dayOffset: 1, tourId: saturday.tour.id }
                ]
            });
        const tourKosher = await request(app).put(`/api/admin/tours/${saturday.tour.id}/kosher`).set('Cookie', adminCookie).send({ operatesOnShabbat: true, kosherMealsAvailable: true });
        assert.equal(tourKosher.status, 200, JSON.stringify(tourKosher.body));

        const sellable = await request(app).get(`/api/packages/${pkg.slug}/quote?startDate=${START}&adults=2`);
        assert.equal(sellable.status, 200, JSON.stringify(sellable.body));
        assert.equal(sellable.body.available, true, JSON.stringify(sellable.body.kosher));
        assert.deepEqual(sellable.body.kosher.blockers, []);
        assert.ok(sellable.body.token);
    });

    it('blocks a certificate that lapses mid-stay unless an admin overrides it, audibly', async () => {
        const lapsing = await makeSellableHotel(app, adminCookie, tracker, { destination, checkIn: START, nights: 2 });
        await makeKosherProfile(lapsing.hotel.id, { serviceLevel: 'FULL', scope: 'PROPERTY', expiresOn: '2027-06-05' });

        const pkg = await createPackage([{ componentType: 'HOTEL_STAY', label: 'Stay', nights: 2, hotelId: lapsing.hotel.id }]);
        assert.equal((await setProfile(pkg.id)).status, 200, 'live today, so the template saves');
        await request(app).post(`/api/admin/packages/${pkg.id}/publish`).set('Cookie', adminCookie);

        const blocked = await request(app).get(`/api/packages/${pkg.slug}/quote?startDate=${START}&adults=2`);
        assert.equal(blocked.body.available, false);
        assert.equal(blocked.body.kosher.blockers[0].code, 'CERTIFICATE_EXPIRES_MID_STAY');

        const overridden = await request(app)
            .put(`/api/admin/packages/${pkg.id}/kosher/override`)
            .set('Cookie', adminCookie)
            .send({ until: '2027-12-31', reason: 'Renewal in hand from the Beit Din' });
        assert.equal(overridden.status, 200, JSON.stringify(overridden.body));
        assert.equal(overridden.body.kosherOverrideUntil, '2027-12-31');

        const allowed = await request(app).get(`/api/packages/${pkg.slug}/quote?startDate=${START}&adults=2`);
        assert.equal(allowed.body.available, true);
        assert.equal(allowed.body.kosher.overridden, true);
        assert.ok(allowed.body.kosher.warnings.some((warning) => warning.code === 'OVERRIDDEN_CERTIFICATE_EXPIRES_MID_STAY'));

        const audit = await prisma.auditLog.findFirst({ where: { entityId: pkg.id, action: 'PACKAGE_KOSHER_OVERRIDDEN' } });
        assert.ok(audit);
    });
});
