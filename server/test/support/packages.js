import request from 'supertest';

import { prisma } from '../../db/index.js';
import { addDays } from '../../lib/time.js';
import {
    makeHotel,
    makeService,
    makeTour,
    makeTourOption,
    makeTransferPoint,
    makeTransferPrice,
    makeTransferRoute,
    makeTransferVehicle,
    unique
} from './factories.js';

/**
 * The products a package test composes: a sellable hotel, a priced transfer,
 * a tour with a departure, a service. Each is what the standalone suites
 * build for themselves, gathered here because an order test needs all four.
 */

/** A hotel with one room, one rate plan, stock and a nightly net for the stay. */
export const makeSellableHotel = async (
    app,
    adminCookie,
    tracker,
    { destination, checkIn, nights, netCents = 20_000, totalUnits = 5, cancellationKind = 'FLEXIBLE', ...overrides }
) => {
    const hotel = await makeHotel(tracker, {
        destination,
        status: 'ACTIVE',
        checkInFrom: '14:00',
        checkOutUntil: '12:00',
        latitude: 41.7151,
        longitude: 44.8271,
        ...overrides
    });

    const roomType = await prisma.roomType.create({
        data: {
            hotelId: hotel.id,
            code: 'std',
            name: 'Standard Double',
            maxOccupancy: 3,
            maxAdults: 2,
            maxChildren: 1,
            standardOccupancy: 2
        }
    });

    const [mealPlan, cancellation, payment, king] = await Promise.all([
        prisma.mealPlan.findUnique({ where: { code: 'BB' } }),
        prisma.cancellationPolicy.findFirst({ where: { hotelId: null, kind: cancellationKind } }),
        prisma.paymentPolicy.findFirst({ where: { hotelId: null, timing: 'PAY_NOW' } }),
        prisma.bedType.findUnique({ where: { code: 'KING' } })
    ]);

    await prisma.roomBed.create({ data: { roomTypeId: roomType.id, bedTypeId: king.id, quantity: 1 } });

    const ratePlan = await prisma.ratePlan.create({
        data: {
            roomTypeId: roomType.id,
            code: unique('rp').slice(0, 40),
            name: 'Breakfast, flexible',
            mealPlanId: mealPlan.id,
            cancellationPolicyId: cancellation.id,
            paymentPolicyId: payment.id,
            currency: 'GEL'
        }
    });

    const lastNight = addDays(checkIn, nights - 1);

    await request(app)
        .put(`/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/inventory`)
        .set('Cookie', adminCookie)
        .send({ from: checkIn, to: lastNight, totalUnits });

    await request(app)
        .put(`/api/admin/hotels/${hotel.id}/room-types/${roomType.id}/rate-plans/${ratePlan.id}/rates`)
        .set('Cookie', adminCookie)
        .send({ from: checkIn, to: lastNight, netCents });

    return { hotel, roomType, ratePlan };
};

/** A FULL kosher profile with one live certificate of the given scope. */
export const makeKosherProfile = (hotelId, { serviceLevel = 'FULL', scope = 'KITCHEN', expiresOn = null, verification = 'VERIFIED' } = {}) =>
    prisma.hotelKosherProfile.create({
        data: {
            hotelId,
            serviceLevel,
            certifications: {
                create: [
                    {
                        authorityName: 'Beit Din of Tbilisi',
                        scope,
                        verification,
                        // The CHECK insists a verified certificate says when.
                        verifiedAt: verification === 'VERIFIED' ? new Date() : null,
                        expiresOn: expiresOn ? new Date(`${expiresOn}T00:00:00.000Z`) : null
                    }
                ]
            }
        }
    });

/** Two points, a class sold to everyone, a route between them and a fare. Net 200.00 one way. */
export const makeTransferLeg = async (tracker, { destination = null, oneWayCents = 20_000 } = {}) => {
    const from = tracker.transferPoint(await makeTransferPoint({ kind: 'AIRPORT', destinationId: destination?.id ?? null }));
    const to = tracker.transferPoint(
        await makeTransferPoint({ kind: 'CITY', latitude: 42.4781, longitude: 44.4783, destinationId: destination?.id ?? null })
    );
    const vehicle = tracker.transferVehicle(await makeTransferVehicle({ b2cEnabled: true, status: 'ACTIVE' }));
    tracker.transferProvider({ id: vehicle.providerId });
    const route = tracker.transferRoute(await makeTransferRoute({ fromPointId: from.id, toPointId: to.id }));
    await makeTransferPrice(route.id, vehicle.id, { oneWayCents });

    return { from, to, vehicle, route };
};

/** A day tour with a shared seat option departing on `date`, net 100.00 an adult. */
export const makeTourDeparture = async (tracker, { destination, date, ...overrides }) => {
    const tour = await makeTour(tracker, { destination, ...overrides });
    const option = await makeTourOption(tour, { date });

    return { tour, option };
};

export { makeService };
