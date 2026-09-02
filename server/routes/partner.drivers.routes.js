import { Router } from 'express';

import { authenticate, requireApprovedPartner, requirePartner } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validation/fleet.js';
import { quoteTokenSchema } from '../validation/transfer.js';
import { findDriverForPartner } from '../services/transfer/driver.service.js';
import { availableDriversForQuote } from '../services/transfer/availability.service.js';
import { toAvailableDriver, toDriverPublic } from '../serializers/driver.js';
import { toFleetVehiclePublic } from '../serializers/fleet.js';
import { toRatingPublic } from '../serializers/rating.js';

/**
 * A driver's public profile, for a partner who has met them.
 *
 * Only drivers who have held an accepted assignment on one of the partner's
 * own bookings; everyone else is a 404. The shape is the public one: no
 * phone number here (that lives on the booking, timed to the pick-up), no
 * documents, nothing operational.
 */
export const partnerDriverRoutes = Router();

partnerDriverRoutes.use(authenticate, requirePartner, requireApprovedPartner);

/**
 * Who could take the journey a quote token describes: verified drivers with
 * a car of the booked class that is free across every leg. A POST because
 * the token is long, not because anything is written. The list is advice;
 * the booking call checks again under a lock.
 */
partnerDriverRoutes.post('/available', validate({ body: quoteTokenSchema }), async (req, res) => {
    const { vehicle, legs, windows, drivers } = await availableDriversForQuote(req.valid.body.token, req.user);

    res.json({
        vehicleClass: { id: vehicle.id, slug: vehicle.slug, name: vehicle.name },
        legs: legs.map((leg, index) => ({
            direction: leg.direction,
            pickupAt: leg.pickupAt instanceof Date ? leg.pickupAt.toISOString() : leg.pickupAt,
            windowStart: windows[index].windowStart.toISOString(),
            windowEnd: windows[index].windowEnd.toISOString()
        })),
        drivers: drivers.map(toAvailableDriver)
    });
});

partnerDriverRoutes.get('/:id', validate({ params: idParamSchema }), async (req, res) => {
    const driver = await findDriverForPartner(req.valid.params.id, req.user);

    res.json({
        ...toDriverPublic(driver),
        vehicles: driver.vehicles.map((link) => ({ ...toFleetVehiclePublic(link.fleetVehicle), isPrimary: link.isPrimary })),
        reviews: driver.ratings.map(toRatingPublic)
    });
});
