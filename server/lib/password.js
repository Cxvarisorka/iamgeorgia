import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// OWASP's floor for scrypt is N=2^17, r=8, p=1. Node's default maxmem (32 MB)
// is below what those parameters need — 128 * N * r is roughly 134 MB — so it
// has to be raised explicitly or the derivation throws.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 256 * 1024 * 1024;

const derive = (plaintext, salt, params) =>
    scryptAsync(plaintext.normalize('NFKC'), salt, KEY_LENGTH, { ...params, maxmem: MAX_MEMORY });

/**
 * Hashes a password into `$scrypt$N$r$p$salt$key`.
 *
 * The cost parameters travel inside the hash rather than living only in this
 * file, so raising them later still leaves every password already stored
 * verifiable — `needsRehash` then upgrades each one the next time its owner
 * signs in and the plaintext is briefly available again.
 */
export const hashPassword = async (plaintext) => {
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(plaintext, salt, PARAMS);

    return [
        '',
        'scrypt',
        PARAMS.N,
        PARAMS.r,
        PARAMS.p,
        salt.toString('base64url'),
        key.toString('base64url')
    ].join('$');
};

const parse = (encoded) => {
    if (typeof encoded !== 'string') {
        return null;
    }

    const [empty, algorithm, N, r, p, salt, key] = encoded.split('$');

    if (empty !== '' || algorithm !== 'scrypt' || !salt || !key) {
        return null;
    }

    const params = { N: Number(N), r: Number(r), p: Number(p) };

    if (!Object.values(params).every((value) => Number.isInteger(value) && value > 0)) {
        return null;
    }

    return { params, salt: Buffer.from(salt, 'base64url'), key: Buffer.from(key, 'base64url') };
};

/**
 * Verifies a password against a stored hash. Returns false rather than
 * throwing on a malformed hash: a corrupt row must fail the login, not the
 * request, or a single bad record becomes a 500 an attacker can probe for.
 */
export const verifyPassword = async (plaintext, encoded) => {
    const parsed = parse(encoded);

    if (!parsed || typeof plaintext !== 'string') {
        return false;
    }

    const candidate = await derive(plaintext, parsed.salt, parsed.params);

    // timingSafeEqual throws on a length mismatch, which would itself leak the
    // key length, so the lengths are compared first and non-secretly.
    return candidate.length === parsed.key.length && timingSafeEqual(candidate, parsed.key);
};

/** True when a stored hash was made with weaker parameters than we now use. */
export const needsRehash = (encoded) => {
    const parsed = parse(encoded);

    if (!parsed) {
        return true;
    }

    return parsed.params.N < PARAMS.N || parsed.params.r < PARAMS.r || parsed.params.p < PARAMS.p;
};

let dummyHash;

/**
 * A hash of a value nobody knows, verified against when a login names an
 * address that has no account. Without it an unknown email would answer in
 * microseconds and a known one in the time a derivation takes, which turns the
 * login endpoint into a directory of who has an account.
 *
 * Built on first use rather than at import, so the several hundred milliseconds
 * are not spent by every process that imports this module for `hashPassword`.
 */
export const dummyVerify = async (plaintext) => {
    dummyHash ??= await hashPassword(randomBytes(32).toString('base64url'));

    return verifyPassword(plaintext, dummyHash);
};
