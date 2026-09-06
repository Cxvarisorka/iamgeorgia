import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertReplayOwner, idempotencyKeyFrom } from '../lib/idempotency.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../lib/errors.js';

/** A request with a header and an already-validated body. */
const requestWith = ({ header, body } = {}) => ({
    get: (name) => (name.toLowerCase() === 'idempotency-key' ? header : undefined),
    valid: { body: body ?? {} }
});

describe('the idempotency key a request carries', () => {
    it('prefers the header to the body field', () => {
        const req = requestWith({ header: 'header-key-1', body: { idempotencyKey: 'body-key-1' } });

        assert.equal(idempotencyKeyFrom(req), 'header-key-1');
    });

    it('falls back to the body field when there is no header', () => {
        assert.equal(idempotencyKeyFrom(requestWith({ body: { idempotencyKey: 'body-key-1' } })), 'body-key-1');
        assert.equal(idempotencyKeyFrom(requestWith()), undefined);
    });

    // An empty header used to be stored as the key '' — and then every later
    // request with an empty header "replayed" that first booking.
    it('treats a blank header as absent', () => {
        assert.equal(idempotencyKeyFrom(requestWith({ header: '' })), undefined);
        assert.equal(idempotencyKeyFrom(requestWith({ header: '   ' })), undefined);
        assert.equal(idempotencyKeyFrom(requestWith({ header: '  ', body: { idempotencyKey: 'body-key-1' } })), 'body-key-1');
    });

    it('holds the header to the same length rule as the body field', () => {
        assert.throws(() => idempotencyKeyFrom(requestWith({ header: 'short' })), BadRequestError);
        assert.throws(() => idempotencyKeyFrom(requestWith({ header: 'x'.repeat(201) })), BadRequestError);
        assert.equal(idempotencyKeyFrom(requestWith({ header: 'x'.repeat(200) })), 'x'.repeat(200));
        assert.equal(idempotencyKeyFrom(requestWith({ header: '  padded-key  ' })), 'padded-key');
    });
});

describe('guarding a replay', () => {
    it('lets the owner through', () => {
        assert.doesNotThrow(() => assertReplayOwner(() => {}));
    });

    it('answers a key that names somebody else\'s record with a 409 and nothing about it', () => {
        for (const refusal of [new NotFoundError('Booking not found'), new ForbiddenError('Not yours')]) {
            assert.throws(
                () =>
                    assertReplayOwner(() => {
                        throw refusal;
                    }),
                (err) =>
                    err instanceof ConflictError &&
                    err.details?.reason === 'IDEMPOTENCY_KEY_REUSED' &&
                    !err.message.includes('Booking')
            );
        }
    });

    it('leaves a programming error alone', () => {
        assert.throws(
            () =>
                assertReplayOwner(() => {
                    throw new TypeError('cannot read properties of undefined');
                }),
            TypeError
        );
    });
});
