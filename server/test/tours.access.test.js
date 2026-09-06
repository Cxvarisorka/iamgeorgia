import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { disconnect, prisma } from '../db/index.js';
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

const DATE = '2027-08-16';

/**
 * Who may touch a tour booking, asked from the outside — over HTTP, with a
 * cookie or without one, never by calling the guard.
 *
 * `tours.admin.test.js` proves the *registers* are scoped. What is untested is
 * the direct hit: a reference is short and sequential, so knowing one must not
 * be enough to read it, amend it or cancel it. Every refusal here is a 404
 * rather than a 403, because a 403 would confirm the reference exists.
 */
describe('tour booking access', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let ownerCookie;
    let otherCookie;
    let destination;
    let booking;

    before(async () => {
        adminCookie = (await signIn(app, (await makeAdmin(tracker)).email)).cookie;
        const owner = await makePartner(tracker);
        ownerCookie = (await signIn(app, (await makePartnerUser(tracker, owner)).email)).cookie;
        const other = await makePartner(tracker);
        otherCookie = (await signIn(app, (await makePartnerUser(tracker, other)).email)).cookie;
        destination = await makeDestination(tracker);

        const tour = await makeTour(tracker, { destination });
        await makeTourOption(tour, { date: DATE, totalUnits: 20 });

        const search = await request(app)
            .get(`/api/search/tours/${tour.slug}?date=${DATE}&adults=2`)
            .set('Cookie', ownerCookie);
        assert.equal(search.status, 200, JSON.stringify(search.body));

        const created = await request(app)
            .post('/api/tours/bookings')
            .set('Cookie', ownerCookie)
            .send({
                offerToken: search.body.options[0].dates[0].token,
                leadTraveller: { firstName: 'Nino', lastName: 'Beridze', email: 'owner@example.test' }
            });
        assert.equal(created.status, 201, JSON.stringify(created.body));
        booking = created.body;
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const ref = () => booking.reference;

    it('hides another partner\'s booking behind a 404 on every route that reads it', async () => {
        for (const path of ['', '/cancellation-quote']) {
            const response = await request(app).get(`/api/tours/bookings/${ref()}${path}`).set('Cookie', otherCookie);

            assert.equal(response.status, 404, `GET ${path || '/'} for a stranger: ${JSON.stringify(response.body)}`);
        }

        // The owner reaches the same reference, so the 404 is about the viewer
        // and not about the booking having gone missing.
        const mine = await request(app).get(`/api/tours/bookings/${ref()}`).set('Cookie', ownerCookie);
        assert.equal(mine.status, 200, JSON.stringify(mine.body));
        assert.equal(mine.body.reference, ref());
    });

    it('refuses a guest lookup without the lead email, and with the wrong one', async () => {
        const anonymous = await request(app).get(`/api/tours/bookings/${ref()}`);
        assert.equal(anonymous.status, 404);

        const guessed = await request(app).get(`/api/tours/bookings/${ref()}?email=someone@example.test`);
        assert.equal(guessed.status, 404);

        // Even the right email does not open a partner's booking: it was sold
        // on account, and the guest channel is for bookings with no partner.
        const rightEmail = await request(app).get(`/api/tours/bookings/${ref()}?email=owner@example.test`);
        assert.equal(rightEmail.status, 404);
    });

    it('will not let a stranger amend or cancel a booking it cannot read', async () => {
        const amended = await request(app)
            .patch(`/api/tours/bookings/${ref()}`)
            .set('Cookie', otherCookie)
            .send({ specialRequests: 'Injected by a stranger' });
        assert.equal(amended.status, 404, JSON.stringify(amended.body));

        const cancelled = await request(app)
            .post(`/api/tours/bookings/${ref()}/cancel`)
            .set('Cookie', otherCookie)
            .send({ reason: 'Not mine to cancel' });
        assert.equal(cancelled.status, 404, JSON.stringify(cancelled.body));

        const row = await prisma.tourBooking.findUnique({ where: { reference: ref() } });
        assert.equal(row.status, 'CONFIRMED', 'the booking is untouched');
        assert.equal(row.specialRequests, null);
    });

    it('closes the admin register and the operator actions to everyone else', async () => {
        const calls = [
            ['get', `/api/admin/tours/bookings`],
            ['get', `/api/admin/tours/bookings/${ref()}`],
            ['post', `/api/admin/tours/bookings/${ref()}/confirm`],
            ['post', `/api/admin/tours/bookings/${ref()}/decline`],
            ['post', `/api/admin/tours/bookings/${ref()}/cancel`]
        ];

        for (const [method, path] of calls) {
            const anonymous = await request(app)[method](path).send({ reason: 'x' });
            assert.equal(anonymous.status, 401, `signed out: ${method.toUpperCase()} ${path}`);

            const asPartner = await request(app)[method](path).set('Cookie', ownerCookie).send({ reason: 'x' });
            assert.equal(asPartner.status, 403, `as a partner: ${method.toUpperCase()} ${path}`);
        }

        // The partner register is closed to a signed-out caller too, and open
        // to the partner — the guard is on the router, not on the handler.
        assert.equal((await request(app).get('/api/partner/tours/bookings')).status, 401);
        assert.equal((await request(app).get('/api/partner/tours/bookings').set('Cookie', ownerCookie)).status, 200);

        const row = await prisma.tourBooking.findUnique({ where: { reference: ref() } });
        assert.equal(row.status, 'CONFIRMED', 'no refused call did anything');
    });

    it('does not let a partner widen its own register with a partnerId filter', async () => {
        const owner = await prisma.tourBooking.findUnique({ where: { reference: ref() } });
        const widened = await request(app)
            .get(`/api/partner/tours/bookings?partnerId=${owner.partnerId}`)
            .set('Cookie', otherCookie);

        assert.equal(widened.status, 200, JSON.stringify(widened.body));
        assert.ok(
            !widened.body.data.some((row) => row.reference === ref()),
            'partnerId in the query does not override the viewer'
        );
    });
});
