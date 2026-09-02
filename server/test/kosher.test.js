import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import {
    createTracker,
    databaseAvailable,
    makeAdmin,
    makeAmenity,
    makeDestination,
    makeFileAsset,
    makeHotel,
    makePartner,
    makePartnerUser,
    signIn,
    unique
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

/**
 * Kosher over HTTP.
 *
 * The suite is organised around the one guarantee the feature makes: **there is
 * no request an admin can send that marks a hotel kosher certified except the
 * verify transition.** Several tests here exist only to try, and to fail.
 *
 * The derivation itself is covered exhaustively and without a database in
 * `kosher.unit.test.js`; this file is about the endpoints, the authorization
 * and the state transitions.
 */
describe('kosher', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partnerCookie;
    let destination;

    before(async () => {
        const admin = await makeAdmin(tracker);
        adminCookie = (await signIn(app, admin.email)).cookie;

        const partner = await makePartner(tracker);
        const partnerUser = await makePartnerUser(tracker, partner);
        partnerCookie = (await signIn(app, partnerUser.email)).cookie;

        destination = await makeDestination(tracker, { countryCode: 'GE', timezone: 'Asia/Tbilisi' });
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const asAdmin = (method, path) => request(app)[method](path).set('Cookie', adminCookie);

    /** Tomorrow, next year, and last year, as calendar dates. */
    const plusDays = (days) =>
        new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

    const kosherHotel = async (overrides = {}) => makeHotel(tracker, { destination, ...overrides });

    /** Switches kosher services on and returns the resulting block. */
    const enable = async (hotelId, body = {}) => {
        const response = await asAdmin('put', `/api/admin/hotels/${hotelId}/kosher`).send({
            serviceLevel: 'FULL',
            ...body
        });

        assert.ok([200, 201].includes(response.status), JSON.stringify(response.body));

        return response.body;
    };

    const addCertificate = async (hotelId, body = {}) => {
        const response = await asAdmin('post', `/api/admin/hotels/${hotelId}/kosher/certifications`)
            .send({
                authorityName: 'Chief Rabbinate of Georgia',
                scope: 'PROPERTY',
                expiresOn: plusDays(365),
                ...body
            });

        assert.equal(response.status, 201, JSON.stringify(response.body));

        return response.body;
    };

    const latestCertificate = (kosher) => kosher.certifications[0];

    // --- the switch ------------------------------------------------------

    describe('switching kosher services on', () => {
        it('answers null for a property that does not offer them', async () => {
            const hotel = await kosherHotel();
            const response = await asAdmin('get', `/api/admin/hotels/${hotel.id}/kosher`);

            // 200 with null, not 404: "this property is not kosher" is an
            // answer, and the panel renders its switched-off state from it.
            assert.equal(response.status, 200);
            assert.equal(response.body, null);
        });

        it('creates the record, and the record is the switch', async () => {
            const hotel = await kosherHotel();
            const response = await asAdmin('put', `/api/admin/hotels/${hotel.id}/kosher`).send({
                serviceLevel: 'PARTIAL',
                notes: 'Kosher restaurant on the ground floor.'
            });

            assert.equal(response.status, 201);
            assert.equal(response.body.serviceLevel, 'PARTIAL');
            assert.equal(response.body.offersKosher, true);
            // Declared, not certified. Nothing in that request could have made
            // it otherwise.
            assert.equal(response.body.certified, false);
            assert.equal(response.body.certificationState, 'NONE');
        });

        it('requires an explicit service level', async () => {
            const hotel = await kosherHotel();
            const response = await asAdmin('put', `/api/admin/hotels/${hotel.id}/kosher`).send({
                notes: 'Something kosher-ish'
            });

            assert.equal(response.status, 400);
        });

        it('is a 200 on a second write, not a duplicate', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);

            const again = await asAdmin('put', `/api/admin/hotels/${hotel.id}/kosher`).send({
                serviceLevel: 'KOSHER_FRIENDLY'
            });

            assert.equal(again.status, 200);
            assert.equal(again.body.serviceLevel, 'KOSHER_FRIENDLY');
        });

        it('records NONE without losing the record', async () => {
            const hotel = await kosherHotel();
            const body = await enable(hotel.id, { serviceLevel: 'NONE' });

            assert.equal(body.serviceLevel, 'NONE');
            assert.equal(body.offersKosher, false);
        });

        it('removes the record when nothing is verified', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);

            const removed = await asAdmin('delete', `/api/admin/hotels/${hotel.id}/kosher`);
            assert.equal(removed.status, 204);

            const after = await asAdmin('get', `/api/admin/hotels/${hotel.id}/kosher`);
            assert.equal(after.body, null);
        });

        it('refuses to remove it while a certificate is live', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const kosher = await addCertificate(hotel.id);
            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(kosher).id}/verify`
            ).send({ decision: 'VERIFIED' });

            const removed = await asAdmin('delete', `/api/admin/hotels/${hotel.id}/kosher`);

            // Deleting the profile would cascade the certificate away with it,
            // and a property somebody verified must not go quiet in one click.
            assert.equal(removed.status, 409);
            assert.ok(removed.body.error.details.certifications.length > 0);
        });
    });

    // --- the security posture --------------------------------------------

    describe('who may touch it', () => {
        it('refuses a partner outright', async () => {
            const hotel = await kosherHotel();

            const response = await request(app)
                .put(`/api/admin/hotels/${hotel.id}/kosher`)
                .set('Cookie', partnerCookie)
                .send({ serviceLevel: 'FULL' });

            assert.equal(response.status, 403);
        });

        it('refuses an anonymous caller', async () => {
            const hotel = await kosherHotel();

            const response = await request(app)
                .get(`/api/admin/hotels/${hotel.id}/kosher`)
                .send();

            assert.equal(response.status, 401);
        });

        it('will not let a hotel PATCH reach a kosher field', async () => {
            // The central guarantee, stated as a test. `updateHotelSchema` is
            // strict and has no kosher key, so this is a 400 rather than a
            // field quietly ignored — and there is therefore no combination of
            // ordinary hotel edits that can touch certification.
            const hotel = await kosherHotel();

            for (const body of [
                { serviceLevel: 'FULL' },
                { kosher: { serviceLevel: 'FULL' } },
                { certified: true },
                { kosherCertified: true }
            ]) {
                const response = await asAdmin('patch', `/api/admin/hotels/${hotel.id}`).send(body);

                assert.equal(response.status, 400, `${JSON.stringify(body)} was not refused`);
            }
        });

        it('will not let a kosher profile write carry a verification', async () => {
            const hotel = await kosherHotel();

            const response = await asAdmin('put', `/api/admin/hotels/${hotel.id}/kosher`).send({
                serviceLevel: 'FULL',
                verification: 'VERIFIED'
            });

            assert.equal(response.status, 400);
        });

        it('will not let a certificate be created already verified', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);

            const response = await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications`
            ).send({
                authorityName: 'Self',
                verification: 'VERIFIED',
                verifiedAt: new Date().toISOString()
            });

            assert.equal(response.status, 400);
        });
    });

    // --- certification ----------------------------------------------------

    describe('certification', () => {
        it('needs the record to exist first', async () => {
            const hotel = await kosherHotel();

            const response = await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications`
            ).send({ authorityName: 'Chief Rabbinate of Georgia' });

            assert.equal(response.status, 409);
        });

        it('starts unverified and changes nothing an agency sees', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const kosher = await addCertificate(hotel.id);

            assert.equal(kosher.certified, false);
            assert.equal(kosher.certificationState, 'UNVERIFIED');
        });

        it('makes the property certified once verified, and only then', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id);

            const verified = await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(added).id}/verify`
            ).send({ decision: 'VERIFIED' });

            assert.equal(verified.status, 200);
            assert.equal(verified.body.certified, true);
            assert.equal(verified.body.certificationState, 'VERIFIED');
            assert.ok(verified.body.certification.expiresInDays > 300);
        });

        it('refuses to verify the same certificate twice', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id);
            const certId = latestCertificate(added).id;
            const url = `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}/verify`;

            await asAdmin('post', url).send({ decision: 'VERIFIED' });
            const again = await asAdmin('post', url).send({ decision: 'VERIFIED' });

            assert.equal(again.status, 409);
        });

        it('requires a reason to reject', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id);

            const response = await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(added).id}/verify`
            ).send({ decision: 'REJECTED' });

            assert.equal(response.status, 400);
        });

        it('withdraws verification when a verified fact is edited', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id);
            const certId = latestCertificate(added).id;

            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}/verify`
            ).send({ decision: 'VERIFIED' });

            const edited = await asAdmin(
                'patch',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}`
            ).send({ reference: 'KG-2027-999' });

            // Verification attaches to a set of facts, not to a row id.
            assert.equal(edited.status, 200);
            assert.equal(edited.body.certified, false);
            assert.equal(edited.body.certificationState, 'PENDING_VERIFICATION');
            assert.equal(edited.body.certification.verifiedBy, null);
        });

        it('keeps verification when only a cosmetic field changes', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id);
            const certId = latestCertificate(added).id;

            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}/verify`
            ).send({ decision: 'VERIFIED' });

            const edited = await asAdmin(
                'patch',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}`
            ).send({ name: 'Annual certificate' });

            assert.equal(edited.body.certified, true);
        });

        it('refuses an empty edit rather than silently rewriting the scope', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id, { scope: 'RESTAURANT' });

            const response = await asAdmin(
                'patch',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(added).id}`
            ).send({});

            assert.equal(response.status, 400);
        });

        it('refuses an expiry that lands before the issue date', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);

            const response = await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications`
            ).send({
                authorityName: 'Chief Rabbinate of Georgia',
                issuedOn: plusDays(30),
                expiresOn: plusDays(10)
            });

            assert.equal(response.status, 400);
        });

        it('refuses a PATCH that would cross the dates over on the stored row', async () => {
            // The schema can only compare the two fields it was sent; this is
            // the service checking the merged record.
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id, {
                issuedOn: plusDays(-10),
                expiresOn: plusDays(300)
            });

            const response = await asAdmin(
                'patch',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(added).id}`
            ).send({ expiresOn: plusDays(-20) });

            assert.equal(response.status, 400);
        });

        it('is not certified by an expired certificate, with no job having run', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id, {
                issuedOn: plusDays(-400),
                expiresOn: plusDays(-1)
            });

            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(added).id}/verify`
            ).send({ decision: 'VERIFIED' });

            const read = await asAdmin('get', `/api/admin/hotels/${hotel.id}/kosher`);

            assert.equal(read.body.certified, false);
            assert.equal(read.body.certificationState, 'EXPIRED');
        });

        it('is not certified by a restaurant-only certificate', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id, { serviceLevel: 'PARTIAL' });
            const added = await addCertificate(hotel.id, { scope: 'RESTAURANT' });

            const verified = await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(added).id}/verify`
            ).send({ decision: 'VERIFIED' });

            assert.equal(verified.body.certified, false);
            assert.deepEqual(verified.body.certifiedScopes, ['RESTAURANT']);
            // Still a real certificate, still shown — it simply does not
            // certify the property.
            assert.equal(verified.body.certificationState, 'VERIFIED');
        });

        it('deletes an untouched draft and archives a decided one', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);

            const draft = await addCertificate(hotel.id, { reference: 'DRAFT' });
            const dropped = await asAdmin(
                'delete',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(draft).id}`
            );
            assert.equal(dropped.body.certifications.length, 0);

            const real = await addCertificate(hotel.id, { reference: 'REAL' });
            const certId = latestCertificate(real).id;
            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}/verify`
            ).send({ decision: 'VERIFIED' });

            const archived = await asAdmin(
                'delete',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}`
            );

            // History survives: an admin can still see it, and `certified` is
            // false because an archived certificate certifies nothing.
            assert.equal(archived.body.certifications.length, 1);
            assert.ok(archived.body.certifications[0].archivedAt);
            assert.equal(archived.body.certified, false);
        });

        it('writes an audit row naming the verifier', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id);
            const certId = latestCertificate(added).id;

            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}/verify`
            ).send({ decision: 'VERIFIED', notes: 'Confirmed by phone.' });

            const entries = await prisma.auditLog.findMany({
                where: { action: 'KOSHER_CERTIFICATION_VERIFIED', entityId: certId }
            });

            assert.equal(entries.length, 1);
            assert.equal(entries[0].metadata.decision, 'VERIFIED');
            assert.ok(entries[0].actorEmail.includes('@'));
        });
    });

    // --- documents --------------------------------------------------------

    describe('certificate documents', () => {
        it('attaches a private file and refuses a public one', async () => {
            const hotel = await kosherHotel();
            const publicAsset = await makeFileAsset(tracker);
            const privateAsset = await makeFileAsset(tracker, {
                category: 'KOSHER_CERTIFICATE',
                visibility: 'PRIVATE',
                mimeType: 'application/pdf',
                originalFilename: 'certificate.pdf'
            });

            const refused = await asAdmin('post', `/api/admin/hotels/${hotel.id}/documents`).send({
                fileAssetId: publicAsset.id,
                docType: 'KOSHER_CERTIFICATE'
            });
            assert.equal(refused.status, 400);

            const attached = await asAdmin('post', `/api/admin/hotels/${hotel.id}/documents`).send({
                fileAssetId: privateAsset.id,
                docType: 'KOSHER_CERTIFICATE',
                label: 'Annual certificate'
            });

            assert.equal(attached.status, 201);
            // A document response carries no URL, by design: reaching the bytes
            // is a separate, authorized, audited request for a signed link.
            assert.ok(!('url' in attached.body));
        });

        it('refuses a certificate pointing at another hotel document', async () => {
            const mine = await kosherHotel();
            const theirs = await kosherHotel();
            await enable(mine.id);

            const asset = await makeFileAsset(tracker, {
                category: 'KOSHER_CERTIFICATE',
                visibility: 'PRIVATE'
            });
            const foreign = await asAdmin('post', `/api/admin/hotels/${theirs.id}/documents`).send({
                fileAssetId: asset.id,
                docType: 'KOSHER_CERTIFICATE'
            });

            const response = await asAdmin(
                'post',
                `/api/admin/hotels/${mine.id}/kosher/certifications`
            ).send({
                authorityName: 'Chief Rabbinate of Georgia',
                documentId: foreign.body.id
            });

            assert.equal(response.status, 400);
        });

        it('refuses to detach a document a verified certificate points at', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);

            const asset = await makeFileAsset(tracker, {
                category: 'KOSHER_CERTIFICATE',
                visibility: 'PRIVATE'
            });
            const document = await asAdmin('post', `/api/admin/hotels/${hotel.id}/documents`).send({
                fileAssetId: asset.id,
                docType: 'KOSHER_CERTIFICATE'
            });

            const added = await addCertificate(hotel.id, { documentId: document.body.id });
            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(added).id}/verify`
            ).send({ decision: 'VERIFIED' });

            const removed = await asAdmin(
                'delete',
                `/api/admin/hotels/${hotel.id}/documents/${document.body.id}`
            );

            // The foreign key is SetNull, so this would otherwise succeed and
            // leave a verified certificate with no evidence behind it.
            assert.equal(removed.status, 409);
        });
    });

    // --- what an agency sees ---------------------------------------------

    describe('the public shape', () => {
        it('omits the block entirely for a property with no kosher record', async () => {
            const hotel = await kosherHotel();
            const response = await request(app).get(`/api/hotels/${hotel.slug}`);

            assert.equal(response.status, 200);
            assert.ok(!('kosher' in response.body));
        });

        it('never shows provenance or the lock to a public caller', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);

            const response = await request(app).get(`/api/hotels/${hotel.slug}`);

            assert.equal(response.body.kosher.serviceLevel, 'FULL');
            assert.ok(!('source' in response.body.kosher));
            assert.ok(!('lockedAt' in response.body.kosher));
            assert.ok(!('pendingSupplierData' in response.body.kosher));
        });

        it('shows provenance to an admin', async () => {
            const hotel = await kosherHotel();
            await enable(hotel.id);

            const response = await asAdmin('get', `/api/admin/hotels/${hotel.id}`);

            assert.equal(response.body.kosher.source, 'ADMIN');
            assert.ok(response.body.kosher.lockedAt);
        });

        it('projects the hotel amenities as kosher features', async () => {
            const hotel = await kosherHotel();
            const kosherAmenity = await makeAmenity(tracker, {
                code: unique('shabbatLift'),
                category: 'Shabbat'
            });
            const plainAmenity = await makeAmenity(tracker, { code: unique('wifi') });

            await asAdmin('put', `/api/admin/hotels/${hotel.id}/amenities`).send({
                amenities: [{ amenityId: kosherAmenity.id }, { amenityId: plainAmenity.id }]
            });
            await enable(hotel.id);

            const response = await request(app).get(`/api/hotels/${hotel.slug}`);

            // One store, two views: the facility is in `amenities` like any
            // other and is *projected* into `kosher.features`.
            assert.deepEqual(response.body.kosher.features, [kosherAmenity.code]);
            assert.equal(response.body.amenities.length, 2);
        });

        it('never says certified for a hotel with every kosher facility ticked', async () => {
            const hotel = await kosherHotel();
            const facilities = await Promise.all(
                ['KosherFood', 'Shabbat', 'Religious'].map((category) =>
                    makeAmenity(tracker, { code: unique('feature'), category })
                )
            );

            await asAdmin('put', `/api/admin/hotels/${hotel.id}/amenities`).send({
                amenities: facilities.map((amenity) => ({ amenityId: amenity.id }))
            });
            await enable(hotel.id, { serviceLevel: 'FULL' });

            const response = await request(app).get(`/api/hotels/${hotel.slug}`);

            assert.equal(response.body.kosher.features.length, 3);
            assert.equal(response.body.kosher.certified, false);
        });
    });

    // --- publishing -------------------------------------------------------

    describe('the publish checklist', () => {
        it('asks a FULL property for a verified certificate', async () => {
            const hotel = await kosherHotel({ status: 'DRAFT' });
            await enable(hotel.id, { serviceLevel: 'FULL' });

            const response = await asAdmin('get', `/api/admin/hotels/${hotel.id}`);
            const codes = response.body.publishChecklist.map((item) => item.code);

            assert.ok(codes.includes('kosherCertification'));
        });

        it('clears once a certificate is verified', async () => {
            const hotel = await kosherHotel({ status: 'DRAFT' });
            await enable(hotel.id, { serviceLevel: 'FULL' });
            const added = await addCertificate(hotel.id);
            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${latestCertificate(added).id}/verify`
            ).send({ decision: 'VERIFIED' });

            const response = await asAdmin('get', `/api/admin/hotels/${hotel.id}`);
            const codes = response.body.publishChecklist.map((item) => item.code);

            assert.ok(!codes.includes('kosherCertification'));
        });

        it('never asks it of an ordinary hotel', async () => {
            const hotel = await kosherHotel({ status: 'DRAFT' });

            const response = await asAdmin('get', `/api/admin/hotels/${hotel.id}`);
            const codes = response.body.publishChecklist.map((item) => item.code);

            assert.ok(!codes.includes('kosherCertification'));
        });

        it('never asks it of a kosher-friendly property', async () => {
            // Only PARTIAL and FULL claim something a certificate backs.
            const hotel = await kosherHotel({ status: 'DRAFT' });
            await enable(hotel.id, { serviceLevel: 'KOSHER_FRIENDLY' });

            const response = await asAdmin('get', `/api/admin/hotels/${hotel.id}`);
            const codes = response.body.publishChecklist.map((item) => item.code);

            assert.ok(!codes.includes('kosherCertification'));
        });
    });

    // --- supplier synchronisation ----------------------------------------

    describe('supplier synchronisation', () => {
        it('writes a record nobody has touched, capped at kosher-friendly', async () => {
            const { applySupplierKosherData } = await import('../services/hotel/kosher.service.js');
            const hotel = await kosherHotel();

            const result = await applySupplierKosherData(hotel.id, {
                serviceLevel: 'FULL',
                sourceRef: 'CM-4471'
            });

            assert.equal(result.applied, true);
            // A feed carries a boolean; a boolean is not a certificate. The
            // strongest thing an import may say is that a property accommodates
            // observant guests.
            assert.equal(result.profile.serviceLevel, 'KOSHER_FRIENDLY');
            assert.equal(result.profile.source, 'SUPPLIER');
        });

        it('holds a payload back once staff have written the record', async () => {
            const { applySupplierKosherData } = await import('../services/hotel/kosher.service.js');
            const hotel = await kosherHotel();
            await enable(hotel.id, { serviceLevel: 'PARTIAL' });

            const result = await applySupplierKosherData(hotel.id, {
                serviceLevel: 'ON_REQUEST',
                sourceRef: 'CM-4471'
            });

            assert.equal(result.applied, false);
            assert.equal(result.held, true);

            const stored = await asAdmin('get', `/api/admin/hotels/${hotel.id}/kosher`);

            // Unchanged, and the disagreement is visible rather than lost.
            assert.equal(stored.body.serviceLevel, 'PARTIAL');
            assert.equal(stored.body.pendingSupplierData.serviceLevel, 'ON_REQUEST');
        });

        it('records why it was held', async () => {
            const { applySupplierKosherData } = await import('../services/hotel/kosher.service.js');
            const hotel = await kosherHotel();
            await enable(hotel.id);

            await applySupplierKosherData(hotel.id, { serviceLevel: 'ON_REQUEST' });

            const entries = await prisma.auditLog.findMany({
                where: { action: 'KOSHER_SUPPLIER_UPDATE_HELD', entityId: hotel.id }
            });

            assert.equal(entries.length, 1);
            assert.equal(entries[0].metadata.reason, 'MANUALLY_LOCKED');
        });
    });

    // --- the expiry sweep -------------------------------------------------

    describe('the expiry sweep', () => {
        it('reports a lapsed certificate without changing it', async () => {
            const { sweepExpiringCertifications } = await import('../services/hotel/kosher.service.js');
            const hotel = await kosherHotel();
            await enable(hotel.id);
            const added = await addCertificate(hotel.id, {
                issuedOn: plusDays(-400),
                expiresOn: plusDays(-1)
            });
            const certId = latestCertificate(added).id;

            await asAdmin(
                'post',
                `/api/admin/hotels/${hotel.id}/kosher/certifications/${certId}/verify`
            ).send({ decision: 'VERIFIED' });

            const result = await sweepExpiringCertifications();
            assert.ok(result.notified >= 1);

            const row = await prisma.hotelKosherCertification.findUnique({ where: { id: certId } });

            // The job tells somebody; it does not decide anything. The record is
            // untouched and was already correct before it ran.
            assert.equal(row.verification, 'VERIFIED');
            assert.equal(row.archivedAt, null);

            const notices = await prisma.auditLog.findMany({
                where: { action: 'KOSHER_CERTIFICATION_EXPIRING', entityId: certId }
            });
            assert.ok(notices.length >= 1);
        });
    });
});
