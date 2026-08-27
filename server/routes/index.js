import { Router } from 'express';

import { authRoutes } from './auth.routes.js';
import { invitationRoutes } from './invitations.routes.js';
import { adminPartnerRoutes } from './admin.partners.routes.js';
import { partnerRoutes } from './partner.routes.js';
import { destinationRoutes } from './destinations.routes.js';
import { adminDestinationRoutes } from './admin.destinations.routes.js';
import { hotelRoutes } from './hotels.routes.js';
import { hotelSearchRoutes } from './hotels.search.routes.js';
import {
    adminBookingRoutes,
    bookingRoutes,
    partnerBookingRoutes
} from './hotels.bookings.routes.js';
import { adminHotelRoutes } from './admin.hotels.routes.js';
import { amenityRoutes, adminAmenityRoutes } from './amenities.routes.js';
import { adminMediaRoutes } from './admin.media.routes.js';
import { adminPricingRuleRoutes } from './admin.pricingRules.routes.js';
import { partnerHotelRoutes } from './partner.hotels.routes.js';
import { transferRoutes } from './transfers.routes.js';
import {
    adminTransferBookingRoutes,
    partnerTransferBookingRoutes,
    transferBookingRoutes
} from './transfers.bookings.routes.js';
import { adminTransferRoutes } from './admin.transfers.routes.js';

/**
 * Everything under /api. Mounted as one router so app.js keeps saying what the
 * middleware order is rather than accumulating a list of route registrations.
 *
 * The groups differ by who may reach them, and that is enforced on the
 * router itself rather than route by route:
 *   /auth        — public, rate limited
 *   /invitations — public, the token is the credential
 *   /destinations, /hotels, /amenities, /transfers — public catalogue, no credential
 *   /admin/*     — authenticate + requireAdmin, applied to the whole router
 *   /partner/*   — authenticate, with status and role guards per route
 */
export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/invitations', invitationRoutes);
routes.use('/destinations', destinationRoutes);
// Dated search sits above the catalogue router: /api/search answers "what can
// I book", /api/hotels answers "what properties exist".
routes.use('/search', hotelSearchRoutes);
routes.use('/hotels', hotelRoutes);
routes.use('/bookings', bookingRoutes);
// Transfers keep their bookings under their own prefix rather than joining
// /bookings. The two products share no identifier space — a TRF reference is
// not a BKG one — and one endpoint that had to work out which kind of thing it
// was looking at would be a worse endpoint than two that each know.
routes.use('/transfers/bookings', transferBookingRoutes);
routes.use('/transfers', transferRoutes);
routes.use('/amenities', amenityRoutes);
routes.use('/admin/partners', adminPartnerRoutes);
routes.use('/admin/destinations', adminDestinationRoutes);
routes.use('/admin/hotels', adminHotelRoutes);
routes.use('/admin/amenities', adminAmenityRoutes);
routes.use('/admin/media', adminMediaRoutes);
routes.use('/admin/bookings', adminBookingRoutes);
routes.use('/admin/pricing-rules', adminPricingRuleRoutes);
routes.use('/admin/transfers/bookings', adminTransferBookingRoutes);
routes.use('/admin/transfers', adminTransferRoutes);
routes.use('/partner/hotels', partnerHotelRoutes);
routes.use('/partner/bookings', partnerBookingRoutes);
routes.use('/partner/transfers/bookings', partnerTransferBookingRoutes);
routes.use('/partner', partnerRoutes);

export default routes;
