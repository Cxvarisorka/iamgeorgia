import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { disconnect, prisma } from '../db/index.js';
import { clearOutbox, outbox } from '../lib/mailer/index.js';
import { drainOutbox } from '../services/notifications/outbox.service.js';
import { sweepReminders } from '../services/transfer/reminder.service.js';
import {
    createTracker,
    databaseAvailable,
    makeAdmin,
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
const inHours = (hours) => new Date(Date.now() + hours * HOUR);

/**
 * Phase 7: the outbox becomes emails and in-app notices, and the clock
 * produces reminders, driver details and alerts — each exactly once.
 */
describe('notifications', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let dispatcherCookie;
    let partnerUser;
    let partner;
    let driver;
    let driverUser;
    let driverCookie;
    let vehicleClass;
    let from;
    let to;

    const dispatch = (legId, body) =>
        request(app).post(`/api/admin/transfers/dispatch/legs/${legId}/assign`).set('Cookie', dispatcherCookie).send(body);

    const newBooking = (overrides = {}) =>
        makeTransferBooking(tracker, { vehicleId: vehicleClass.id, from, to, ...overrides });

    /** Drains to empty: earlier suites leave events behind, and they are older than ours. */
    const drainAll = async () => {
        let total = 0;

        for (let round = 0; round < 40; round += 1) {
            const result = await drainOutbox({ limit: 100 });
            total += result.processed + result.failed;
            if (result.skipped || (result.processed === 0 && result.failed === 0)) break;
        }

        return total;
    };

    const eventsFor = (legId) => prisma.outboxEvent.findMany({ where: { payload: { path: ['legId'], equals: legId } } });

    before(async () => {
        const dispatcher = await makeAdmin(tracker, { role: 'DISPATCHER' });
        partner = await makePartner(tracker);
        partnerUser = await makePartnerUser(tracker, partner);
        const provider = tracker.transferProvider(await makeTransferProvider());
        vehicleClass = tracker.transferVehicle(await makeTransferVehicle({ providerId: provider.id }));
        from = tracker.transferPoint(await makeTransferPoint({ kind: 'AIRPORT' }));
        to = tracker.transferPoint(await makeTransferPoint({ latitude: 42.4781, longitude: 44.4783 }));
        driver = await makeDriver(tracker, { providerId: provider.id, firstName: 'Levan' });
        driverUser = await makeDriverUser(tracker, driver);

        dispatcherCookie = (await signIn(app, dispatcher.email)).cookie;
        driverCookie = (await signIn(app, driverUser.email)).cookie;
    });

    after(async () => {
        await prisma.notification.deleteMany({ where: { recipientUserId: { in: [driverUser.id, partnerUser.id] } } });
        await tracker.cleanup();
        await disconnect();
    });

    it('turns an offer into an email and a notice for the driver, once', async () => {
        clearOutbox();
        const booking = await newBooking({ pickupAt: inHours(24 * 30) });
        const offered = await dispatch(booking.legs[0].id, { driverId: driver.id });
        assert.equal(offered.status, 201);

        const queued = await eventsFor(booking.legs[0].id);
        assert.ok(queued.some((event) => event.topic === 'transfer.assignment.offered'));
        assert.ok(queued.every((event) => event.processedAt === null), 'nothing is sent inside the request');

        assert.ok((await drainAll()) >= 1);

        const mail = outbox.find((entry) => entry.template === 'transferAssignmentOffered' && entry.to === driverUser.email);
        assert.ok(mail, 'the driver was emailed');
        assert.match(mail.data.url, /\/driver\/assignments\//);

        const notices = await request(app).get('/api/driver/notifications').set('Cookie', driverCookie);
        assert.equal(notices.status, 200);
        const mine = notices.body.data.filter((row) => row.payload.bookingReference === booking.reference);
        assert.equal(mine.length, 1);
        assert.equal(mine[0].kind, 'TRANSFER_ASSIGNMENT_OFFERED');
        assert.equal(mine[0].readAt, null);
        assert.ok(notices.body.unreadCount >= 1);

        const again = await drainOutbox({ limit: 100 });
        assert.equal(again.processed + again.failed, 0, 'a processed event is not processed twice');

        const read = await request(app).post(`/api/driver/notifications/${mine[0].id}/read`).set('Cookie', driverCookie);
        assert.equal(read.status, 200);
        assert.ok(read.body.readAt);

        const done = await prisma.outboxEvent.findFirst({ where: { id: queued[0].id } });
        assert.ok(done.processedAt);
    });

    it('tells the partner when the driver accepts, without the phone number this far out', async () => {
        clearOutbox();
        const booking = await newBooking({ pickupAt: inHours(24 * 31), partnerId: partner.id, bookedByUserId: partnerUser.id });
        const offered = await dispatch(booking.legs[0].id, { driverId: driver.id });
        await request(app).post(`/api/driver/assignments/${offered.body.assignment.id}/accept`).set('Cookie', driverCookie);

        await drainAll();

        const mail = outbox.find((entry) => entry.template === 'transferDriverAssigned' && entry.to === partnerUser.email);
        assert.ok(mail, 'the booker was emailed');
        assert.equal(mail.data.driverName, `${driver.firstName} ${driver.lastName}`);
        assert.equal(mail.data.driverPhone, null, 'the number waits for the day before');

        const notices = await prisma.notification.findMany({
            where: { recipientUserId: partnerUser.id, kind: 'TRANSFER_ASSIGNMENT_ACCEPTED' }
        });
        assert.ok(notices.some((row) => row.payload.bookingReference === booking.reference));
    });

    it('reminds the driver, sends the passenger the details, and alerts on an undriven leg — each once', async () => {
        clearOutbox();
        const soon = await newBooking({ pickupAt: inHours(1.5) });
        const offered = await dispatch(soon.legs[0].id, { driverId: driver.id, acceptOnBehalf: true });
        assert.equal(offered.status, 201, JSON.stringify(offered.body));

        const undriven = await newBooking({ pickupAt: inHours(10) });

        const first = await sweepReminders();
        assert.ok(first.reminders >= 1, JSON.stringify(first));
        assert.ok(first.details >= 1);
        assert.ok(first.alerts >= 1);

        const second = await sweepReminders();
        const soonEvents = await eventsFor(soon.legs[0].id);
        assert.equal(soonEvents.filter((event) => event.topic === 'transfer.pickup.reminder').length, 1, 'one reminder');
        assert.equal(soonEvents.filter((event) => event.topic === 'transfer.driver.details').length, 1, 'one details email');
        const undrivenEvents = await eventsFor(undriven.legs[0].id);
        assert.equal(undrivenEvents.filter((event) => event.topic === 'transfer.leg.unassigned_alert').length, 1, 'one alert');
        assert.ok(!second.skipped);

        await drainAll();

        assert.ok(outbox.some((entry) => entry.template === 'transferPickupReminder' && entry.to === driverUser.email));
        const details = outbox.find((entry) => entry.template === 'transferDriverDetails' && entry.to === soon.leadPassengerEmail);
        assert.ok(details, 'the passenger learns who is coming');
        assert.equal(details.data.driverPhone, driver.phone);

        const alert = await prisma.notification.findFirst({
            where: { kind: 'TRANSFER_LEG_UNASSIGNED_ALERT', entityId: undriven.legs[0].id }
        });
        assert.ok(alert, 'operations are told about the undriven leg');
    });

    it('invites the passenger to rate once the leg is completed', async () => {
        clearOutbox();
        const booking = await newBooking({ pickupAt: inHours(-2) });
        const offered = await dispatch(booking.legs[0].id, { driverId: driver.id, acceptOnBehalf: true });
        const done = await request(app)
            .post(`/api/driver/assignments/${offered.body.assignment.id}/status`)
            .set('Cookie', driverCookie)
            .send({ to: 'COMPLETED' });
        assert.equal(done.status, 200, JSON.stringify(done.body));

        await drainAll();

        const invite = outbox.find((entry) => entry.template === 'transferRatingInvite' && entry.to === booking.leadPassengerEmail);
        assert.ok(invite, 'the passenger is invited to rate');
        assert.match(invite.data.url, /\/transfers\/rate\//);

        const token = invite.data.url.split('/transfers/rate/')[1];
        const rated = await request(app).post('/api/transfers/ratings').send({ token, score: 5 });
        assert.equal(rated.status, 201, JSON.stringify(rated.body));
    });
});
