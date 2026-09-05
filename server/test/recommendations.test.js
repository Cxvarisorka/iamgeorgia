import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { disconnect } from '../db/index.js';
import { createTracker, databaseAvailable, makeAdmin, makeDestination, makePartner, makePartnerUser, signIn } from './support/factories.js';
import { makeSellableHotel, makeService, makeTourDeparture, makeTransferLeg } from './support/packages.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

const CHECK_IN = '2027-01-08';
const CHECK_OUT = '2027-01-10';
const TOUR_DATE = '2027-01-09';

/**
 * "Complete your trip": the rail on a hotel or tour page.
 *
 * Everything on it is produced by the real engines for the stay's own dates,
 * so a card is either bookable through its own product or absent.
 */
describe('recommendations', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partnerCookie;
    let destination;
    let hotel;
    let tour;
    let pkg;

    before(async () => {
        adminCookie = (await signIn(app, (await makeAdmin(tracker)).email)).cookie;
        partnerCookie = (await signIn(app, (await makePartnerUser(tracker, await makePartner(tracker))).email)).cookie;
        destination = await makeDestination(tracker);
        const leg = await makeTransferLeg(tracker, { destination });
        const service = await makeService(tracker, { destination });
        hotel = await makeSellableHotel(app, adminCookie, tracker, { destination, checkIn: CHECK_IN, nights: 3 });
        tour = await makeTourDeparture(tracker, { destination, date: TOUR_DATE });

        const created = await request(app)
            .post('/api/admin/packages')
            .set('Cookie', adminCookie)
            .send({
                slug: `reco-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                name: 'Weekend in the mountains',
                destinationId: destination.id,
                summary: 'Two nights, a trek and a transfer.',
                image: '/images/packages/test.jpg',
                nights: 2,
                b2cEnabled: true,
                components: [
                    { componentType: 'HOTEL_STAY', label: 'Two nights', nights: 2, hotelId: hotel.hotel.id },
                    { componentType: 'TRANSFER', label: 'Airport pick-up', fromPointId: leg.from.id, toPointId: leg.to.id, timeOfDay: '11:00' },
                    { componentType: 'TOUR', label: 'The trek', dayOffset: 1, tourId: tour.tour.id },
                    { componentType: 'SERVICE', label: 'Kosher dinner', required: false, serviceId: service.id, quantityRule: 'PER_PERSON' }
                ]
            });
        assert.equal(created.status, 201, JSON.stringify(created.body));
        tracker.package(created.body);
        const published = await request(app).post(`/api/admin/packages/${created.body.id}/publish`).set('Cookie', adminCookie);
        assert.equal(published.status, 200, JSON.stringify(published.body));
        pkg = created.body;
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    it('completes a hotel stay with tours on its dates and packages that contain it', async () => {
        const response = await request(app)
            .get(`/api/recommendations?hotel=${hotel.hotel.slug}&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&adults=2`)
            .set('Cookie', partnerCookie);
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(response.body.anchor, { type: 'HOTEL', id: hotel.hotel.id, slug: hotel.hotel.slug, name: hotel.hotel.name });
        assert.deepEqual(response.body.stay, { checkIn: CHECK_IN, checkOut: CHECK_OUT, adults: 2, childAges: [] });

        const trek = response.body.tours.find((row) => row.id === tour.tour.id);
        assert.ok(trek, 'the tour departing during the stay is offered');
        assert.equal(trek.cheapestOffer.date, TOUR_DATE);
        assert.ok(trek.cheapestOffer.token, 'the card carries a real offer');
        assert.ok(trek.cheapestOffer.quote.totals.totalCents > 0);

        const bundle = response.body.packages.find((row) => row.id === pkg.id);
        assert.ok(bundle, 'the package built around this hotel is offered');
        assert.equal(bundle.quote.startDate, CHECK_IN);
        assert.equal(bundle.quote.currency, 'GEL');
        assert.ok(bundle.quote.totalCents > 0);
        assert.equal(bundle.quote.marginCents, undefined, 'margin is admin-only');

        // The transfer rail depends on which airports the catalogue has near the
        // hotel: it is either a real offer or absent, never an error.
        for (const leg of [response.body.transfers.arrival, response.body.transfers.departure]) {
            if (leg) {
                assert.ok(leg.offer.token);
                assert.ok(leg.from.id !== leg.to.id);
            }
        }
        if (response.body.transfers.arrival) assert.equal(response.body.transfers.arrival.date, CHECK_IN);
        if (response.body.transfers.departure) assert.equal(response.body.transfers.departure.date, CHECK_OUT);
    });

    it('completes a tour with other tours and the packages that include it, never itself', async () => {
        const response = await request(app).get(`/api/recommendations?tour=${tour.tour.slug}&checkIn=${TOUR_DATE}&adults=2`);
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal(response.body.anchor.type, 'TOUR');
        assert.ok(!response.body.tours.some((row) => row.id === tour.tour.id));
        assert.ok(response.body.packages.some((row) => row.id === pkg.id));
    });

    it('needs exactly one anchor and a coherent stay', async () => {
        assert.equal((await request(app).get(`/api/recommendations?checkIn=${CHECK_IN}`)).status, 400);
        assert.equal((await request(app).get(`/api/recommendations?hotel=${hotel.hotel.slug}&tour=${tour.tour.slug}&checkIn=${CHECK_IN}`)).status, 400);
        assert.equal((await request(app).get(`/api/recommendations?hotel=${hotel.hotel.slug}&checkIn=${CHECK_OUT}&checkOut=${CHECK_IN}`)).status, 400);
        assert.equal((await request(app).get(`/api/recommendations?hotel=no-such-hotel&checkIn=${CHECK_IN}`)).status, 404);
    });
});
