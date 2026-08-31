import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The forgot-password limiters, in a process of their own.
 *
 * They cannot live in ratelimit.test.js: that file lowers the per-IP token
 * lookup limit to four so it can test the invitation path, and the same limiter
 * also guards this endpoint — so by the time these ran, every request from this
 * address was already being refused for an unrelated reason. The runner gives
 * each file its own process, which is what makes two sets of limits possible.
 *
 * Every import is dynamic for the same reason as in ratelimit.test.js: config
 * is read at import time, and a static import would be hoisted above these
 * assignments.
 */
process.env.AUTH_TOKEN_LOOKUP_LIMIT = '100';
process.env.AUTH_FORGOT_PASSWORD_LIMIT = '3';

const request = (await import('supertest')).default;
const { createApp } = await import('../app.js');
const { disconnect } = await import('../db/index.js');
const { testEmail, databaseAvailable } = await import('./support/factories.js');

const app = createApp();
const dbAvailable = await databaseAvailable();

describe('password reset limits', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    after(async () => {
        await disconnect();
    });

    /**
     * Capping only per IP lets a client that rotates addresses mail a victim a
     * reset link every few seconds. This counter follows the address typed in.
     */
    it('caps reset links per mailbox, not only per address', async () => {
        const victim = testEmail('victim');
        const bystander = testEmail('bystander');

        const ask = (email) => request(app).post('/api/auth/password/forgot').send({ email });

        for (let i = 0; i < 3; i += 1) {
            assert.equal((await ask(victim)).status, 204, `request ${i + 1}`);
        }

        assert.equal((await ask(victim)).status, 429);
        assert.equal((await ask(bystander)).status, 204, 'a different mailbox is unaffected');
    });

    /** Casing and stray spaces must not open a second bucket for one mailbox. */
    it('does not let a change of casing reset the mailbox counter', async () => {
        const victim = testEmail('mixed');
        const ask = (email) => request(app).post('/api/auth/password/forgot').send({ email });

        for (let i = 0; i < 3; i += 1) {
            await ask(victim);
        }

        assert.equal((await ask(`  ${victim.toUpperCase()}  `)).status, 429);
    });
});
