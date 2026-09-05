import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import { reconcileInventory } from '../services/hotel/availability.service.js';
import { reconcileTourInventory } from '../services/tour/availability.service.js';
import { createTracker, databaseAvailable, makeAdmin, makeDestination, makePartner, makePartnerUser, signIn } from './support/factories.js';
import { makeSellableHotel, makeService, makeTourDeparture, makeTransferLeg } from './support/packages.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

const START = '2027-01-08';
const TOUR_DATE = '2027-01-09';

/**
 * Cancelling parts of an order and the whole of it.
 *
 * The rule under test is the clawback: an item's refund is its own charge
 * under its frozen terms, less its share of the package discount, both
 * frozen at confirmation. A required item cannot be cancelled by a partner
 * on its own; operations may.
 */
describe('order cancellation', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partnerCookie;
    let destination;
    let leg;
    let service;

    before(async () => {
        adminCookie = (await signIn(app, (await makeAdmin(tracker)).email)).cookie;
        partnerCookie = (await signIn(app, (await makePartnerUser(tracker, await makePartner(tracker))).email)).cookie;
        destination = await makeDestination(tracker);
        leg = await makeTransferLeg(tracker, { destination });
        service = await makeService(tracker, { destination });
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const lead = { firstName: 'Nino', lastName: 'Beridze', email: 'agency@example.test' };

    const makeOrder = async ({ adjustment = { adjustmentKind: 'DISCOUNT_BPS', adjustmentValue: 500, adjustmentAppliesTo: 'ALL_ITEMS' } } = {}) => {
        // FLEXIBLE hotel terms, TIERED tour and service terms: all free this far out.
        const hotel = await makeSellableHotel(app, adminCookie, tracker, { destination, checkIn: START, nights: 3 });
        const tour = await makeTourDeparture(tracker, { destination, date: TOUR_DATE });

        const created = await request(app)
            .post('/api/admin/packages')
            .set('Cookie', adminCookie)
            .send({
                slug: `cancel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                name: 'Weekend in the mountains',
                destinationId: destination.id,
                summary: 'Two nights, a trek and a transfer.',
                image: '/images/packages/test.jpg',
                nights: 2,
                b2cEnabled: true,
                ...adjustment,
                components: [
                    { componentType: 'HOTEL_STAY', label: 'Two nights', nights: 2, hotelId: hotel.hotel.id },
                    { componentType: 'TRANSFER', label: 'Airport pick-up', fromPointId: leg.from.id, toPointId: leg.to.id, timeOfDay: '11:00' },
                    { componentType: 'TOUR', label: 'The trek', dayOffset: 1, tourId: tour.tour.id },
                    { componentType: 'SERVICE', label: 'Kosher dinner', required: false, serviceId: service.id, quantityRule: 'PER_PERSON' }
                ]
            });
        assert.equal(created.status, 201, JSON.stringify(created.body));
        tracker.package(created.body);
        await request(app).post(`/api/admin/packages/${created.body.id}/publish`).set('Cookie', adminCookie);

        const pin = encodeURIComponent(JSON.stringify({ 1: { vehicleId: leg.vehicle.id } }));
        const quote = await request(app).get(`/api/packages/${created.body.slug}/quote?startDate=${START}&adults=2&choices=${pin}`).set('Cookie', partnerCookie);
        assert.equal(quote.body.available, true, JSON.stringify(quote.body));

        const order = await request(app).post('/api/orders').set('Cookie', partnerCookie).send({ packageToken: quote.body.token, leadGuest: lead });
        assert.equal(order.status, 201, JSON.stringify(order.body));

        return { order: order.body, hotel, tour, quote: quote.body };
    };

    const inventoryOf = (tour) =>
        prisma.tourInventory.findUnique({
            where: { tourOptionId_date: { tourOptionId: tour.option.id, date: new Date(`${TOUR_DATE}T00:00:00.000Z`) } }
        });

    it('cancels an optional item, forfeits its share of the discount, and marks the order partial', async () => {
        const { order, hotel, tour } = await makeOrder();
        const dinner = order.items[3];
        assert.ok(dinner.adjustmentCents < 0, 'the discount reached the optional line');

        const quote = await request(app).get(`/api/orders/${order.reference}/cancellation-quote`).set('Cookie', partnerCookie);
        assert.equal(quote.status, 200);
        const line = quote.body.items.find((item) => item.slotIndex === 3);
        // Free terms: nothing is charged against the discounted line, and the
        // refund is that line, not the standalone price: the discount share is forfeited.
        assert.equal(line.chargeCents, 0);
        assert.equal(line.clawbackCents, -dinner.adjustmentCents);
        assert.equal(line.refundCents, dinner.lineTotalCents);
        assert.equal(line.refundCents, dinner.sellCents + dinner.adjustmentCents);

        const cancelled = await request(app)
            .post(`/api/orders/${order.reference}/items/3/cancel`)
            .set('Cookie', partnerCookie)
            .send({ reason: 'No longer needed' });
        assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
        assert.equal(cancelled.body.status, 'PARTIALLY_CANCELLED');
        assert.equal(cancelled.body.items[3].status, 'CANCELLED');
        assert.equal(cancelled.body.items[3].cancellationChargeCents, 0);
        assert.equal(cancelled.body.items[3].booking.status, 'CANCELLED');
        assert.equal(cancelled.body.cancellation.chargeCents, 0);
        assert.equal(cancelled.body.cancellation.refundCents, dinner.lineTotalCents);

        // The survivors are untouched, on both sides.
        assert.equal(cancelled.body.items[0].status, 'CONFIRMED');
        assert.equal((await inventoryOf(tour)).bookedUnits, 2);
        assert.equal((await request(app).post(`/api/orders/${order.reference}/items/3/cancel`).set('Cookie', partnerCookie).send({})).status, 409);
        void hotel;
    });

    it('refuses a partner cancelling a required item, and lets operations do it', async () => {
        const { order, tour } = await makeOrder();

        const refused = await request(app).post(`/api/orders/${order.reference}/items/2/cancel`).set('Cookie', partnerCookie).send({});
        assert.equal(refused.status, 409, JSON.stringify(refused.body));
        assert.equal(refused.body.error.details.reason, 'REQUIRED_COMPONENT');
        assert.equal((await inventoryOf(tour)).bookedUnits, 2);

        const allowed = await request(app)
            .post(`/api/admin/orders/${order.reference}/items/2/cancel`)
            .set('Cookie', adminCookie)
            .send({ reason: 'Guide unwell; rebooked separately' });
        assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
        assert.equal(allowed.body.items[2].status, 'CANCELLED');
        assert.equal(allowed.body.status, 'PARTIALLY_CANCELLED');
        assert.equal((await inventoryOf(tour)).bookedUnits, 0, 'the seats went back');
    });

    it('cancels the whole order: every child released, charges summed, nothing drifting', async () => {
        const { order, hotel, tour, quote } = await makeOrder();

        const expected = await request(app).get(`/api/orders/${order.reference}/cancellation-quote`).set('Cookie', partnerCookie);
        const cancelled = await request(app)
            .post(`/api/orders/${order.reference}/cancel`)
            .set('Cookie', partnerCookie)
            .send({ reason: 'Trip called off' });
        assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
        assert.equal(cancelled.body.status, 'CANCELLED');
        assert.ok(cancelled.body.cancelledAt);
        assert.equal(cancelled.body.cancellation.chargeCents, expected.body.chargeCents);
        // Everything is inside its free window: nothing charged, the discounted total refunded.
        assert.equal(cancelled.body.cancellation.chargeCents, 0);
        assert.equal(cancelled.body.cancellation.refundCents, quote.totals.totalCents);
        assert.equal(expected.body.items.reduce((sum, item) => sum + item.clawbackCents, 0), -quote.totals.adjustmentCents);
        assert.ok(cancelled.body.items.every((item) => item.status === 'CANCELLED' && item.booking.status === 'CANCELLED'));

        assert.equal((await inventoryOf(tour)).bookedUnits, 0);
        const night = await prisma.roomInventory.findFirst({ where: { roomTypeId: hotel.roomType.id, date: new Date(`${START}T00:00:00.000Z`) } });
        assert.equal(night.bookedUnits, 0);
        assert.deepEqual((await reconcileInventory({ roomTypeIds: [hotel.roomType.id] })).drift ?? [], []);
        assert.deepEqual((await reconcileTourInventory({ tourOptionIds: [tour.option.id] })).drift ?? [], []);

        // A transfer's legs were cascaded with it.
        const transfer = await prisma.transferBooking.findUnique({ where: { reference: cancelled.body.items[1].booking.reference }, include: { legs: true } });
        assert.ok(transfer.legs.every((leg) => leg.status === 'CANCELLED'));

        assert.equal((await request(app).post(`/api/orders/${order.reference}/cancel`).set('Cookie', partnerCookie).send({})).status, 409);
        const event = await prisma.outboxEvent.findFirst({ where: { topic: 'order.cancelled', entityType: 'Order' }, orderBy: { createdAt: 'desc' } });
        assert.ok(event);
    });
});
