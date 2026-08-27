import { BadRequestError } from '../lib/errors.js';

const PARTS = ['body', 'query', 'params'];

/**
 * Validates and normalizes a request against zod schemas.
 *
 * Parsed output lands on `req.valid`, not back on `req.body` / `req.query`,
 * for two reasons. Express 5 exposes `req.query` through a getter that cannot
 * be assigned, so half of it would fail outright; and a separate namespace
 * makes it obvious at a glance whether a handler is reading raw input or
 * checked input — `req.valid.body` cannot be confused with `req.body`.
 *
 * Failures reuse the bridge the Prisma extension already established: the zod
 * issues travel in `HttpError.details`, which the error middleware renders as
 * `error.details`, so a client sees one shape for every validation failure in
 * the system.
 */
export const validate = (schemas) => (req, res, next) => {
    req.valid ??= {};

    for (const part of PARTS) {
        const schema = schemas[part];

        if (!schema) {
            continue;
        }

        const result = schema.safeParse(req[part]);

        if (!result.success) {
            throw new BadRequestError(`Invalid request ${part}`, result.error.issues);
        }

        req.valid[part] = result.data;
    }

    next();
};
