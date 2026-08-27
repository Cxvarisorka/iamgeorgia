import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import { publicDestinationQuerySchema, slugParamSchema } from '../validation/destination.js';
import { findDestinationOr404, getDestinationTree } from '../services/hotel/destination.service.js';
import { toDestinationDetail, toDestinationNode } from '../serializers/destination.js';

/**
 * Public destination reads.
 *
 * No authentication: this is catalogue content, the same data the marketing
 * pages render. It is also the only place the destination tree is exposed
 * whole, because a search box needs the whole thing to offer suggestions.
 *
 * Lookup is by slug rather than id — a destination URL is public and quotable,
 * and `findDestinationOr404` accepts either, so a stale id keeps working.
 */
export const destinationRoutes = Router();

destinationRoutes.get('/', validate({ query: publicDestinationQuerySchema }), async (req, res) => {
    const { locale, countryCode, featured } = req.valid.query;
    const roots = await getDestinationTree({ locale, countryCode, featured });

    res.json({ data: roots.map((root) => toDestinationNode(root, locale)) });
});

destinationRoutes.get(
    '/:slug',
    validate({ params: slugParamSchema, query: publicDestinationQuerySchema }),
    async (req, res) => {
        const destination = await findDestinationOr404(req.valid.params.slug, {
            locale: req.valid.query.locale
        });

        res.json(toDestinationDetail(destination, req.valid.query.locale));
    }
);
