import { BadRequestError, ConflictError, HttpError } from './errors.js';

/**
 * Idempotent confirmation, the parts every product shares.
 *
 * A confirm endpoint answers a retried request with the original record and
 * a 200 rather than making a second one. Two things about that are easy to
 * get wrong, and were:
 *
 *   - The key is client-chosen. A header is not run through the body schema,
 *     so it arrived with no length rule at all, and an empty header was stored
 *     as a real key that every later empty-header request then "replayed".
 *   - A replay is a *read* of the original record, and it was answered before
 *     any access check. Whoever presents the key gets the record — the lead
 *     guest's contact details, passport numbers, the lot. The keys the shipped
 *     client sends are UUIDs, so guessing one is not practical; but an
 *     integrator sending its own order number as the key is one well-meaning
 *     decision away from disclosing bookings to anyone who can count.
 */

const MIN_KEY_LENGTH = 8;
const MAX_KEY_LENGTH = 200;

/**
 * The key a request carries: the `Idempotency-Key` header when it is present
 * and not blank, otherwise the body field the schema has already validated.
 * The header gets the same rule as the body field.
 */
export const idempotencyKeyFrom = (req) => {
    const header = req.get('idempotency-key');
    const fromHeader = typeof header === 'string' ? header.trim() : '';

    if (fromHeader === '') {
        return req.valid?.body?.idempotencyKey;
    }

    if (fromHeader.length < MIN_KEY_LENGTH || fromHeader.length > MAX_KEY_LENGTH) {
        throw new BadRequestError(`Idempotency-Key must be between ${MIN_KEY_LENGTH} and ${MAX_KEY_LENGTH} characters`);
    }

    return fromHeader;
};

/**
 * Guards a replay with the module's own read-access check.
 *
 * `check` is expected to throw the module's usual not-found or forbidden error
 * when the caller could not read the record. That is turned into a 409 that
 * names the key and nothing else: the record exists, it is somebody else's,
 * and the caller learns only that this key is taken. Anything that is not an
 * HttpError is a bug and is left alone.
 */
export const assertReplayOwner = (check) => {
    try {
        check();
    } catch (err) {
        if (err instanceof HttpError) {
            throw new ConflictError('That Idempotency-Key was used by another request', {
                reason: 'IDEMPOTENCY_KEY_REUSED'
            });
        }

        throw err;
    }
};
