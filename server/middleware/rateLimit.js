import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

import { config } from '../config.js';
import { TooManyRequestsError } from '../lib/errors.js';

// Sending the rejection through next() rather than letting the library write
// its own body keeps every error in the system in the same `{ error: { … } }`
// shape, and gets it logged like any other failed request.
const handler = (message) => (req, res, next) => {
    next(new TooManyRequestsError(message));
};

const base = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false
};

/**
 * Login attempts, counted per IP *and* per account.
 *
 * Per-IP alone lets a botnet spread an attack on one account across many
 * addresses; per-account alone lets one address lock every account it can name.
 * `ipKeyGenerator` normalizes IPv6 to a /64 — an address holder gets a whole
 * range for free otherwise.
 */
export const authLimiter = rateLimit({
    ...base,
    limit: config.auth.loginLimit,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email ?? '').toLowerCase()}`,
    // A correct password should not be punished for earlier typos.
    skipSuccessfulRequests: true,
    handler: handler('Too many sign-in attempts. Try again later.')
});

/** Claiming an invitation. Low, because a legitimate invitee does it once. */
export const registrationLimiter = rateLimit({
    ...base,
    windowMs: 60 * 60 * 1000,
    limit: config.auth.registrationLimit,
    handler: handler('Too many registration attempts. Try again later.')
});

/** Reading an invitation token, and requesting password links. */
export const tokenLookupLimiter = rateLimit({
    ...base,
    limit: config.auth.tokenLookupLimit,
    handler: handler('Too many attempts. Try again later.')
});

/**
 * The blanket per-IP limit applied to every request.
 *
 * Shares the `handler` above deliberately: the library's own rejection is
 * plain text, and a client that expects the `{ error: { … } }` envelope
 * chokes on it while parsing.
 */
export const globalLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: config.globalRateLimit,
    // Uptime monitors poll far more often than a browser would.
    skip: (req) => req.path.startsWith('/health'),
    handler: handler('Too many requests. Try again shortly.')
});
