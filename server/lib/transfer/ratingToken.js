import { createHmac, timingSafeEqual } from 'node:crypto';

import { config } from '../../config.js';
import { BadRequestError, GoneError } from '../errors.js';

/**
 * Signed rating links.
 *
 * Emailed to the lead passenger after a completed leg. The token names the
 * leg and the address it was sent to, and expires with the rating window; a
 * link forwarded to somebody else still rates only that leg, once, and the
 * service checks the address against the booking before it counts.
 *
 * Its own secret, like the quote token, so it can be rotated on its own.
 */

const sign = (payload) =>
    createHmac('sha256', config.transfer.dispatch.ratingTokenSecret).update(payload).digest('base64url');

export const issueRatingToken = ({ legId, email }) => {
    const payload = Buffer.from(
        JSON.stringify({ l: legId, e: email.toLowerCase(), iat: Date.now() })
    ).toString('base64url');

    return `${payload}.${sign(payload)}`;
};

export const readRatingToken = (token) => {
    const [payload, signature] = String(token).split('.');

    if (!payload || !signature) {
        throw new BadRequestError('That rating link is not valid');
    }

    const expected = sign(payload);

    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        throw new BadRequestError('That rating link is not valid');
    }

    let decoded;

    try {
        decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
        throw new BadRequestError('That rating link is not valid');
    }

    const ttlMs = config.transfer.dispatch.ratingWindowDays * 86_400_000;

    if (typeof decoded.iat !== 'number' || Date.now() - decoded.iat > ttlMs) {
        throw new GoneError('That rating link has expired');
    }

    return { legId: decoded.l, email: decoded.e };
};
