import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import request from 'supertest';

import { createApp } from '../app.js';
import { disconnect } from '../db/index.js';

const app = createApp();

after(async () => {
    await disconnect();
});

describe('health endpoints', () => {
    it('reports liveness without touching the database', async () => {
        const res = await request(app).get('/health');

        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'ok');
        assert.equal(typeof res.body.uptime, 'number');
    });

    it('reports readiness with the database time', async () => {
        const res = await request(app).get('/health/db');

        // 503 is a legitimate result when Postgres is not running; what must
        // never happen is a 500 from an unhandled rejection.
        assert.ok([200, 503].includes(res.status), `unexpected status ${res.status}`);

        if (res.status === 200) {
            assert.ok(!Number.isNaN(Date.parse(res.body.now)));
        }
    });
});

describe('middleware', () => {
    it('answers unknown routes with a json 404', async () => {
        const res = await request(app).get('/nope');

        assert.equal(res.status, 404);
        assert.match(res.body.error.message, /Cannot GET \/nope/);
    });

    it('hides the express fingerprint and sets helmet headers', async () => {
        const res = await request(app).get('/health');

        assert.equal(res.headers['x-powered-by'], undefined);
        assert.equal(res.headers['x-content-type-options'], 'nosniff');
    });

    it('rejects a body over the size limit', async () => {
        const res = await request(app)
            .post('/health')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ blob: 'x'.repeat(200_000) }));

        assert.equal(res.status, 413);
    });

    it('allows the configured client origin', async () => {
        const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');

        assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000');
    });
});
