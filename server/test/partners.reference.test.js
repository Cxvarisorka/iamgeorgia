import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import { nextPartnerReference } from '../lib/reference.js';
import { createTracker, makeAdmin, makePartner, signIn, databaseAvailable } from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

describe('public partner id', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    it('is drawn from the sequence in PTR-000000 form', async () => {
        const reference = await nextPartnerReference(prisma);

        assert.match(reference, /^PTR-\d{6,}$/);
    });

    /**
     * The reason the sequence exists. `SELECT max(reference) + 1` would hand
     * the same number to two registrations that overlapped, and two companies
     * sharing a Partner ID is not something a unique index alone can fix — one
     * of them would simply fail to register.
     */
    it('gives fifty concurrent creations fifty distinct numbers', async () => {
        const references = await Promise.all(Array.from({ length: 50 }, () => nextPartnerReference(prisma)));

        assert.equal(new Set(references).size, 50);
        assert.ok(references.every((reference) => /^PTR-\d{6,}$/.test(reference)));
    });

    it('increases monotonically', async () => {
        const [first, second] = [await nextPartnerReference(prisma), await nextPartnerReference(prisma)];

        assert.ok(Number(second.slice(4)) > Number(first.slice(4)));
    });

    it('is not the database id', async () => {
        const partner = await makePartner(tracker);

        assert.notEqual(partner.reference, partner.id);
        assert.match(partner.reference, /^PTR-\d{6,}$/);
        // cuid, which is what must never appear as a public identifier.
        assert.match(partner.id, /^c[a-z0-9]{20,}$/);
    });

    it('is unique at the database level', async () => {
        const partner = await makePartner(tracker);

        await assert.rejects(
            () => makePartner(tracker, { reference: partner.reference }),
            (err) => err.code === 'P2002'
        );
    });

    it('cannot be changed by an admin edit', async () => {
        const admin = await makeAdmin(tracker);
        const partner = await makePartner(tracker);
        const { cookie } = await signIn(app, admin.email);

        const res = await request(app)
            .patch(`/api/admin/partners/${partner.id}`)
            .set('Cookie', cookie)
            .send({ reference: 'PTR-999999', name: 'Renamed Hotel' });

        assert.equal(res.status, 200);
        assert.equal(res.body.reference, partner.reference);
        assert.equal(res.body.name, 'Renamed Hotel');

        const stored = await prisma.partner.findUnique({ where: { id: partner.id } });

        assert.equal(stored.reference, partner.reference);
    });
});
