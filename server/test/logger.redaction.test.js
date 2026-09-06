import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import request from 'supertest';

import { REDACTED_PATHS } from '../lib/logger.js';

/**
 * Nothing that grants access may reach a log line.
 *
 * The incoming cookie was always redacted. The outgoing `Set-Cookie` was not,
 * and pino-http's default response serializer copies every response header
 * into the record — so each login wrote the freshly minted session token to
 * the log in plaintext. This runs a request through the same middleware with
 * the same redaction list the app uses and reads what was written.
 */
describe('log redaction', () => {
    const capture = () => {
        const lines = [];
        const logger = pino({ level: 'info', redact: REDACTED_PATHS }, { write: (line) => lines.push(line) });

        return { logger, text: () => lines.join('\n') };
    };

    it('redacts the session cookie a response sets', async () => {
        const { logger, text } = capture();
        const app = express();

        app.use(pinoHttp({ logger }));
        app.post('/login', (req, res) => {
            res.cookie('iag_session', 'SUPER-SECRET-SESSION-TOKEN', { httpOnly: true });
            res.status(204).end();
        });

        await request(app).post('/login').expect(204);

        const written = text();

        assert.ok(written.includes('request completed'), 'the request was logged');
        assert.ok(!written.includes('SUPER-SECRET-SESSION-TOKEN'), 'the token must not appear');
        assert.ok(written.includes('"set-cookie":"[Redacted]"'), 'the header is redacted, not dropped');
    });

    it('still redacts what a request carries', async () => {
        const { logger, text } = capture();
        const app = express();

        app.use(pinoHttp({ logger }));
        app.get('/me', (req, res) => res.status(204).end());

        await request(app)
            .get('/me')
            .set('Cookie', 'iag_session=INCOMING-SECRET')
            .set('Authorization', 'Bearer BEARER-SECRET')
            .set('X-Api-Key', 'API-KEY-SECRET')
            .expect(204);

        const written = text();

        assert.ok(!written.includes('INCOMING-SECRET'));
        assert.ok(!written.includes('BEARER-SECRET'));
        assert.ok(!written.includes('API-KEY-SECRET'));
    });
});
