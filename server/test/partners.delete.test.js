import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import {
    createTracker,
    makeAdmin,
    makePartner,
    makePartnerUser,
    makeFinancial,
    makeInvitation,
    signIn,
    databaseAvailable
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

describe('deleting a partner', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    /** A partner with everything hanging off it, so the cascade is observable. */
    const scenario = async (status = 'REJECTED') => {
        const admin = await makeAdmin(tracker);
        const partner = await makePartner(tracker, { status });
        const owner = await makePartnerUser(tracker, partner);

        await makeFinancial(partner);
        const { invitation } = await makeInvitation({ email: owner.email, partnerId: partner.id });
        const { cookie } = await signIn(app, admin.email);

        return { admin, partner, owner, invitation, cookie };
    };

    const del = (id, cookie, confirm) =>
        request(app).delete(`/api/admin/partners/${id}`).set('Cookie', cookie).send({ confirm });

    // --- Authorization ------------------------------------------------------

    it('refuses an unauthenticated caller', async () => {
        const { partner } = await scenario();

        const res = await request(app)
            .delete(`/api/admin/partners/${partner.id}`)
            .send({ confirm: partner.reference });

        assert.equal(res.status, 401);
        assert.equal(await prisma.partner.count({ where: { id: partner.id } }), 1);
    });

    it('refuses a partner trying to delete itself', async () => {
        const { partner, owner } = await scenario('APPROVED');
        const { cookie } = await signIn(app, owner.email);

        const res = await del(partner.id, cookie, partner.reference);

        assert.equal(res.status, 403);
        assert.equal(await prisma.partner.count({ where: { id: partner.id } }), 1);
    });

    it('refuses a partner trying to delete another partner', async () => {
        const { owner } = await scenario('APPROVED');
        const target = await makePartner(tracker, { status: 'APPROVED' });
        const { cookie } = await signIn(app, owner.email);

        assert.equal((await del(target.id, cookie, target.reference)).status, 403);
        assert.equal(await prisma.partner.count({ where: { id: target.id } }), 1);
    });

    // --- The confirmation guard ---------------------------------------------

    /**
     * The reason the endpoint takes a body at all. A DELETE that names the
     * wrong record has to fail rather than destroy it.
     */
    it('refuses a confirmation that does not match the Partner ID', async () => {
        const { partner, cookie } = await scenario();

        const res = await del(partner.id, cookie, 'PTR-000000');

        assert.equal(res.status, 400);
        assert.equal(res.body.error.details.expected, partner.reference);
        assert.equal(await prisma.partner.count({ where: { id: partner.id } }), 1);
    });

    it('refuses a missing confirmation', async () => {
        const { partner, cookie } = await scenario();

        const res = await request(app)
            .delete(`/api/admin/partners/${partner.id}`)
            .set('Cookie', cookie)
            .send({});

        assert.equal(res.status, 400);
        assert.equal(await prisma.partner.count({ where: { id: partner.id } }), 1);
    });

    it('accepts the reference in any casing, with surrounding space', async () => {
        const { partner, cookie } = await scenario();

        assert.equal((await del(partner.id, cookie, `  ${partner.reference.toLowerCase()} `)).status, 200);
        assert.equal(await prisma.partner.count({ where: { id: partner.id } }), 0);
    });

    it('answers 404 for a partner that does not exist', async () => {
        const admin = await makeAdmin(tracker);
        const { cookie } = await signIn(app, admin.email);

        assert.equal((await del('cmnotarealpartneridatall', cookie, 'PTR-000001')).status, 404);
    });

    // --- The cascade ---------------------------------------------------------

    it('removes the company and everything that belonged only to it', async () => {
        const { partner, owner, invitation, cookie } = await scenario();

        const res = await del(partner.id, cookie, partner.reference);

        assert.equal(res.status, 200);
        assert.equal(res.body.deleted, true);
        assert.equal(res.body.reference, partner.reference);

        assert.equal(await prisma.partner.count({ where: { id: partner.id } }), 0);
        assert.equal(await prisma.user.count({ where: { id: owner.id } }), 0);
        assert.equal(await prisma.partnerFinancialDetail.count({ where: { partnerId: partner.id } }), 0);
        assert.equal(await prisma.invitation.count({ where: { id: invitation.id } }), 0);
    });

    it('ends the sessions of everyone who worked for it', async () => {
        const { partner, owner, cookie } = await scenario('APPROVED');
        const ownerSession = (await signIn(app, owner.email)).cookie;

        assert.equal((await request(app).get('/api/partner/me').set('Cookie', ownerSession)).status, 200);

        await del(partner.id, cookie, partner.reference);

        // The session row went with the user row.
        assert.equal((await request(app).get('/api/partner/me').set('Cookie', ownerSession)).status, 401);
        assert.equal(await prisma.session.count({ where: { userId: owner.id } }), 0);
    });

    it('leaves the deleted owner free to be invited again', async () => {
        const { partner, owner, cookie } = await scenario();

        await del(partner.id, cookie, partner.reference);

        assert.equal(await prisma.user.count({ where: { email: owner.email } }), 0);
    });

    // --- What survives -------------------------------------------------------

    /**
     * The point of an audit trail that is not foreign-keyed to its subject.
     */
    it('keeps the record of who deleted it, and what was removed', async () => {
        const { admin, partner, owner, cookie } = await scenario();

        await del(partner.id, cookie, partner.reference);

        const entries = await prisma.auditLog.findMany({ where: { entityId: partner.id } });
        const deletion = entries.find((entry) => entry.action === 'PARTNER_DELETED');

        assert.ok(deletion, 'the deletion itself is recorded');
        assert.equal(deletion.actorUserId, admin.id);
        assert.equal(deletion.actorEmail, admin.email);
        assert.equal(deletion.metadata.reference, partner.reference);
        assert.equal(deletion.metadata.name, partner.name);
        assert.equal(deletion.metadata.status, 'REJECTED');
        assert.deepEqual(deletion.metadata.accountsRemoved, [owner.email]);

        await prisma.auditLog.deleteMany({ where: { entityId: partner.id } });
    });

    it('does not reissue the Partner ID it freed', async () => {
        const { partner, cookie } = await scenario();

        await del(partner.id, cookie, partner.reference);

        const next = await makePartner(tracker);

        assert.notEqual(next.reference, partner.reference);
        assert.ok(Number(next.reference.slice(4)) > Number(partner.reference.slice(4)));

        await prisma.auditLog.deleteMany({ where: { entityId: partner.id } });
    });

    it('writes no audit row when the delete is refused', async () => {
        const { partner, cookie } = await scenario();

        await del(partner.id, cookie, 'PTR-999999');

        assert.equal(
            await prisma.auditLog.count({ where: { entityId: partner.id, action: 'PARTNER_DELETED' } }),
            0,
        );
    });
});
