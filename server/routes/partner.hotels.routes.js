import { Router } from 'express';

import { authenticate, requireApprovedPartner } from '../middleware/auth.js';
import { hotelScopeFor, requireHotelAccess } from '../middleware/hotelAccess.js';
import { validate } from '../middleware/validate.js';
import { hotelQuerySchema, idParamSchema } from '../validation/hotel.js';
import { calendarQuerySchema, inventoryRangeSchema, rateRangeSchema } from '../validation/inventory.js';
import { roomTypeQuerySchema } from '../validation/roomType.js';
import { ratePlanParamSchema, roomTypeScopedParamSchema } from '../validation/ratePlan.js';
import { findHotelOr404, listHotels } from '../services/hotel/hotel.service.js';
import { listRoomTypes } from '../services/hotel/roomType.service.js';
import { readCalendar, setInventoryRange, setRateRange } from '../services/hotel/inventory.service.js';
import { listBookings } from '../services/hotel/booking.service.js';
import { toHotelDetail, toHotelSummary } from '../serializers/hotel.js';
import { toRoomTypeSummary } from '../serializers/roomType.js';
import { toCalendar } from '../serializers/inventory.js';
import { toBookingSummary } from '../serializers/booking.js';

/**
 * The supplier extranet.
 *
 * Deliberately narrow: a property owner manages the two things that change
 * daily — how many rooms are open and what they cost — and reads everything
 * else. Publishing, archiving, assigning a supplier and editing the commercial
 * model stay with admins, because those are decisions about the platform's
 * relationship with the property rather than about the property.
 *
 * Ownership is enforced by `requireHotelAccess`, which 404s rather than 403s so
 * that ids cannot be walked. The list is scoped in the query itself.
 *
 * These routes reuse the same services the admin panel does. There is no
 * separate supplier code path, which is what stops the two drifting into
 * disagreeing about the same rules.
 */
export const partnerHotelRoutes = Router();

partnerHotelRoutes.use(authenticate, requireApprovedPartner);

partnerHotelRoutes.get('/', validate({ query: hotelQuerySchema }), async (req, res) => {
    const { locale } = req.valid.query;
    const { hotels, ...page } = await listHotels({
        ...req.valid.query,
        ...hotelScopeFor(req.user)
    });

    res.json({ data: hotels.map((hotel) => toHotelSummary(hotel, locale, req.user)), ...page });
});

partnerHotelRoutes.get(
    '/:hotelId',
    requireHotelAccess(),
    validate({ query: hotelQuerySchema }),
    async (req, res) => {
        const hotel = await findHotelOr404(req.hotel.id, { locale: req.valid.query.locale });

        res.json(toHotelDetail(hotel, req.valid.query.locale, req.user));
    }
);

partnerHotelRoutes.get(
    '/:hotelId/room-types',
    requireHotelAccess(),
    validate({ query: roomTypeQuerySchema }),
    async (req, res) => {
        const { locale } = req.valid.query;
        const { roomTypes } = await listRoomTypes(req.hotel.id, req.valid.query);

        res.json({ data: roomTypes.map((roomType) => toRoomTypeSummary(roomType, locale)) });
    }
);

partnerHotelRoutes.get(
    '/:hotelId/room-types/:roomTypeId/inventory/calendar',
    requireHotelAccess(),
    validate({ params: roomTypeScopedParamSchema, query: calendarQuerySchema }),
    async (req, res) => {
        const calendar = await readCalendar(req.hotel.id, req.valid.params.roomTypeId, req.valid.query);

        res.json(toCalendar(calendar, req.user, req.hotel));
    }
);

// The two things a property owner actually changes day to day.
partnerHotelRoutes.put(
    '/:hotelId/room-types/:roomTypeId/inventory',
    requireHotelAccess({ manage: true }),
    validate({ params: roomTypeScopedParamSchema, body: inventoryRangeSchema }),
    async (req, res) => {
        const result = await setInventoryRange(
            req.hotel.id,
            req.valid.params.roomTypeId,
            req.valid.body,
            req.user,
            req
        );

        res.json(result);
    }
);

partnerHotelRoutes.put(
    '/:hotelId/room-types/:roomTypeId/rate-plans/:ratePlanId/rates',
    requireHotelAccess({ manage: true }),
    validate({ params: ratePlanParamSchema, body: rateRangeSchema }),
    async (req, res) => {
        const { roomTypeId, ratePlanId } = req.valid.params;
        const result = await setRateRange(req.hotel.id, roomTypeId, ratePlanId, req.valid.body, req.user, req);

        res.json(result);
    }
);

/** Reservations against this supplier's own property. */
partnerHotelRoutes.get('/:hotelId/bookings', requireHotelAccess(), async (req, res) => {
    const { bookings, ...page } = await listBookings(
        { hotelId: req.hotel.id, page: 1, pageSize: 50 },
        // Read as the platform for this one property: a supplier sees the
        // reservations at its own hotel regardless of which partner booked
        // them, which is the whole point of an extranet arrivals list.
        { role: 'ADMIN' }
    );

    res.json({ data: bookings.map((booking) => toBookingSummary(booking, req.user)), ...page });
});
