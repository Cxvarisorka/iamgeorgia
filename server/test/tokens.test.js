import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import { createToken, hashToken, expiresIn, isExpired } from '../lib/tokens.js';
import { isPartnerReference, isHotelBookingReference, isReference } from '../lib/reference.js';
import { prisma, disconnect } from '../db/index.js';
import { createTracker, makeInvitation, databaseAvailable } from './support/factories.js';

const dbAvailable = await databaseAvailable();

describe('token generation', () => {
    it('produces 32 bytes of URL-safe randomness', () => {
        const token = createToken();

        assert.equal(Buffer.from(token, 'base64url').length, 32);
        assert.match(token, /^[A-Za-z0-9_-]+$/);
        assert.equal(encodeURIComponent(token), token, 'must survive a URL path unescaped');
    });

    it('does not repeat', () => {
        const tokens = new Set(Array.from({ length: 500 }, createToken));

        assert.equal(tokens.size, 500);
    });

    it('hashes deterministically, and differently for different tokens', () => {
        const token = createToken();

        assert.equal(hashToken(token), hashToken(token));
        assert.notEqual(hashToken(token), hashToken(createToken()));
        assert.match(hashToken(token), /^[a-f0-9]{64}$/);
    });

    it('does not embed the token in its own hash', () => {
        const token = createToken();

        assert.ok(!hashToken(token).includes(token));
    });

    it('computes expiry both ways round', () => {
        assert.equal(isExpired(expiresIn(60_000)), false);
        assert.equal(isExpired(expiresIn(-1)), true);
    });
});

describe('public reference format', () => {
    it('recognises a well-formed public id', () => {
        assert.equal(isPartnerReference('PTR-000001'), true);
        assert.equal(isPartnerReference('PTR-123456'), true);
        assert.equal(isPartnerReference('PTR-1'), false);
        assert.equal(isPartnerReference('cmsyjpf8d0000cgusdcambnkr'), false);
    });

    it('keeps counting once the sequence outgrows its padding', () => {
        assert.equal(isPartnerReference('PTR-1234567'), true);
    });

    it('rejects anything that is not digits after the prefix', () => {
        assert.equal(isPartnerReference('PTR-abcdef'), false);
        assert.equal(isPartnerReference('PTR-00000a'), false);
        assert.equal(isPartnerReference('ptr-000001'), false);
        assert.equal(isPartnerReference('PTR-'), false);
        assert.equal(isPartnerReference(undefined), false);
        assert.equal(isPartnerReference(123456), false);
    });

    it('recognises a booking reference and keeps the two kinds apart', () => {
        assert.equal(isHotelBookingReference('BKG-000042'), true);
        // A booking reference and a partner id must never be interchangeable:
        // both are quoted over the phone and they address different records.
        assert.equal(isHotelBookingReference('PTR-000001'), false);
        assert.equal(isPartnerReference('BKG-000042'), false);
    });

    it('refuses an unknown reference kind rather than answering false', () => {
        // Silently returning false would let a typo'd kind pass validation
        // everywhere instead of failing once, loudly, at the call site.
        assert.throws(() => isReference('PTR-000001', 'nope'), /Unknown reference kind/);
    });
});

describe('token storage', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    it('writes only the hash, never the token itself', async () => {
        const { token, invitation } = await makeInvitation();

        const stored = await prisma.invitation.findUnique({ where: { id: invitation.id } });

        assert.notEqual(stored.tokenHash, token);
        assert.equal(stored.tokenHash, hashToken(token));

        // The whole row, serialized, must not contain the plaintext anywhere.
        assert.ok(!JSON.stringify(stored).includes(token));
    });

    it('cannot be found by the token, only by its hash', async () => {
        const { token } = await makeInvitation();

        const byToken = await prisma.invitation.findUnique({ where: { tokenHash: token } });
        const byHash = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) } });

        assert.equal(byToken, null);
        assert.ok(byHash);
    });
});
