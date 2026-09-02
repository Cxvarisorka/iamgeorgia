import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { disconnect, prisma } from '../db/index.js';
import { issueRatingToken } from '../lib/transfer/ratingToken.js';
import {
    createTracker,
    databaseAvailable,
    makeAdmin,
    makeAssignment,
    makeDriver,
    makeDriverUser,
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

/**
 * Phase 6: ratings. One per completed leg, from the passenger, the partner
 * or operations; words wait for a look; the averages are recomputed from
 * what is published.
 */
describe('driver ratings', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partner;
    let partnerCookie;
    let otherPartnerCookie;
    let driver;
    let driverCookie;
    let provider;
    let vehicleClass;
    let from;
    let to;

    /** A leg driven to completion an hour ago, by our driver. */
    const completedLeg = async (overrides = {}) => {
        const pickupAt = new Date(Date.now() - 3 * HOUR);
        const booking = await makeTransferBooking(tracker, { vehicleId: vehicleClass.id, from, to, pickupAt, ...overrides });
        const leg = booking.legs[0];
        const assignment = await makeAssignment(leg, {
            driverId: driver.id,
            status: 'COMPLETED',
            acceptedAt: new Date(pickupAt.getTime() - HOUR),
            completedAt: new Date(pickupAt.getTime() + HOUR),
            windowStart: new Date(pickupAt.getTime() - HOUR),
            windowEnd: new Date(pickupAt.getTime() + 2 * HOUR)
        });
        await prisma.transferBookingLeg.update({
            where: { id: leg.id },
            data: { status: 'COMPLETED', statusChangedAt: new Date(pickupAt.getTime() + HOUR) }
        });
        await prisma.transferBooking.update({ where: { id: booking.id }, data: { status: 'COMPLETED' } });

        return { booking, leg, assignment };
    };

    const driverRow = () => prisma.transferDriver.findUnique({ where: { id: driver.id } });

    before(async () => {
        const admin = await makeAdmin(tracker);
        partner = await makePartner(tracker);
        const partnerUser = await makePartnerUser(tracker, partner);
        const otherPartner = await makePartner(tracker);
        const otherUser = await makePartnerUser(tracker, otherPartner);

        provider = tracker.transferProvider(await makeTransferProvider());
        vehicleClass = tracker.transferVehicle(await makeTransferVehicle({ providerId: provider.id }));
        from = tracker.transferPoint(await makeTransferPoint());
        to = tracker.transferPoint(await makeTransferPoint({ latitude: 42.4781, longitude: 44.4783 }));
        driver = await makeDriver(tracker, { providerId: provider.id });
        const driverUser = await makeDriverUser(tracker, driver);

        adminCookie = (await signIn(app, admin.email)).cookie;
        partnerCookie = (await signIn(app, partnerUser.email)).cookie;
        otherPartnerCookie = (await signIn(app, otherUser.email)).cookie;
        driverCookie = (await signIn(app, driverUser.email)).cookie;
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    it('publishes a wordless partner rating at once and recomputes the driver\'s average', async () => {
        const { booking } = await completedLeg({ partnerId: partner.id });

        const res = await request(app)
            .post(`/api/partner/transfers/bookings/${booking.reference}/legs/0/rating`)
            .set('Cookie', partnerCookie)
            .send({ score: 5 });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.equal(res.body.status, 'PUBLISHED');
        assert.equal(res.body.source, 'PARTNER');

        const row = await driverRow();
        assert.equal(row.ratingCount, 1);
        assert.equal(row.ratingAvg, 5);

        const providerRow = await prisma.transferProvider.findUnique({ where: { id: provider.id } });
        assert.equal(providerRow.reviewCount, 1);
        assert.equal(providerRow.rating, 5);

        const again = await request(app)
            .post(`/api/partner/transfers/bookings/${booking.reference}/legs/0/rating`)
            .set('Cookie', partnerCookie)
            .send({ score: 1 });
        assert.equal(again.status, 409);
        assert.equal(again.body.error.details.reason, 'ALREADY_RATED');

        const stranger = await request(app)
            .post(`/api/partner/transfers/bookings/${booking.reference}/legs/0/rating`)
            .set('Cookie', otherPartnerCookie)
            .send({ score: 1 });
        assert.equal(stranger.status, 404, "another partner's booking does not exist");
    });

    it('holds a passenger\'s comment for a look, then counts it once published', async () => {
        const { booking, leg } = await completedLeg();
        const before = await driverRow();

        const token = issueRatingToken({ legId: leg.id, email: booking.leadPassengerEmail });
        const res = await request(app)
            .post('/api/transfers/ratings')
            .send({ token, score: 2, comment: 'Late, and the car smelt of smoke.' });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.equal(res.body.status, 'PENDING');
        assert.equal(res.body.comment, null, 'held words are not echoed back as published');

        assert.equal((await driverRow()).ratingCount, before.ratingCount, 'a pending rating does not count');

        const queue = await request(app)
            .get('/api/admin/transfers/dispatch/ratings')
            .set('Cookie', adminCookie)
            .query({ status: 'PENDING' });
        assert.equal(queue.status, 200);
        const pending = queue.body.data.find((row) => row.id === res.body.id);
        assert.ok(pending);
        assert.equal(pending.comment, 'Late, and the car smelt of smoke.');
        assert.equal(pending.submittedByEmail, booking.leadPassengerEmail.toLowerCase());

        const published = await request(app)
            .post(`/api/admin/transfers/dispatch/ratings/${res.body.id}/publish`)
            .set('Cookie', adminCookie)
            .send({ note: 'Fair comment' });
        assert.equal(published.status, 200, JSON.stringify(published.body));
        assert.equal(published.body.status, 'PUBLISHED');

        const after = await driverRow();
        assert.equal(after.ratingCount, before.ratingCount + 1);
        const fresh = await prisma.transferDriverRating.aggregate({
            where: { driverId: driver.id, status: 'PUBLISHED' },
            _avg: { score: true }
        });
        assert.equal(after.ratingAvg, fresh._avg.score, 'the average equals a fresh AVG');

        const rejected = await request(app)
            .post(`/api/admin/transfers/dispatch/ratings/${res.body.id}/reject`)
            .set('Cookie', adminCookie)
            .send({});
        assert.equal(rejected.status, 200);
        assert.equal((await driverRow()).ratingCount, before.ratingCount, 'rejecting takes it back out');
    });

    it('refuses a link for someone else\'s address, an expired one, and a leg not yet driven', async () => {
        const { booking, leg } = await completedLeg();

        const forged = issueRatingToken({ legId: leg.id, email: 'somebody@else.test' });
        const wrong = await request(app).post('/api/transfers/ratings').send({ token: forged, score: 5 });
        assert.equal(wrong.status, 404);

        const tampered = `${issueRatingToken({ legId: leg.id, email: booking.leadPassengerEmail })}x`;
        const bad = await request(app).post('/api/transfers/ratings').send({ token: tampered, score: 5 });
        assert.equal(bad.status, 400);

        const future = await makeTransferBooking(tracker, { vehicleId: vehicleClass.id, from, to, partnerId: partner.id });
        const early = await request(app)
            .post(`/api/partner/transfers/bookings/${future.reference}/legs/0/rating`)
            .set('Cookie', partnerCookie)
            .send({ score: 4 });
        assert.equal(early.status, 409);
        assert.equal(early.body.error.details.reason, 'NOT_RATABLE');

        const zero = await request(app)
            .post(`/api/partner/transfers/bookings/${booking.reference}/legs/0/rating`)
            .set('Cookie', partnerCookie)
            .send({ score: 0 });
        assert.equal(zero.status, 400);
    });

    it('lets operations record feedback taken by phone', async () => {
        const { leg } = await completedLeg();

        const res = await request(app)
            .post(`/api/admin/transfers/dispatch/legs/${leg.id}/rating`)
            .set('Cookie', adminCookie)
            .send({ score: 4 });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.equal(res.body.source, 'ADMIN');
        assert.equal(res.body.submittedBy.email !== undefined, true);
    });

    it('shows the driver their spread, and a partner the profile of a driver they have met', async () => {
        const mine = await request(app).get('/api/driver/me/ratings').set('Cookie', driverCookie);
        assert.equal(mine.status, 200, JSON.stringify(mine.body));
        assert.ok(mine.body.ratingCount >= 2);
        assert.equal(Object.keys(mine.body.distribution).length, 5);
        assert.equal('comment' in mine.body, false);

        const profile = await request(app).get(`/api/partner/drivers/${driver.id}`).set('Cookie', partnerCookie);
        assert.equal(profile.status, 200, JSON.stringify(profile.body));
        assert.equal(profile.body.id, driver.id);
        assert.equal(profile.body.lastName, driver.lastName);
        assert.equal('phone' in profile.body, false);
        assert.equal('licenceNumber' in profile.body, false);
        assert.ok(Array.isArray(profile.body.reviews));
        assert.ok(profile.body.reviews.every((review) => review.status === 'PUBLISHED'));

        const stranger = await request(app).get(`/api/partner/drivers/${driver.id}`).set('Cookie', otherPartnerCookie);
        assert.equal(stranger.status, 404, 'a partner who never met the driver cannot browse them');
    });
});
