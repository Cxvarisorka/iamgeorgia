import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import { sweepOverdueOrderRequests } from '../services/order/order.service.js';
import { createTracker, databaseAvailable, makeAdmin, makeDestination, makePartner, makePartnerUser, signIn } from './support/factories.js';
import { makeSellableHotel, makeService, makeTourDeparture, makeTransferLeg } from './support/packages.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

const START = '2027-01-08';
const TOUR_DATE = '2027-01-09';

/**
 * Orders that wait for a supplier.
 *
 * An on-request tour or service writes its child PENDING with the seats
 * already claimed, the item REQUESTED and the order PENDING_CONFIRMATION.
 * Operations answer per item; declining a required item cancels the whole
 * order at no charge, declining an optional one shrinks the total.
 */
describe('orders on request', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partnerCookie;
    let destination;
    let leg;

    before(async () => {
        adminCookie = (await signIn(app, (await makeAdmin(tracker)).email)).cookie;
        partnerCookie = (await signIn(app, (await makePartnerUser(tracker, await makePartner(tracker))).email)).cookie;
        destination = await makeDestination(tracker);
        leg = await makeTransferLeg(tracker, { destination });
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const lead = { firstName: 'Nino', lastName: 'Beridze', email: 'agency@example.test' };

    const makeOrder = async ({ tourOnRequest = true, serviceOnRequest = true, serviceRequired = false } = {}) => {
        const hotel = await makeSellableHotel(app, adminCookie, tracker, { destination, checkIn: START, nights: 3 });
        const tour = await makeTourDeparture(tracker, { destination, date: TOUR_DATE, ...(tourOnRequest ? {} : {}) });
        if (tourOnRequest) {
            await prisma.tourOption.update({ where: { id: tour.option.id }, data: { confirmationMode: 'ON_REQUEST' } });
        }
        const service = await makeService(tracker, { destination, confirmationMode: serviceOnRequest ? 'ON_REQUEST' : 'INSTANT' });

        const created = await request(app)
            .post('/api/admin/packages')
            .set('Cookie', adminCookie)
            .send({
                slug: `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                name: 'Weekend on request',
                destinationId: destination.id,
                summary: 'Two nights, a trek and a transfer.',
                image: '/images/packages/test.jpg',
                nights: 2,
                b2cEnabled: true,
                adjustmentKind: 'DISCOUNT_BPS',
                adjustmentValue: 500,
                adjustmentAppliesTo: 'ALL_ITEMS',
                components: [
                    { componentType: 'HOTEL_STAY', label: 'Two nights', nights: 2, hotelId: hotel.hotel.id },
                    { componentType: 'TRANSFER', label: 'Airport pick-up', fromPointId: leg.from.id, toPointId: leg.to.id, timeOfDay: '11:00' },
                    { componentType: 'TOUR', label: 'The trek', dayOffset: 1, tourId: tour.tour.id },
                    { componentType: 'SERVICE', label: 'Kosher dinner', required: serviceRequired, serviceId: service.id, quantityRule: 'PER_PERSON' }
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

        return { order: order.body, hotel, tour, service };
    };

    const inventoryOf = (tour) =>
        prisma.tourInventory.findUnique({
            where: { tourOptionId_date: { tourOptionId: tour.option.id, date: new Date(`${TOUR_DATE}T00:00:00.000Z`) } }
        });

    it('holds the order pending, claims the seats, and confirms once every answer is in', async () => {
        const { order, tour } = await makeOrder();
        assert.equal(order.status, 'PENDING_CONFIRMATION');
        assert.ok(order.requestDeadlineAt);
        assert.equal(order.items[2].status, 'REQUESTED');
        assert.equal(order.items[2].fulfilment, 'ON_REQUEST');
        assert.equal(order.items[2].booking.status, 'PENDING');
        assert.equal(order.items[3].status, 'REQUESTED');
        assert.equal(order.items[0].status, 'CONFIRMED', 'the hotel is booked outright');
        assert.equal((await inventoryOf(tour)).bookedUnits, 2, 'seats are claimed while the operator decides');

        const requested = await prisma.outboxEvent.findFirst({ where: { topic: 'order.requested', entityType: 'Order' }, orderBy: { createdAt: 'desc' } });
        assert.ok(requested);

        // The queue, sorted by deadline.
        const queue = await request(app).get('/api/admin/orders?status=PENDING_CONFIRMATION').set('Cookie', adminCookie);
        assert.ok(queue.body.data.some((row) => row.reference === order.reference && row.pendingCount === 2));

        const one = await request(app).post(`/api/admin/orders/${order.reference}/items/2/confirm`).set('Cookie', adminCookie);
        assert.equal(one.status, 200, JSON.stringify(one.body));
        assert.equal(one.body.status, 'PENDING_CONFIRMATION', 'the dinner is still waiting');
        assert.equal(one.body.items[2].status, 'CONFIRMED');
        assert.equal(one.body.items[2].booking.status, 'CONFIRMED');

        assert.equal((await request(app).post(`/api/admin/orders/${order.reference}/items/2/confirm`).set('Cookie', adminCookie)).status, 409);
        assert.equal((await request(app).post(`/api/admin/orders/${order.reference}/items/0/confirm`).set('Cookie', adminCookie)).status, 409, 'a hotel is not on request');

        const both = await request(app).post(`/api/admin/orders/${order.reference}/items/3/confirm`).set('Cookie', adminCookie);
        assert.equal(both.body.status, 'CONFIRMED');
        assert.ok(both.body.confirmedAt);
        assert.equal(both.body.requestDeadlineAt, null);

        // Exactly one voucher, once the whole order is confirmed.
        const confirmed = await prisma.outboxEvent.count({ where: { topic: 'order.confirmed', payload: { path: ['orderId'], equals: (await prisma.order.findUnique({ where: { reference: order.reference } })).id } } });
        assert.equal(confirmed, 1);
    });

    it('drops a declined optional item and shrinks the total', async () => {
        const { order } = await makeOrder({ tourOnRequest: false });
        const dinner = order.items[3];

        const declined = await request(app)
            .post(`/api/admin/orders/${order.reference}/items/3/decline`)
            .set('Cookie', adminCookie)
            .send({ reason: 'No caterer that night' });
        assert.equal(declined.status, 200, JSON.stringify(declined.body));
        assert.equal(declined.body.items[3].status, 'DECLINED');
        assert.equal(declined.body.items[3].booking.status, 'CANCELLED');
        assert.equal(declined.body.items[3].cancellationChargeCents, 0);
        assert.equal(declined.body.status, 'CONFIRMED', 'the rest was never in doubt');
        assert.equal(declined.body.totalCents, order.totalCents - dinner.lineTotalCents);

        const event = await prisma.outboxEvent.findFirst({ where: { topic: 'order.item.declined', entityType: 'Order' }, orderBy: { createdAt: 'desc' } });
        assert.equal(event.payload.slotIndex, 3);
    });

    it('cancels the whole order at no charge when a required item is declined', async () => {
        const { order, tour, hotel } = await makeOrder({ serviceOnRequest: false });

        const declined = await request(app)
            .post(`/api/admin/orders/${order.reference}/items/2/decline`)
            .set('Cookie', adminCookie)
            .send({ reason: 'Guide unavailable' });
        assert.equal(declined.status, 200, JSON.stringify(declined.body));
        assert.equal(declined.body.status, 'CANCELLED');
        assert.equal(declined.body.cancellationChargeCents, 0);
        assert.ok(declined.body.items.every((item) => ['CANCELLED', 'DECLINED'].includes(item.status)));
        assert.ok(declined.body.items.every((item) => (item.cancellationChargeCents ?? 0) === 0));

        assert.equal((await inventoryOf(tour)).bookedUnits, 0);
        const night = await prisma.roomInventory.findFirst({ where: { roomTypeId: hotel.roomType.id, date: new Date(`${START}T00:00:00.000Z`) } });
        assert.equal(night.bookedUnits, 0);
    });

    it('lets the partner withdraw a pending order at no charge, and alerts operations once when a deadline passes', async () => {
        const { order } = await makeOrder();

        // Overdue: the sweeper stamps and enqueues exactly once.
        await prisma.order.update({ where: { reference: order.reference }, data: { requestDeadlineAt: new Date(Date.now() - 60_000) } });
        assert.equal((await sweepOverdueOrderRequests()).alerted >= 1, true);
        const first = await prisma.outboxEvent.count({ where: { topic: 'order.request_overdue', entityType: 'Order', payload: { path: ['orderId'], equals: (await prisma.order.findUnique({ where: { reference: order.reference } })).id } } });
        assert.equal(first, 1);
        await sweepOverdueOrderRequests();
        const second = await prisma.outboxEvent.count({ where: { topic: 'order.request_overdue', entityType: 'Order', payload: { path: ['orderId'], equals: (await prisma.order.findUnique({ where: { reference: order.reference } })).id } } });
        assert.equal(second, 1);

        const quote = await request(app).get(`/api/orders/${order.reference}/cancellation-quote`).set('Cookie', partnerCookie);
        assert.equal(quote.body.chargeCents, 0, 'a pending request and free terms cost nothing');

        const cancelled = await request(app).post(`/api/orders/${order.reference}/cancel`).set('Cookie', partnerCookie).send({ reason: 'Took too long' });
        assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
        assert.equal(cancelled.body.status, 'CANCELLED');
        assert.equal(cancelled.body.cancellation.chargeCents, 0);
    });
});
