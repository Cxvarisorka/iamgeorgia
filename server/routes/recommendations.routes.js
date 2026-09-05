import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { recommendationQuerySchema } from '../validation/package.js';
import { recommendFor } from '../services/package/recommendation.service.js';
import { toRecommendations } from '../serializers/package.js';

/**
 * "Complete your trip" for a hotel or tour page: transfers to and from the
 * nearest airport, tours during the stay, packages that contain the anchor.
 * Prices are the buyer's own, as everywhere else; nothing here can be booked
 * without going through the product's own quote and checkout.
 */
export const recommendationRoutes = Router();

recommendationRoutes.use(optionalAuthenticate);

recommendationRoutes.get('/', validate({ query: recommendationQuerySchema }), async (req, res) => {
    const { locale } = req.valid.query;
    const recommendations = await recommendFor(req.valid.query, req.user);

    res.json(toRecommendations(recommendations, locale, req.user));
});
