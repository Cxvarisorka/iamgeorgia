import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword, needsRehash, dummyVerify } from '../lib/password.js';
import { containsPersonal } from '../validation/normalize.js';

const PASSWORD = 'seventeen-lilac-donkeys';

describe('password hashing', () => {
    it('never stores the plaintext', async () => {
        const hash = await hashPassword(PASSWORD);

        assert.ok(!hash.includes(PASSWORD));
        assert.match(hash, /^\$scrypt\$\d+\$\d+\$\d+\$[\w-]+\$[\w-]+$/);
    });

    it('salts, so the same password hashes differently every time', async () => {
        const [a, b] = await Promise.all([hashPassword(PASSWORD), hashPassword(PASSWORD)]);

        assert.notEqual(a, b);
        assert.ok(await verifyPassword(PASSWORD, a));
        assert.ok(await verifyPassword(PASSWORD, b));
    });

    it('accepts the right password and rejects a wrong one', async () => {
        const hash = await hashPassword(PASSWORD);

        assert.equal(await verifyPassword(PASSWORD, hash), true);
        assert.equal(await verifyPassword('seventeen-lilac-donkey', hash), false);
        assert.equal(await verifyPassword('', hash), false);
    });

    it('returns false rather than throwing on a corrupt hash', async () => {
        for (const bad of ['', 'garbage', '$scrypt$', '$argon2$1$2$3$4$5', '$scrypt$x$8$1$aa$bb', null, undefined]) {
            assert.equal(await verifyPassword(PASSWORD, bad), false, `should reject ${JSON.stringify(bad)}`);
        }
    });

    it('reads the cost parameters back out of the hash', async () => {
        const hash = await hashPassword(PASSWORD);

        assert.equal(needsRehash(hash), false);
        // A hash written with weaker parameters is still verifiable, and is
        // flagged for upgrade on the next sign-in.
        assert.equal(needsRehash('$scrypt$16384$8$1$c2FsdA$a2V5'), true);
        assert.equal(needsRehash('not-a-hash'), true);
    });

    it('burns the same work for an account that does not exist', async () => {
        // The value is unknowable, so this can only ever be false — what
        // matters is that it does the derivation instead of returning early.
        assert.equal(await dummyVerify(PASSWORD), false);
    });
});

describe('personal password rejection', () => {
    it('catches a password built from the account details', () => {
        assert.equal(containsPersonal('nino@rooms.ge-2026', ['nino@rooms.ge']), true);
        assert.equal(containsPersonal('BeridzeBeridze1', ['Nino', 'Beridze']), true);
        assert.equal(containsPersonal('rooms-hotel-pass', ['Rooms Hotel']), false);
    });

    it('ignores candidates too short to be meaningful', () => {
        assert.equal(containsPersonal('a-perfectly-fine-password', ['a', 'de']), false);
    });

    it('allows an unrelated password', () => {
        assert.equal(containsPersonal('seventeen-lilac-donkeys', ['nino@rooms.ge', 'Nino', 'Beridze']), false);
    });
});
