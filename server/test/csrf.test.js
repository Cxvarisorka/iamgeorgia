import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import request from 'supertest';

import { createApp } from '../app.js';
import { config } from '../config.js';
import { disconnect } from '../db/index.js';
import { TEST_PASSWORD, createTracker, makeAdmin, signIn, databaseAvailable } from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

const FOREIGN = 'https://evil.example.com';
// The case that `SameSite` cannot catch: a sibling subdomain is the same *site*
// as the API, so the browser reports `same-site` and attaches the cookie.
const SIBLING = 'https://evil.iamgeorgia.travel';

/**
 * Cross-origin write protection.
 *
 * The session cookie is `SameSite=Strict`, which already stops a page on
 * another site. What it does not stop is a page on another *origin* of the same
 * site — a sibling subdomain, or an injection into one — and that is what the
 * origin check exists for. Both headers it reads are set by the browser and
 * cannot be overridden by the page making the request.
 */
describe('cross-origin request protection', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    it('refuses a write carrying a foreign Origin', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Origin', FOREIGN)
            .send({ email: 'someone@example.test', password: 'whatever-it-is' });

        assert.equal(res.status, 403);
        assert.match(res.body.error.message, /cross-site/i);
    });

    it('refuses a write the browser itself calls cross-site', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Sec-Fetch-Site', 'cross-site')
            .send({ email: 'someone@example.test', password: 'whatever-it-is' });

        assert.equal(res.status, 403);
    });

    /**
     * The point of the whole middleware. `Sec-Fetch-Site: same-site` is exactly
     * what a sibling subdomain produces, so it must not be trusted on its own —
     * the origin still has to match.
     */
    it('refuses a sibling subdomain even though the browser calls it same-site', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Sec-Fetch-Site', 'same-site')
            .set('Origin', SIBLING)
            .send({ email: 'someone@example.test', password: 'whatever-it-is' });

        assert.equal(res.status, 403);
    });

    it('lets the client app through', async () => {
        const admin = await makeAdmin(tracker);

        const res = await request(app)
            .post('/api/auth/login')
            .set('Origin', config.clientOrigin)
            .set('Sec-Fetch-Site', 'same-site')
            .send({ email: admin.email, password: TEST_PASSWORD });

        assert.equal(res.status, 200);
    });

    /**
     * A request with neither header did not come from a page — curl, a
     * server-side integration, this suite — and has no ambient cookie jar to
     * exploit. The whole rest of the test suite depends on this staying true.
     */
    it('allows a request that carries no browser signal at all', async () => {
        const admin = await makeAdmin(tracker);
        const { status } = await signIn(app, admin.email);

        assert.equal(status, 200);
    });

    it('does not interfere with reads', async () => {
        const res = await request(app).get('/api/destinations').set('Origin', FOREIGN);

        assert.equal(res.status, 200);
    });
});
