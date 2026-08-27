import { createHmac, timingSafeEqual } from 'node:crypto';

import { config } from '../../config.js';

/**
 * Signed links for the local storage driver.
 *
 * The S3 driver gets this from the provider — `getSignedUrl` produces a URL
 * that R2 itself refuses once it expires. The local driver has no such
 * provider, so it signs its own, and the point of doing that rather than just
 * serving the file is that the *semantics* stay identical in development and in
 * tests: a private object is only reachable through a link that carries an
 * expiry and a signature, and the link stops working.
 *
 * The secret is the auth token pepper, which is already required in production
 * and already treated as a secret everywhere else.
 */

const digest = (key, expiresAt) =>
    createHmac('sha256', config.auth.tokenPepper).update(`${key}:${expiresAt}`).digest('base64url');

export const signObjectKey = (key, expiresInSeconds) => {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    return { expiresAt, signature: digest(key, expiresAt) };
};

/**
 * Constant-time verification, and expiry checked *before* the comparison so an
 * expired link is rejected without leaking timing information about the digest.
 */
export const verifyObjectKey = (key, expiresAt, signature) => {
    const expiry = Number(expiresAt);

    if (!Number.isInteger(expiry) || expiry < Math.floor(Date.now() / 1000)) {
        return false;
    }

    if (typeof signature !== 'string') {
        return false;
    }

    const expected = Buffer.from(digest(key, expiry));
    const provided = Buffer.from(signature);

    return expected.length === provided.length && timingSafeEqual(expected, provided);
};
