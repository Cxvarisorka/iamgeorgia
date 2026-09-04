import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import { dateOnlyToUtc } from '../lib/time.js';
import { sweepExpiredTourHolds } from '../services/tour/availability.service.js';
import { sweepCompletedTourBookings } from '../services/tour/booking.service.js';
import {
    createTracker,
    databaseAvailable,
    makeAdmin,
    makeDestination,
    makePartner,
    makePartnerUser,
    makeTour,
    makeTourOption,
    signIn
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

const DATE = '2027-08-12';

/**
 * The tour catalogue around the booking path: the publish checklist, channel
 * and visibility rules, translations, moved prices, expiring holds, the
 * operator confirming a request, and bookings rolling to COMPLETED.
 */
describe('tour catalogue and lifecycle', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partnerCookie;
    let otherPartnerCookie;
    let destination;

    before(async () => {
        adminCookie = (await signIn(app, (await makeAdmin(tracker)).email)).cookie;
        const partner = await makePartner(tracker);
        partnerCookie = (await signIn(app, (await makePartnerUser(tracker, partner)).email)).cookie;
        const other = await makePartner(tracker);
        otherPartnerCookie = (await signIn(app, (await makePartnerUser(tracker, other)).email)).cookie;
        destination = await makeDestination(tracker);
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const lead = (email) => ({ firstName: 'Nino', lastName: 'Beridze', email });

    const offerFor = async (tour, { adults = 2, cookie } = {}) => {
        const call = request(app).get(`/api/search/tours/${tour.slug}?date=${DATE}&adults=${adults}`);
        const response = await (cookie ? call.set('Cookie', cookie) : call);

        assert.equal(response.status, 200, JSON.stringify(response.body));
        return response.body.options[0]?.dates[0] ?? null;
    };

    it('refuses to publish a tour that is not ready, naming everything missing', async () => {
        const created = await request(app)
            .post('/api/admin/tours')
            .set('Cookie', adminCookie)
            .send({
                slug: `bare-${Date.now().toString(36)}`,
                title: 'Bare Tour',
                location: 'Nowhere',
                destinationId: destination.id,
                category: 'city',
                summary: 'Barely described.',
                durationDays: 1,
                durationLabel: '1 day',
                groupSize: '2',
                difficulty: 'Easy',
                meetingPoint: 'Somewhere'
            });
        assert.equal(created.status, 201, JSON.stringify(created.body));
        tracker.tour(created.body);
        assert.equal(created.body.status, 'DRAFT');

        const codes = created.body.publishChecklist.map((item) => item.code);
        assert.ok(codes.includes('options'));
        assert.ok(codes.includes('seasons'));
        assert.ok(codes.includes('departures'));
        assert.ok(codes.includes('itinerary'));

        const published = await request(app).post(`/api/admin/tours/${created.body.id}/publish`).set('Cookie', adminCookie);
        assert.equal(published.status, 422);
        assert.ok(published.body.error.details.missing.length >= 4);

        // A draft does not exist on the public channel.
        const hidden = await request(app).get(`/api/tours/${created.body.slug}`);
        assert.equal(hidden.status, 404);
    });

    it('serves translations field by field and keeps partner-only options off the public channel', async () => {
        const tour = await makeTour(tracker, { destination });
        await makeTourOption(tour, { date: DATE });
        await makeTourOption(tour, { date: DATE, visibility: 'PARTNER_ONLY', name: 'Trade only' });

        const translated = await request(app)
            .put(`/api/admin/tours/${tour.id}/translations/ka`)
            .set('Cookie', adminCookie)
            .send({ title: 'სატესტო ტური' });
        assert.equal(translated.status, 200, JSON.stringify(translated.body));

        const ka = await request(app).get(`/api/tours/${tour.slug}?locale=ka`);
        assert.equal(ka.status, 200);
        assert.equal(ka.body.title, 'სატესტო ტური');
        // Untranslated prose falls back to English rather than blanking.
        assert.equal(ka.body.summary, 'A day in the mountains.');
        assert.equal(ka.body.options.length, 1, 'anonymous sees the public option only');
        assert.equal(ka.body.options[0].seasons, undefined, 'price sheets are not public');

        const trade = await request(app).get(`/api/tours/${tour.slug}`).set('Cookie', partnerCookie);
        assert.equal(trade.body.options.length, 2, 'a partner sees the trade option too');

        const b2bOnly = await makeTour(tracker, { destination, b2cEnabled: false });
        assert.equal((await request(app).get(`/api/tours/${b2bOnly.slug}`)).status, 404);
        assert.equal((await request(app).get(`/api/tours/${b2bOnly.slug}`).set('Cookie', partnerCookie)).status, 200);
    });

    it('refuses a confirmation whose price moved since the offer was issued', async () => {
        const tour = await makeTour(tracker, { destination });
        const option = await makeTourOption(tour, { date: DATE });
        const offer = await offerFor(tour);
        assert.equal(offer.quote.totals.totalCents, 23_000);

        const season = await prisma.tourSeason.findFirst({ where: { tourOptionId: option.id } });
        const repriced = await request(app)
            .put(`/api/admin/tours/${tour.id}/options/${option.id}/seasons/${season.id}`)
            .set('Cookie', adminCookie)
            .send({
                name: 'Dearer',
                validFrom: '2027-01-01',
                validUntil: '2027-12-31',
                tiers: [{ minPax: 1, adultNetCents: 12_000 }]
            });
        assert.equal(repriced.status, 200, JSON.stringify(repriced.body));

        const confirmed = await request(app)
            .post('/api/tours/bookings')
            .send({ offerToken: offer.token, leadTraveller: lead('moved@example.test') });

        assert.equal(confirmed.status, 409);
        assert.equal(confirmed.body.error.details.reason, 'PRICE_CHANGED');
        assert.equal(confirmed.body.error.details.quotedCents, 23_000);
        assert.equal(confirmed.body.error.details.currentCents, 27_600);

        // The tour's "from" price followed the sheet.
        const summary = await request(app).get(`/api/tours/${tour.slug}`);
        assert.equal(summary.body.priceFrom.amountCents, 13_800);
    });

    it('gives an expired hold back to the pool and refuses to confirm it', async () => {
        const tour = await makeTour(tracker, { destination });
        const option = await makeTourOption(tour, { date: DATE, totalUnits: 2 });
        const offer = await offerFor(tour);

        const hold = await request(app).post('/api/tours/bookings/holds').send({ token: offer.token });
        assert.equal(hold.status, 201);
        assert.equal((await offerFor(tour)).available, false, 'the last two seats are held');

        await prisma.tourHold.update({
            where: { token: hold.body.token },
            data: { expiresAt: new Date(Date.now() - 1000) }
        });

        const swept = await sweepExpiredTourHolds();
        assert.ok(swept.swept >= 1);

        const row = await prisma.tourInventory.findUnique({
            where: { tourOptionId_date: { tourOptionId: option.id, date: dateOnlyToUtc(DATE) } }
        });
        assert.equal(row.heldUnits, 0);

        const confirmed = await request(app)
            .post('/api/tours/bookings')
            .send({ holdToken: hold.body.token, leadTraveller: lead('late@example.test') });
        assert.equal(confirmed.status, 410);
    });

    it('lets the operator confirm a request, scopes registers, and rolls finished tours to COMPLETED', async () => {
        const tour = await makeTour(tracker, { destination });
        await makeTourOption(tour, { date: DATE, confirmationMode: 'ON_REQUEST' });
        const offer = await offerFor(tour, { cookie: partnerCookie });

        const requested = await request(app)
            .post('/api/tours/bookings')
            .set('Cookie', partnerCookie)
            .send({ offerToken: offer.token, leadTraveller: lead('agency@example.test') });
        assert.equal(requested.status, 201, JSON.stringify(requested.body));
        assert.equal(requested.body.status, 'PENDING');
        assert.equal(requested.body.netTotalCents, undefined, 'a partner never sees the net');

        // Registers: the booking partner sees it, another partner does not, admin does.
        const mine = await request(app).get('/api/partner/tours/bookings').set('Cookie', partnerCookie);
        assert.ok(mine.body.data.some((row) => row.reference === requested.body.reference));
        const theirs = await request(app).get('/api/partner/tours/bookings').set('Cookie', otherPartnerCookie);
        assert.ok(!theirs.body.data.some((row) => row.reference === requested.body.reference));
        const admin = await request(app)
            .get(`/api/admin/tours/bookings?status=PENDING&tourId=${tour.id}`)
            .set('Cookie', adminCookie);
        assert.equal(admin.body.data.length, 1);
        assert.equal(admin.body.data[0].marginCents, 22_000 - 20_000, 'partner commission is 10%');

        const confirmed = await request(app)
            .post(`/api/admin/tours/bookings/${requested.body.reference}/confirm`)
            .set('Cookie', adminCookie);
        assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
        assert.equal(confirmed.body.status, 'CONFIRMED');
        assert.ok(confirmed.body.confirmedAt);

        // Confirming twice is a conflict, not a second confirmation.
        const again = await request(app)
            .post(`/api/admin/tours/bookings/${requested.body.reference}/confirm`)
            .set('Cookie', adminCookie);
        assert.equal(again.status, 409);

        // Once the last day is behind us, the sweeper closes it.
        await prisma.tourBooking.update({
            where: { reference: requested.body.reference },
            data: { date: new Date('2020-01-01T00:00:00.000Z'), endDate: new Date('2020-01-01T00:00:00.000Z') }
        });
        const swept = await sweepCompletedTourBookings();
        assert.ok(swept.completed >= 1);

        const closed = await prisma.tourBooking.findUnique({ where: { reference: requested.body.reference } });
        assert.equal(closed.status, 'COMPLETED');
        assert.ok(closed.completedAt);
    });
});
