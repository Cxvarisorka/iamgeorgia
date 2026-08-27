import { randomBytes, createHash } from 'node:crypto';

import { config } from '../config.js';

// 32 bytes from the CSPRNG. base64url keeps it copy-pasteable and safe in a
// URL path without escaping, which matters because these travel in emails.
const TOKEN_BYTES = 32;

export const createToken = () => randomBytes(TOKEN_BYTES).toString('base64url');

/**
 * The only form of a token that is ever written down.
 *
 * sha256 rather than a password hash on purpose: these are 256 bits of entropy,
 * so there is nothing to brute-force and a slow KDF would only add latency to
 * every link click. The pepper means a stolen database dump alone cannot be
 * turned back into a working link — the attacker would also need the
 * application's environment.
 */
export const hashToken = (token) =>
    createHash('sha256')
        .update(`${token}${config.auth.tokenPepper}`)
        .digest('hex');

export const expiresIn = (ms) => new Date(Date.now() + ms);

export const isExpired = (date) => date.getTime() <= Date.now();
