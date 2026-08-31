import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * What happens when Redis is configured but not answering.
 *
 * This is the failure that matters most about having a shared store at all.
 * `globalLimiter` is mounted on every route, so a limiter that throws when its
 * backing store is unreachable does not degrade the API, it *is* the outage —
 * and an earlier version of this middleware did exactly that, answering 500 to
 * every rate-limited request while Redis refused connections. Worse, a command
 * queued against a disconnected client rejected outside the call that made it,
 * which Node treats as fatal, so the process died as well.
 *
 * The behaviour asserted here is therefore deliberate and it is a trade: while
 * the store is unreachable the limits do not apply at all. That cost is real —
 * an unmetered login endpoint is a CPU exhaustion vector, because every attempt
 * pays for a scrypt derivation — and it is the reason a deploy that sets
 * REDIS_URL wants an alert on Redis being down. It is still the better half of
 * the trade: losing the guard rails for the length of an outage beats losing
 * the site for it.
 *
 * Port 6399 is not a Redis anyone runs; the point is that nothing answers.
 * Every import is dynamic because config is read at import time and a static
 * one would be hoisted above these assignments.
 */
process.env.REDIS_URL = 'redis://localhost:6399';
process.env.AUTH_TOKEN_LOOKUP_LIMIT = '2';
process.env.LOG_LEVEL = 'silent';

const request = (await import('supertest')).default;
const { createApp } = await import('../app.js');
const { disconnect } = await import('../db/index.js');
const { disconnectRateLimitStore } = await import('../middleware/rateLimit.js');
const { createToken } = await import('../lib/tokens.js');
const { testEmail, databaseAvailable } = await import('./support/factories.js');

const app = createApp();
const dbAvailable = await databaseAvailable();

// Let the first connection attempt fail, so the limiters are genuinely running
// against an unreachable store rather than in the moment before they notice.
await new Promise((resolve) => setTimeout(resolve, 1500));

describe('rate limiting with an unreachable store', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    after(async () => {
        await disconnectRateLimitStore();
        await disconnect();
    });

    it('keeps serving rather than failing every rate-limited request', async () => {
        assert.equal((await request(app).get('/health')).status, 200);

        // A route behind both the global limiter and the login limiter. The
        // 401 is the endpoint answering; a 500 would be the limiter refusing.
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testEmail('nobody'), password: 'not-the-password' });

        assert.equal(res.status, 401, 'should answer the request, not fail on the store');
    });

    /** The process must survive it, too — see the note above about queued commands. */
    it('does not bring the process down', async () => {
        for (let i = 0; i < 5; i += 1) {
            const res = await request(app).get(`/api/invitations/${createToken()}`);

            assert.equal(res.status, 404, `request ${i + 1} should reach the handler`);
        }
    });

    /**
     * Documents the cost of the trade rather than asserting a limit that is not
     * there: with the store unreachable, requests pass. If this ever starts
     * seeing 429s, the fallback has changed and the comment above needs to
     * change with it.
     */
    it('lets requests past the limit through while the store is down', async () => {
        const over = await request(app).get(`/api/invitations/${createToken()}`);

        assert.notEqual(over.status, 429, 'the limit cannot be enforced without a store');
    });
});
