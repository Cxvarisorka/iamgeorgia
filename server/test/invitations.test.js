import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import { createToken, hashToken } from '../lib/tokens.js';
import { outbox, clearOutbox } from '../lib/mailer/index.js';
import {
    createTracker,
    makeAdmin,
    makePartner,
    makePartnerUser,
    makeInvitation,
    adminCreatePayload,
    registrationPayload,
    signIn,
    testEmail,
    databaseAvailable
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

describe('issuing invitations', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const asAdmin = async () => {
        const admin = await makeAdmin(tracker);

        return { admin, cookie: (await signIn(app, admin.email)).cookie };
    };

    it('drafts a partner, emails a link, and returns it', async () => {
        clearOutbox();
        const { cookie } = await asAdmin();
        const email = testEmail('invitee');

        const res = await request(app)
            .post('/api/admin/partners')
            .set('Cookie', cookie)
            .send(adminCreatePayload('invite', email));

        assert.equal(res.status, 201);
        assert.equal(res.body.partner.status, 'INVITED');
        assert.match(res.body.partner.reference, /^PTR-\d{6,}$/);
        assert.equal(res.body.link.kind, 'invitation');
        assert.match(res.body.link.url, /\/partners\/register\//);
        assert.equal(res.body.emailSent, true);

        tracker.partner(res.body.partner);

        assert.equal(outbox.at(-1).to, email);
        assert.equal(outbox.at(-1).template, 'partnerInvitation');
    });

    it('creates no user account for an invitation nobody has accepted', async () => {
        const { cookie } = await asAdmin();
        const email = testEmail('invitee');

        const res = await request(app)
            .post('/api/admin/partners')
            .set('Cookie', cookie)
            .send(adminCreatePayload('invite', email));

        tracker.partner(res.body.partner);

        // An account with no password, for someone who may never register,
        // would occupy their email address for nothing.
        assert.equal(await prisma.user.count({ where: { email } }), 0);
        assert.equal(res.body.partner.contact, null);
    });

    it('refuses an unauthenticated caller', async () => {
        const res = await request(app).post('/api/admin/partners').send(adminCreatePayload('invite', testEmail()));

        assert.equal(res.status, 401);
    });

    it('refuses a partner user trying to invite', async () => {
        const partner = await makePartner(tracker);
        const user = await makePartnerUser(tracker, partner);
        const { cookie } = await signIn(app, user.email);

        const res = await request(app)
            .post('/api/admin/partners')
            .set('Cookie', cookie)
            .send(adminCreatePayload('invite', testEmail()));

        assert.equal(res.status, 403);
        assert.equal(res.body.error.message, 'Insufficient permissions');
    });
});

describe('resolving an invitation', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    it('returns the invited address and the drafted company', async () => {
        const partner = await makePartner(tracker, { status: 'INVITED' });
        const email = testEmail('invitee');
        const { token } = await makeInvitation({ email, partnerId: partner.id, prefill: { contact: { firstName: 'Giorgi' } } });

        const res = await request(app).get(`/api/invitations/${token}`);

        assert.equal(res.status, 200);
        assert.equal(res.body.email, email);
        assert.equal(res.body.company.name, partner.name);
        assert.equal(res.body.prefill.contact.firstName, 'Giorgi');
    });

    /** Holding a link is not authorization to read the partner record. */
    it('does not leak the partner id or status', async () => {
        const partner = await makePartner(tracker, { status: 'INVITED', notes: 'internal only' });
        const { token } = await makeInvitation({ partnerId: partner.id });

        const res = await request(app).get(`/api/invitations/${token}`);

        const serialized = JSON.stringify(res.body);

        assert.ok(!serialized.includes(partner.id));
        assert.ok(!serialized.includes('internal only'));
        assert.equal(res.body.status, undefined);
    });

    it('moves a drafted partner to REGISTRATION_IN_PROGRESS on first view', async () => {
        const partner = await makePartner(tracker, { status: 'INVITED' });
        const { token } = await makeInvitation({ partnerId: partner.id });

        await request(app).get(`/api/invitations/${token}`);

        const after1 = await prisma.partner.findUnique({ where: { id: partner.id } });

        assert.equal(after1.status, 'REGISTRATION_IN_PROGRESS');

        // Idempotent: viewing again does not move it anywhere else.
        await request(app).get(`/api/invitations/${token}`);

        const after2 = await prisma.partner.findUnique({ where: { id: partner.id } });

        assert.equal(after2.status, 'REGISTRATION_IN_PROGRESS');
    });

    it('rejects an unknown token with 404', async () => {
        const res = await request(app).get(`/api/invitations/${createToken()}`);

        assert.equal(res.status, 404);
    });

    it('rejects an expired invitation with 410 and offers a new one', async () => {
        const { token } = await makeInvitation({ expiresAt: new Date(Date.now() - 1000) });

        const res = await request(app).get(`/api/invitations/${token}`);

        assert.equal(res.status, 410);
        assert.match(res.body.error.message, /expired/i);
        assert.equal(res.body.error.details.canRequestNew, true);
    });

    it('rejects a withdrawn invitation with 410', async () => {
        const { token } = await makeInvitation({ revokedAt: new Date() });

        const res = await request(app).get(`/api/invitations/${token}`);

        assert.equal(res.status, 410);
        assert.match(res.body.error.message, /withdrawn/i);
    });

    it('rejects an already-used invitation with 409', async () => {
        const { token } = await makeInvitation({ acceptedAt: new Date() });

        const res = await request(app).get(`/api/invitations/${token}`);

        assert.equal(res.status, 409);
        assert.match(res.body.error.message, /already been used/i);
    });
});

describe('reissuing an invitation', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const asAdmin = async () => {
        const admin = await makeAdmin(tracker);

        return { admin, cookie: (await signIn(app, admin.email)).cookie };
    };

    /**
     * The important half of resending: the old link has to die. Two live links
     * for one invitation means the admin cannot know which one was used.
     */
    it('kills the previous link when it issues a new one', async () => {
        const { admin, cookie } = await asAdmin();
        const partner = await makePartner(tracker, { status: 'INVITED' });
        const email = testEmail('invitee');
        const { token: oldToken } = await makeInvitation({ email, partnerId: partner.id, invitedByUserId: admin.id });

        assert.equal((await request(app).get(`/api/invitations/${oldToken}`)).status, 200);

        clearOutbox();
        const res = await request(app).post(`/api/admin/partners/${partner.id}/invitations`).set('Cookie', cookie);

        assert.equal(res.status, 201);
        assert.equal(res.body.email, email);
        assert.equal(res.body.emailSent, true);
        assert.equal(outbox.at(-1).template, 'invitationReissued');

        const old = await request(app).get(`/api/invitations/${oldToken}`);

        assert.equal(old.status, 410);
        assert.match(old.body.error.message, /withdrawn/i);

        const newToken = res.body.link.url.split('/').at(-1);

        assert.equal((await request(app).get(`/api/invitations/${newToken}`)).status, 200);
    });

    it('carries the expiry forward and counts the resend', async () => {
        const { admin, cookie } = await asAdmin();
        const partner = await makePartner(tracker, { status: 'INVITED' });
        await makeInvitation({ partnerId: partner.id, invitedByUserId: admin.id, expiresAt: new Date(Date.now() - 1000) });

        const res = await request(app).post(`/api/admin/partners/${partner.id}/invitations`).set('Cookie', cookie);

        assert.equal(res.status, 201);
        assert.ok(new Date(res.body.link.expiresAt) > new Date());

        const latest = await prisma.invitation.findFirst({
            where: { partnerId: partner.id },
            orderBy: { createdAt: 'desc' }
        });

        assert.equal(latest.resentCount, 1);
    });

    it('refuses to re-invite a partner that already finished registering', async () => {
        const { cookie } = await asAdmin();
        const partner = await makePartner(tracker, { status: 'APPROVED' });

        const res = await request(app).post(`/api/admin/partners/${partner.id}/invitations`).set('Cookie', cookie);

        assert.equal(res.status, 409);
    });

    it('lists invitations with their computed status', async () => {
        const { admin, cookie } = await asAdmin();
        const partner = await makePartner(tracker, { status: 'INVITED' });

        await makeInvitation({ partnerId: partner.id, invitedByUserId: admin.id, expiresAt: new Date(Date.now() - 1000) });
        await makeInvitation({ partnerId: partner.id, invitedByUserId: admin.id, revokedAt: new Date() });
        await makeInvitation({ partnerId: partner.id, invitedByUserId: admin.id });

        const res = await request(app).get(`/api/admin/partners/${partner.id}/invitations`).set('Cookie', cookie);

        assert.equal(res.status, 200);

        const statuses = res.body.data.map((row) => row.status).sort();

        assert.deepEqual(statuses, ['EXPIRED', 'PENDING', 'REVOKED']);
        // The token must not come back out of the API in any form.
        assert.ok(!JSON.stringify(res.body).includes('tokenHash'));
    });
});

describe('claiming an invitation', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    /**
     * The invitation names one address. A forwarded email must not let whoever
     * received it register in the invitee's place.
     */
    it('refuses a different email address with 403', async () => {
        const invited = testEmail('invited');
        const { token } = await makeInvitation({ email: invited });

        const res = await request(app)
            .post(`/api/invitations/${token}/accept`)
            .send(registrationPayload(testEmail('someone-else')));

        assert.equal(res.status, 403);
        assert.equal(res.body.error.details.invitedEmail, invited);

        const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) } });

        assert.equal(invitation.acceptedAt, null, 'a refused claim must not spend the invitation');
    });

    it('matches the address case-insensitively', async () => {
        const invited = testEmail('invited');
        const { token } = await makeInvitation({ email: invited });

        const res = await request(app)
            .post(`/api/invitations/${token}/accept`)
            .send(registrationPayload(invited.toUpperCase()));

        assert.equal(res.status, 201);
        tracker.partner({ id: (await prisma.partner.findUnique({ where: { reference: res.body.reference } })).id });
    });

    it('cannot be claimed twice', async () => {
        const invited = testEmail('invited');
        const { token } = await makeInvitation({ email: invited });
        const payload = registrationPayload(invited);

        const first = await request(app).post(`/api/invitations/${token}/accept`).send(payload);

        assert.equal(first.status, 201);
        tracker.partner({ id: (await prisma.partner.findUnique({ where: { reference: first.body.reference } })).id });

        const second = await request(app)
            .post(`/api/invitations/${token}/accept`)
            .send(registrationPayload(invited));

        assert.equal(second.status, 409);
        assert.equal(await prisma.user.count({ where: { email: invited } }), 1, 'the replay must create nothing');
    });

    it('cannot be claimed after expiry', async () => {
        const invited = testEmail('invited');
        const { token } = await makeInvitation({ email: invited, expiresAt: new Date(Date.now() - 1000) });

        const res = await request(app).post(`/api/invitations/${token}/accept`).send(registrationPayload(invited));

        assert.equal(res.status, 410);
        assert.equal(await prisma.user.count({ where: { email: invited } }), 0);
    });

    it('cannot be claimed after being withdrawn', async () => {
        const invited = testEmail('invited');
        const { token } = await makeInvitation({ email: invited, revokedAt: new Date() });

        const res = await request(app).post(`/api/invitations/${token}/accept`).send(registrationPayload(invited));

        assert.equal(res.status, 410);
        assert.equal(await prisma.user.count({ where: { email: invited } }), 0);
    });
});
