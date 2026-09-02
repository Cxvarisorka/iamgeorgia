import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { disconnect, prisma } from '../db/index.js';
import {
    createTracker,
    databaseAvailable,
    futureDate,
    makeAdmin,
    makeAssignment,
    makeDriver,
    makeDriverUser,
    makeFleetVehicle,
    makePartner,
    makePartnerUser,
    makeTransferBooking,
    makeTransferPoint,
    makeTransferPrice,
    makeTransferProvider,
    makeTransferRoute,
    makeTransferVehicle,
    signIn,
    unique
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

const MINUTE = 60_000;

/**
 * A partner asking for a particular driver at checkout: who is offered, who
 * is not, and what happens when the driver they chose was taken while they
 * were typing.
 */
describe('a partner choosing the driver at checkout', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let from;
    let to;
    let provider;
    let sedan;
    let partnerCookie;
    let adminCookie;
    let driverCookie;
    let car;
    let driver;
    let unverified;
    let wrongClassDriver;

    /** A fresh quote for the standard journey, as the partner sees it. */
    const quoteFor = async (params = {}) => {
        const query = new URLSearchParams({
            from: from.slug,
            to: to.slug,
            date: futureDate(20),
            time: '10:00',
            adults: '2',
            luggage: '2',
            ...params
        });

        const res = await request(app).get(`/api/transfers/quotes?${query}`).set('Cookie', partnerCookie);
        assert.equal(res.status, 200, JSON.stringify(res.body));
        const offer = res.body.offers.find((entry) => entry.vehicle.slug === sedan.slug);
        assert.ok(offer, 'the fixture class should be quotable');

        return offer;
    };

    const available = (token, cookie = partnerCookie) =>
        request(app).post('/api/partner/drivers/available').set('Cookie', cookie).send({ token });

    const confirm = (body, cookie = partnerCookie) =>
        request(app).post('/api/transfers/bookings').set('Cookie', cookie).send(body);

    const leadPassenger = () => ({
        firstName: 'Ana',
        lastName: 'Beridze',
        email: `ana.${unique('p')}@example.test`,
        phone: '+995 555 123 456'
    });

    before(async () => {
        from = tracker.transferPoint(
            await makeTransferPoint({ slug: unique('tbs'), name: 'Test Airport', kind: 'AIRPORT', latitude: 41.6692, longitude: 44.9547 })
        );
        to = tracker.transferPoint(
            await makeTransferPoint({ slug: unique('resort'), name: 'Test Resort', latitude: 42.4781, longitude: 44.4783 })
        );
        provider = tracker.transferProvider(await makeTransferProvider());
        sedan = tracker.transferVehicle(await makeTransferVehicle({ slug: unique('sedan'), providerId: provider.id }));
        const route = tracker.transferRoute(
            await makeTransferRoute({ slug: unique('route'), fromPointId: from.id, toPointId: to.id, category: 'AIRPORT', distanceKm: 128 })
        );
        await makeTransferPrice(route.id, sedan.id, { oneWayCents: 17_500 });

        // Levan: verified, in a sedan of the booked class. The one to offer.
        car = await makeFleetVehicle(tracker, { providerId: provider.id, vehicleClassId: sedan.id });
        driver = await makeDriver(tracker, { providerId: provider.id, firstName: 'Levan' });
        await prisma.transferDriverVehicle.create({ data: { driverId: driver.id, fleetVehicleId: car.id, isPrimary: true } });
        const driverUser = await makeDriverUser(tracker, driver);

        // Nika: the right car, but not yet verified. A dispatcher may override that; a partner may not.
        unverified = await makeDriver(tracker, { providerId: provider.id, firstName: 'Nika', verificationStatus: 'PENDING', verifiedAt: null });
        const nikasCar = await makeFleetVehicle(tracker, { providerId: provider.id, vehicleClassId: sedan.id });
        await prisma.transferDriverVehicle.create({ data: { driverId: unverified.id, fleetVehicleId: nikasCar.id, isPrimary: true } });

        // Dato: verified, but his only car is sold as a different class.
        const minivan = tracker.transferVehicle(
            await makeTransferVehicle({ slug: unique('van'), providerId: provider.id, name: 'Test Van', vehicleClass: 'MINIVAN', maxPassengers: 6, maxLuggage: 6 })
        );
        wrongClassDriver = await makeDriver(tracker, { providerId: provider.id, firstName: 'Dato' });
        const van = await makeFleetVehicle(tracker, { providerId: provider.id, vehicleClassId: minivan.id, passengerCapacity: 6, luggageCapacity: 6 });
        await prisma.transferDriverVehicle.create({ data: { driverId: wrongClassDriver.id, fleetVehicleId: van.id, isPrimary: true } });

        const partner = await makePartner(tracker);
        const partnerUser = await makePartnerUser(tracker, partner);
        const admin = await makeAdmin(tracker);

        partnerCookie = (await signIn(app, partnerUser.email)).cookie;
        adminCookie = (await signIn(app, admin.email)).cookie;
        driverCookie = (await signIn(app, driverUser.email)).cookie;
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    it('lists verified drivers with a free car of the booked class, and nobody else', async () => {
        const offer = await quoteFor();

        const res = await available(offer.token);
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.equal(res.body.vehicleClass.id, sedan.id);
        assert.equal(res.body.legs.length, 1);

        const ids = res.body.drivers.map((row) => row.id);
        assert.ok(ids.includes(driver.id), 'the verified driver with the right car is offered');
        assert.ok(!ids.includes(unverified.id), 'an unverified driver is not');
        assert.ok(!ids.includes(wrongClassDriver.id), 'a driver without a car of the booked class is not');

        const levan = res.body.drivers.find((row) => row.id === driver.id);
        assert.equal(levan.firstName, 'Levan');
        assert.equal(levan.verified, true);
        assert.equal('phone' in levan, false, 'no phone number before the pick-up is close');
        assert.equal(levan.cars.length, 1);
        assert.equal(levan.cars[0].id, car.id);
        assert.equal(levan.cars[0].isPrimary, true);
        assert.ok(Array.isArray(levan.cars[0].images), 'the car comes with its gallery');

        const anonymous = await request(app).post('/api/partner/drivers/available').send({ token: offer.token });
        assert.equal(anonymous.status, 401);

        const asAdmin = await available(offer.token, adminCookie);
        assert.equal(asAdmin.status, 200);
    });

    it('offers the chosen driver every leg in the same transaction as the booking, and shows the partner the wait', async () => {
        const offer = await quoteFor({ date: futureDate(21) });
        const passenger = leadPassenger();

        const res = await confirm({
            quoteToken: offer.token,
            leadPassenger: passenger,
            preferredDriverId: driver.id,
            preferredFleetVehicleId: car.id
        });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.equal(res.body.status, 'CONFIRMED');

        const [leg] = res.body.legs;
        assert.equal(leg.status, 'ASSIGNED');
        assert.equal(leg.assignment.status, 'OFFERED');
        assert.equal(leg.assignment.awaitingDriver, true);
        assert.equal(leg.assignment.driver.id, driver.id);
        assert.equal(leg.assignment.driver.lastName, driver.lastName, 'a partner sees the full name');
        assert.equal('phone' in leg.assignment.driver, false, 'but not the number until the driver has accepted and the pick-up is close');
        assert.equal(leg.assignment.vehicle.id, car.id);

        // The offer is recorded as the partner's request, not as dispatch's.
        const assignment = await prisma.transferAssignment.findFirst({ where: { booking: { reference: res.body.reference } } });
        const audit = await prisma.auditLog.findFirst({ where: { action: 'TRANSFER_ASSIGNMENT_CREATED', entityId: assignment.id } });
        assert.equal(audit.metadata.requestedByPartner, true);
        assert.equal(assignment.dispatcherNotes, 'Requested by the partner at booking');

        // The partner can already read the driver's profile.
        const profile = await request(app).get(`/api/partner/drivers/${driver.id}`).set('Cookie', partnerCookie);
        assert.equal(profile.status, 200);

        // The driver sees the offer and takes it.
        const offers = await request(app).get('/api/driver/assignments').set('Cookie', driverCookie).query({ scope: 'upcoming' });
        assert.equal(offers.status, 200);
        const mine = offers.body.data.find((row) => row.booking.reference === res.body.reference);
        assert.ok(mine, 'the driver is offered the job');
        assert.equal(mine.canAccept, true);

        const accepted = await request(app).post(`/api/driver/assignments/${mine.id}/accept`).set('Cookie', driverCookie);
        assert.equal(accepted.status, 200, JSON.stringify(accepted.body));

        const afterwards = await request(app)
            .get(`/api/partner/transfers/bookings/${res.body.reference}`)
            .set('Cookie', partnerCookie);
        assert.equal(afterwards.status, 200);
        assert.equal(afterwards.body.legs[0].status, 'ACCEPTED');
        assert.equal(afterwards.body.legs[0].assignment.status, 'ACCEPTED');
        assert.equal(afterwards.body.legs[0].assignment.awaitingDriver, false);
    });

    it('refuses a guest naming a driver, and a driver who is not eligible', async () => {
        const offer = await quoteFor({ date: futureDate(22) });

        const guest = await request(app)
            .post('/api/transfers/bookings')
            .send({ quoteToken: offer.token, leadPassenger: leadPassenger(), preferredDriverId: driver.id });
        assert.equal(guest.status, 400);
        assert.equal(guest.body.error.details.field, 'preferredDriverId');

        const carAlone = await confirm({ quoteToken: offer.token, leadPassenger: leadPassenger(), preferredFleetVehicleId: car.id });
        assert.equal(carAlone.status, 400);

        const notVerified = await confirm({ quoteToken: offer.token, leadPassenger: leadPassenger(), preferredDriverId: unverified.id });
        assert.equal(notVerified.status, 422);
        assert.equal(notVerified.body.error.details.reason, 'DRIVER_NOT_ELIGIBLE');

        const wrongClass = await confirm({ quoteToken: offer.token, leadPassenger: leadPassenger(), preferredDriverId: wrongClassDriver.id });
        assert.equal(wrongClass.status, 422);
        assert.equal(wrongClass.body.error.details.reason, 'DRIVER_NOT_ELIGIBLE');

        const wrongCar = await confirm({
            quoteToken: offer.token,
            leadPassenger: leadPassenger(),
            preferredDriverId: driver.id,
            preferredFleetVehicleId: 'not-his-car'
        });
        assert.equal(wrongCar.status, 422);
        assert.equal(wrongCar.body.error.details.field, 'preferredFleetVehicleId');

        const nobody = await confirm({ quoteToken: offer.token, leadPassenger: leadPassenger(), preferredDriverId: 'no-such-driver' });
        assert.equal(nobody.status, 422);
    });

    it('rolls the whole booking back when the chosen driver was taken in the meantime', async () => {
        const offer = await quoteFor({ date: futureDate(25) });
        const pickupAt = new Date(offer.quote.legs[0].pickupAt);

        // Somebody else's job, sitting exactly on the pick-up.
        const other = await makeTransferBooking(tracker, { vehicleId: sedan.id, from, to, pickupAt });
        await makeAssignment(other.legs[0], {
            driverId: driver.id,
            fleetVehicleId: car.id,
            windowStart: new Date(pickupAt.getTime() - 45 * MINUTE),
            windowEnd: new Date(pickupAt.getTime() + 120 * MINUTE),
            status: 'ACCEPTED',
            acceptedAt: new Date()
        });

        const listed = await available(offer.token);
        assert.equal(listed.status, 200);
        assert.ok(!listed.body.drivers.some((row) => row.id === driver.id), 'a busy driver is not offered');

        const passenger = leadPassenger();
        const res = await confirm({ quoteToken: offer.token, leadPassenger: passenger, preferredDriverId: driver.id });
        assert.equal(res.status, 409, JSON.stringify(res.body));
        assert.equal(res.body.error.details.reason, 'DRIVER_UNAVAILABLE');

        assert.equal(
            await prisma.transferBooking.count({ where: { leadPassengerEmail: passenger.email } }),
            0,
            'nothing was written: no booking, and no idempotency key to replay'
        );

        // Choosing again — this time letting dispatch pick — books normally.
        const again = await confirm({ quoteToken: offer.token, leadPassenger: passenger });
        assert.equal(again.status, 201, JSON.stringify(again.body));
        assert.equal(again.body.legs[0].status, 'UNASSIGNED');
        assert.equal(again.body.legs[0].assignment, null);
    });
});
