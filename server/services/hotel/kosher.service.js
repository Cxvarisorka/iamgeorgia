import { prisma } from '../../db/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { dateOnlyToUtc, todayInTimezone, toDateOnly } from '../../lib/time.js';
import { KOSHER_AMENITY_CATEGORIES } from '../../db/seed/kosherAmenities.js';

/**
 * Kosher.
 *
 * Three kinds of claim, and the file is organised around keeping them apart:
 *
 *   1. **Facilities** are amenities. Nothing in this file stores one — a hotel's
 *      kosher features are read straight off `hotel_amenities` and projected in
 *      the serializer, so there is exactly one place a facility lives.
 *   2. **Scope of service** is `HotelKosherProfile.serviceLevel`, declared by
 *      staff, and says nothing about assurance.
 *   3. **Assurance** is a certificate, and is the only thing that may ever
 *      produce the word "certified".
 *
 * The derivation half of this file is deliberately pure — no Prisma, no clock
 * beyond an explicit `today` argument — because the guarantee it makes is one
 * worth being able to test exhaustively without a database.
 */

// ---------------------------------------------------------------------------
// Derivation. Pure functions; every caller passes today in explicitly.
// ---------------------------------------------------------------------------

/** Weakest first, so a position in this list is an ordering. */
export const SERVICE_LEVEL_ORDER = ['NONE', 'ON_REQUEST', 'KOSHER_FRIENDLY', 'PARTIAL', 'FULL'];

/**
 * The scopes that certify the *property*.
 *
 * A restaurant certificate is a real certificate and is shown as one, but it
 * does not make the hotel a kosher certified property, and a search for one
 * must not return it. Passover is narrower still — it is certification for a
 * fortnight of the year.
 */
export const PROPERTY_SCOPES = ['PROPERTY', 'KITCHEN'];

/** Days out at which the panel starts warning, and the sweep starts telling. */
export const EXPIRY_NOTICE_DAYS = [60, 30, 7];

const DAY_MS = 86_400_000;

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. Negative once past. */
export const daysBetween = (from, to) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/** A stored value that may be a Date, a date-only string, or absent. */
const asDateOnly = (value) => (value ? toDateOnly(value) : null);

/**
 * The state a certificate is actually in, right now.
 *
 * EXPIRED is computed rather than stored. A stored flag is only correct once a
 * job has run, so between midnight and the next sweep an expired certificate
 * would still read as verified — which is the single failure this whole
 * subsystem exists to prevent. Nothing here reads a clock of its own: `today`
 * comes from the caller, so a test can put the clock anywhere it likes.
 */
export const certificationState = (certification, today) => {
    if (!certification || certification.archivedAt) {
        return 'ARCHIVED';
    }

    if (certification.verification !== 'VERIFIED') {
        return certification.verification;
    }

    const expiresOn = asDateOnly(certification.expiresOn);

    // Null expiry means the authority issues none. The certificate stands until
    // somebody replaces or archives it.
    if (expiresOn && expiresOn < today) {
        return 'EXPIRED';
    }

    return 'VERIFIED';
};

/** Days until this certificate lapses, or null when it never does. */
export const daysUntilExpiry = (certification, today) => {
    const expiresOn = asDateOnly(certification?.expiresOn);

    return expiresOn ? daysBetween(today, expiresOn) : null;
};

/**
 * Which of a property's certificates is the one to show.
 *
 * Precedence is by usefulness to the reader, not by date: a live certificate
 * always wins, then one awaiting our check, then one that has lapsed, then one
 * nobody has looked at, then a rejection. Within a state, the one that runs
 * longest — a certificate with no expiry outranks any dated one.
 */
const STATE_RANK = {
    VERIFIED: 0,
    PENDING_VERIFICATION: 1,
    EXPIRED: 2,
    UNVERIFIED: 3,
    REJECTED: 4,
    ARCHIVED: 5
};

export const pickHeadlineCertification = (certifications = [], today) => {
    const ranked = certifications
        .map((certification) => ({ certification, state: certificationState(certification, today) }))
        .filter((entry) => entry.state !== 'ARCHIVED')
        .sort((a, b) => {
            const byState = STATE_RANK[a.state] - STATE_RANK[b.state];

            if (byState !== 0) {
                return byState;
            }

            const aExpiry = asDateOnly(a.certification.expiresOn);
            const bExpiry = asDateOnly(b.certification.expiresOn);

            if (aExpiry === bExpiry) {
                return 0;
            }

            // No expiry runs longest of all.
            if (!aExpiry) {
                return -1;
            }

            if (!bExpiry) {
                return 1;
            }

            return aExpiry < bExpiry ? 1 : -1;
        });

    return ranked[0] ?? null;
};

/**
 * The property's kosher position, resolved.
 *
 * `certified` is true only when a VERIFIED, unexpired, unarchived certificate
 * of a property-wide scope exists. There is no field an admin can set to make
 * it true, and no combination of amenities produces it — which is the whole
 * reason certification lives in its own table rather than as a status on the
 * profile.
 */
export const deriveKosher = (profile, today) => {
    if (!profile) {
        return null;
    }

    const certifications = profile.certifications ?? [];
    const live = certifications.filter(
        (certification) => certificationState(certification, today) === 'VERIFIED'
    );

    const headline = pickHeadlineCertification(certifications, today);

    return {
        serviceLevel: profile.serviceLevel,
        offersKosher: profile.serviceLevel !== 'NONE',
        // Scope matters: a certified restaurant inside a hotel is not a
        // certified hotel, and saying otherwise is the specific
        // misrepresentation this feature is built to avoid.
        certified: live.some((certification) => PROPERTY_SCOPES.includes(certification.scope)),
        certifiedScopes: [...new Set(live.map((certification) => certification.scope))].sort(),
        state: headline?.state ?? 'NONE',
        headline: headline?.certification ?? null,
        expiresInDays: headline ? daysUntilExpiry(headline.certification, today) : null
    };
};

/**
 * Every level at or above the one asked for.
 *
 * Expressed as a list rather than as a comparison because Prisma has no ordered
 * comparison on an enum, and the raw SQL side compares positions in
 * `enum_range()`. Both read their ordering from `SERVICE_LEVEL_ORDER`, so there
 * is one declaration of what "at least KOSHER_FRIENDLY" means.
 *
 * NONE is never included, whatever is asked for: it means "we checked, and the
 * answer is no", which is worth recording and never worth returning.
 */
export const atLeastServiceLevel = (level) => {
    const from = Math.max(1, SERVICE_LEVEL_ORDER.indexOf(level));

    return SERVICE_LEVEL_ORDER.slice(from);
};

/**
 * The Prisma shape of "a certificate that is actually live, right now".
 *
 * Derived on every read rather than cached as a boolean on the hotel. A cached
 * flag goes stale silently at midnight — which is precisely the failure this
 * feature exists to prevent — whereas this is correct at 00:01 whether or not
 * any job has run.
 *
 * `today` is a `YYYY-MM-DD` string and is converted to the UTC midnight the
 * `@db.Date` column round-trips through, so a certificate expiring *today* is
 * still valid today rather than dropping out at the current wall-clock second.
 */
export const liveCertificationWhere = (today) => ({
    archivedAt: null,
    verification: 'VERIFIED',
    scope: { in: PROPERTY_SCOPES },
    OR: [{ expiresOn: null }, { expiresOn: { gte: dateOnlyToUtc(today) } }]
});

/** True while a live certificate is close enough to lapsing to say so. */
export const isExpiringSoon = (resolved) =>
    resolved?.state === 'VERIFIED' &&
    resolved.expiresInDays !== null &&
    resolved.expiresInDays <= EXPIRY_NOTICE_DAYS[0];

/** The kosher facilities a hotel claims, from its ordinary amenity set. */
export const kosherFeaturesOf = (hotel) =>
    (hotel?.amenities ?? [])
        .filter((entry) => KOSHER_AMENITY_CATEGORIES.includes(entry.amenity?.category))
        .map((entry) => entry.amenity.code);

/**
 * "Today" for kosher purposes.
 *
 * The property's own zone where one is known, because a certificate valid until
 * the 14th is valid on the 14th in Tbilisi regardless of where the server is.
 */
export const kosherToday = (timezone) => todayInTimezone(timezone ?? 'Asia/Tbilisi');

// ---------------------------------------------------------------------------
// Persistence.
// ---------------------------------------------------------------------------

export const kosherInclude = {
    certifications: {
        include: {
            document: { include: { fileAsset: true } },
            verifiedBy: { select: { id: true, email: true, firstName: true, lastName: true } }
        },
        orderBy: [{ archivedAt: 'asc' }, { createdAt: 'desc' }]
    },
    lockedBy: { select: { id: true, email: true, firstName: true, lastName: true } }
};

const loadHotelOr404 = async (client, hotelId) => {
    const hotel = await client.hotel.findUnique({
        where: { id: hotelId },
        select: { id: true, name: true, status: true, timezone: true }
    });

    if (!hotel) {
        throw new NotFoundError('Hotel not found');
    }

    return hotel;
};

export const findKosherProfile = (hotelId) =>
    prisma.hotelKosherProfile.findUnique({ where: { hotelId }, include: kosherInclude });

/**
 * Exactly what `toKosher` reads, and nothing else.
 *
 * Deliberately not `findHotelOr404`: that include pulls room types, rate plans,
 * cancellation rules, images, reviews and every translation, and the kosher
 * panel needs a time zone, an owner and an amenity list. Saving a admin a page
 * of joins per keystroke on a form is worth one small function.
 */
export const loadKosherView = async (hotelId) => {
    const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        select: {
            id: true,
            name: true,
            slug: true,
            // `supplierId` is what `canViewNetRates` reads to decide whether the
            // viewer sees provenance and the lock.
            supplierId: true,
            timezone: true,
            amenities: { select: { amenity: { select: { code: true, category: true } } } },
            kosher: { include: kosherInclude }
        }
    });

    if (!hotel) {
        throw new NotFoundError('Hotel not found');
    }

    return hotel;
};

export const findKosherProfileOr404 = async (hotelId) => {
    const profile = await findKosherProfile(hotelId);

    if (!profile) {
        throw new NotFoundError('This property has no kosher profile');
    }

    return profile;
};

/**
 * Creates or replaces the profile.
 *
 * Creating it *is* switching kosher services on for the property — there is no
 * separate flag, because a flag and a record can disagree and a record cannot
 * disagree with itself.
 *
 * A staff write always sets `source: ADMIN` and stamps `lockedAt`. That is the
 * lock a later supplier sync has to respect: once a human has been here, an
 * import cannot quietly replace what they wrote.
 */
export const upsertKosherProfile = async (hotelId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await loadHotelOr404(tx, hotelId);
        const existing = await tx.hotelKosherProfile.findUnique({ where: { hotelId } });

        const data = {
            serviceLevel: input.serviceLevel,
            notes: input.notes ?? null,
            contactName: input.contactName ?? null,
            contactEmail: input.contactEmail ?? null,
            contactPhone: input.contactPhone ?? null,
            source: 'ADMIN',
            lockedAt: new Date(),
            lockedByUserId: actor?.id ?? null
        };

        const profile = await tx.hotelKosherProfile.upsert({
            where: { hotelId },
            create: { hotelId, ...data },
            update: data
        });

        await recordAudit(tx, {
            action: existing ? 'HOTEL_KOSHER_UPDATED' : 'HOTEL_KOSHER_ENABLED',
            actor,
            entityType: AUDIT_ENTITY.hotel,
            entityId: hotelId,
            summary: existing
                ? `Updated kosher services on ${hotel.name}`
                : `Enabled kosher services on ${hotel.name}`,
            metadata: {
                serviceLevel: profile.serviceLevel,
                ...(existing ? { from: existing.serviceLevel } : {})
            },
            req
        });

        return profile;
    });

/**
 * Switches kosher services off entirely.
 *
 * Refused while a live certificate exists. Removing the profile would cascade
 * the certificates away with it, and a property that somebody verified must not
 * become un-kosher — history and all — with one click. Archive the certificate
 * first, or set the level to NONE, which keeps both the record and its history.
 */
export const disableKosher = async (hotelId, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await loadHotelOr404(tx, hotelId);
        const profile = await tx.hotelKosherProfile.findUnique({
            where: { hotelId },
            include: { certifications: true }
        });

        if (!profile) {
            throw new NotFoundError('This property has no kosher profile');
        }

        const today = kosherToday(hotel.timezone);
        const live = profile.certifications.filter(
            (certification) => certificationState(certification, today) === 'VERIFIED'
        );

        if (live.length > 0) {
            throw new ConflictError(
                'Archive the verified certificate before removing kosher services',
                {
                    certifications: live.map((certification) => ({
                        id: certification.id,
                        authorityName: certification.authorityName
                    }))
                }
            );
        }

        await tx.hotelKosherProfile.delete({ where: { hotelId } });

        await recordAudit(tx, {
            action: 'HOTEL_KOSHER_DISABLED',
            actor,
            entityType: AUDIT_ENTITY.hotel,
            entityId: hotelId,
            summary: `Removed kosher services from ${hotel.name}`,
            metadata: { archivedCertifications: profile.certifications.length },
            req
        });
    });

/**
 * The document a certificate points at has to belong to this hotel.
 *
 * Without this check a certificate could reference any document id in the
 * system, including another property's contract — and the certificate view
 * issues signed URLs, so that would be a read of a private file through an
 * authorization hole rather than merely a wrong label.
 */
const assertDocumentBelongsToHotel = async (tx, hotelId, documentId) => {
    if (!documentId) {
        return;
    }

    const document = await tx.hotelDocument.findFirst({
        where: { id: documentId, hotelId },
        select: { id: true }
    });

    if (!document) {
        throw new BadRequestError('That document does not belong to this hotel', {
            field: 'documentId'
        });
    }
};

export const addCertification = async (hotelId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await loadHotelOr404(tx, hotelId);
        const profile = await tx.hotelKosherProfile.findUnique({ where: { hotelId } });

        if (!profile) {
            throw new ConflictError('Switch kosher services on for this property first');
        }

        await assertDocumentBelongsToHotel(tx, hotelId, input.documentId);

        const certification = await tx.hotelKosherCertification.create({
            data: {
                profileId: profile.id,
                authorityName: input.authorityName,
                authorityWebsite: input.authorityWebsite ?? null,
                name: input.name ?? null,
                reference: input.reference ?? null,
                ...(input.scope ? { scope: input.scope } : {}),
                issuedOn: input.issuedOn ? dateOnlyToUtc(input.issuedOn) : null,
                expiresOn: input.expiresOn ? dateOnlyToUtc(input.expiresOn) : null,
                documentId: input.documentId ?? null,
                source: 'ADMIN'
            }
        });

        await recordAudit(tx, {
            action: 'KOSHER_CERTIFICATION_ADDED',
            actor,
            entityType: AUDIT_ENTITY.kosherCertification,
            entityId: certification.id,
            summary: `Added a kosher certificate from ${certification.authorityName} to ${hotel.name}`,
            metadata: {
                hotelId,
                scope: certification.scope,
                expiresOn: input.expiresOn ?? null
            },
            req
        });

        return certification;
    });

/**
 * Fields whose change invalidates a previous verification.
 *
 * Verification attaches to a set of facts, not to a row id. Someone who checked
 * "Chief Rabbinate of Georgia, KG-2026-114, valid to 14 Jan" did not check
 * whatever those fields are edited into afterwards, so an edit to any of them
 * sends the certificate back to PENDING_VERIFICATION. Cosmetic fields — the
 * certificate's own name, the authority's website — do not.
 */
const MATERIAL_FIELDS = ['authorityName', 'reference', 'scope', 'issuedOn', 'expiresOn', 'documentId'];

const loadCertificationOr404 = async (tx, hotelId, certId) => {
    const certification = await tx.hotelKosherCertification.findFirst({
        where: { id: certId, profile: { hotelId } }
    });

    if (!certification) {
        throw new NotFoundError('Certificate not found');
    }

    return certification;
};

export const updateCertification = async (hotelId, certId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await loadHotelOr404(tx, hotelId);
        const current = await loadCertificationOr404(tx, hotelId, certId);

        if (current.archivedAt) {
            throw new ConflictError('An archived certificate cannot be edited');
        }

        if (input.documentId !== undefined) {
            await assertDocumentBelongsToHotel(tx, hotelId, input.documentId);
        }

        const data = {};

        for (const field of ['authorityName', 'authorityWebsite', 'name', 'reference', 'scope']) {
            if (input[field] !== undefined) {
                data[field] = input[field] ?? null;
            }
        }

        for (const field of ['issuedOn', 'expiresOn']) {
            if (input[field] !== undefined) {
                data[field] = input[field] ? dateOnlyToUtc(input[field]) : null;
            }
        }

        if (input.documentId !== undefined) {
            data.documentId = input.documentId ?? null;
        }

        // The zod refinement can only compare the two fields it was sent. A
        // PATCH that moves one of them has to be checked against the record it
        // is landing on, or "expires 2026-01-01" onto "issued 2027-01-01" would
        // pass validation and be stopped only by the CHECK constraint.
        const merged = {
            issuedOn: 'issuedOn' in data ? data.issuedOn : current.issuedOn,
            expiresOn: 'expiresOn' in data ? data.expiresOn : current.expiresOn
        };

        if (merged.issuedOn && merged.expiresOn && merged.expiresOn < merged.issuedOn) {
            throw new BadRequestError('A certificate cannot expire before it was issued', {
                field: 'expiresOn'
            });
        }

        // Compared through a normaliser rather than with `!==`, because two of
        // these fields are Dates and two Date objects are never equal to each
        // other — which would make every edit look material and revoke a
        // verification nobody actually changed.
        const sameValue = (a, b) => {
            if (a instanceof Date || b instanceof Date) {
                return (a ? toDateOnly(a) : null) === (b ? toDateOnly(b) : null);
            }

            return (a ?? null) === (b ?? null);
        };

        const changedMaterial = MATERIAL_FIELDS.filter(
            (field) => field in data && !sameValue(data[field], current[field])
        );

        // Back to pending, with the verifier cleared: leaving the old verifier
        // on a changed record would put somebody's name against facts they
        // never saw.
        const revoked = changedMaterial.length > 0 && current.verification === 'VERIFIED';

        const certification = await tx.hotelKosherCertification.update({
            where: { id: certId },
            data: {
                ...data,
                ...(revoked
                    ? {
                          verification: 'PENDING_VERIFICATION',
                          verifiedAt: null,
                          verifiedByUserId: null,
                          verificationNotes: null
                      }
                    : {})
            }
        });

        await recordAudit(tx, {
            action: 'KOSHER_CERTIFICATION_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.kosherCertification,
            entityId: certId,
            summary: revoked
                ? `Edited a verified kosher certificate on ${hotel.name}; verification withdrawn`
                : `Edited a kosher certificate on ${hotel.name}`,
            metadata: { hotelId, fields: Object.keys(data), verificationWithdrawn: revoked },
            req
        });

        return certification;
    });

/**
 * The only path to VERIFIED.
 *
 * Deliberately not a field on any update schema. A hotel update, a certificate
 * edit and a supplier sync all pass through code that has no way to write this
 * column, so the guarantee does not depend on anyone remembering a check.
 */
export const verifyCertification = async (hotelId, certId, { decision, notes }, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await loadHotelOr404(tx, hotelId);
        const current = await loadCertificationOr404(tx, hotelId, certId);

        if (current.archivedAt) {
            throw new ConflictError('An archived certificate cannot be verified');
        }

        if (current.verification === decision) {
            throw new ConflictError(`This certificate is already ${decision}`, {
                verification: current.verification
            });
        }

        const verified = decision === 'VERIFIED';

        const certification = await tx.hotelKosherCertification.update({
            where: { id: certId },
            data: {
                verification: decision,
                // The timestamp records when the decision was taken, whichever
                // way it went — the CHECK constraint only insists on one for
                // VERIFIED, but a rejection with no date is just as useless.
                verifiedAt: new Date(),
                verifiedByUserId: actor?.id ?? null,
                verificationNotes: notes ?? null
            }
        });

        await recordAudit(tx, {
            action: 'KOSHER_CERTIFICATION_VERIFIED',
            actor,
            entityType: AUDIT_ENTITY.kosherCertification,
            entityId: certId,
            summary: `Marked a kosher certificate from ${current.authorityName} as ${decision} on ${hotel.name}`,
            metadata: {
                hotelId,
                decision,
                from: current.verification,
                scope: current.scope,
                verified
            },
            req
        });

        return certification;
    });

/**
 * Retires a certificate.
 *
 * A certificate nobody ever verified is a draft and is deleted outright.
 * Anything that reached a decision is archived instead: "we were certified by X
 * until March" is a fact somebody will eventually have to answer for, and
 * deleting the row would make the audit trail point at nothing.
 */
export const archiveCertification = async (hotelId, certId, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await loadHotelOr404(tx, hotelId);
        const current = await loadCertificationOr404(tx, hotelId, certId);

        if (current.archivedAt) {
            throw new ConflictError('This certificate is already archived');
        }

        const isDraft = current.verification === 'UNVERIFIED';

        if (isDraft) {
            await tx.hotelKosherCertification.delete({ where: { id: certId } });
        } else {
            await tx.hotelKosherCertification.update({
                where: { id: certId },
                data: { archivedAt: new Date() }
            });
        }

        await recordAudit(tx, {
            action: 'KOSHER_CERTIFICATION_ARCHIVED',
            actor,
            entityType: AUDIT_ENTITY.kosherCertification,
            entityId: certId,
            summary: isDraft
                ? `Deleted an unverified kosher certificate on ${hotel.name}`
                : `Archived a kosher certificate from ${current.authorityName} on ${hotel.name}`,
            metadata: { hotelId, deleted: isDraft, verification: current.verification },
            req
        });

        return { deleted: isDraft };
    });

// ---------------------------------------------------------------------------
// Supplier synchronisation.
// ---------------------------------------------------------------------------

/**
 * Applies a supplier's kosher payload, or refuses to.
 *
 * Nothing here can touch a certificate. A certificate is a document a human has
 * looked at; a feed carries a boolean, and a boolean is not a certificate. The
 * strongest thing an import may say is `KOSHER_FRIENDLY`, and even that only
 * onto a record no member of staff has written.
 *
 * When the record is locked the payload is parked rather than dropped, so an
 * admin can see that the supplier now disagrees and decide. Silently winning
 * and silently losing are both wrong; being told is the only useful behaviour.
 */
export const applySupplierKosherData = async (hotelId, payload, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await loadHotelOr404(tx, hotelId);
        const existing = await tx.hotelKosherProfile.findUnique({
            where: { hotelId },
            include: { certifications: true }
        });

        const today = kosherToday(hotel.timezone);
        const hasVerified = (existing?.certifications ?? []).some(
            (certification) => certificationState(certification, today) === 'VERIFIED'
        );
        const locked = Boolean(existing?.lockedAt) || hasVerified;

        if (locked) {
            await tx.hotelKosherProfile.update({
                where: { hotelId },
                data: { pendingSupplierData: { ...payload, receivedAt: new Date().toISOString() } }
            });

            await recordAudit(tx, {
                action: 'KOSHER_SUPPLIER_UPDATE_HELD',
                actor,
                entityType: AUDIT_ENTITY.hotel,
                entityId: hotelId,
                summary: `Held a supplier kosher update for ${hotel.name}: the record is locked`,
                metadata: {
                    reason: hasVerified ? 'VERIFIED_CERTIFICATION' : 'MANUALLY_LOCKED',
                    supplierServiceLevel: payload.serviceLevel,
                    storedServiceLevel: existing.serviceLevel
                },
                req
            });

            return { applied: false, held: true, profile: existing };
        }

        // A feed may describe a property as accommodating; it may not promote it
        // to partly or fully kosher, because those are claims a certificate
        // backs and an import has none.
        const cappedLevel = ['PARTIAL', 'FULL'].includes(payload.serviceLevel)
            ? 'KOSHER_FRIENDLY'
            : payload.serviceLevel;

        const data = {
            serviceLevel: cappedLevel,
            notes: payload.notes ?? null,
            contactName: payload.contactName ?? null,
            contactEmail: payload.contactEmail ?? null,
            contactPhone: payload.contactPhone ?? null,
            source: payload.source ?? 'SUPPLIER',
            sourceRef: payload.sourceRef ?? null,
            sourceUpdatedAt: new Date(),
            pendingSupplierData: null
        };

        const profile = await tx.hotelKosherProfile.upsert({
            where: { hotelId },
            create: { hotelId, ...data },
            update: data
        });

        await recordAudit(tx, {
            action: existing ? 'HOTEL_KOSHER_UPDATED' : 'HOTEL_KOSHER_ENABLED',
            actor,
            entityType: AUDIT_ENTITY.hotel,
            entityId: hotelId,
            summary: `Applied a supplier kosher update to ${hotel.name}`,
            metadata: {
                source: data.source,
                serviceLevel: cappedLevel,
                ...(cappedLevel !== payload.serviceLevel ? { cappedFrom: payload.serviceLevel } : {})
            },
            req
        });

        return { applied: true, held: false, profile };
    });

// ---------------------------------------------------------------------------
// The expiry sweep.
// ---------------------------------------------------------------------------

/**
 * Tells somebody that a certificate is about to lapse, or has.
 *
 * **It changes no state.** Expiry is derived on read, so the platform is already
 * correct the moment a certificate runs out — this exists so that the fact
 * reaches a human before an agency does. That separation is deliberate: a job
 * that has to run for the data to be right is a job whose failure is invisible.
 *
 * Runs on the same interval as the hold sweeper and takes the same kind of
 * advisory lock, so every instance can run it and only one will.
 */
export const sweepExpiringCertifications = async ({ now = new Date() } = {}) => {
    const [{ locked }] = await prisma.$queryRaw`
        SELECT pg_try_advisory_lock(hashtext('kosher_certification_sweep')) AS locked
    `;

    if (!locked) {
        return { notified: 0, skipped: true };
    }

    try {
        const today = toDateOnly(now);
        const horizon = new Date(now.getTime() + EXPIRY_NOTICE_DAYS[0] * DAY_MS);

        const due = await prisma.hotelKosherCertification.findMany({
            where: {
                verification: 'VERIFIED',
                archivedAt: null,
                expiresOn: { not: null, lte: horizon }
            },
            include: { profile: { include: { hotel: { select: { id: true, name: true } } } } }
        });

        let notified = 0;

        for (const certification of due) {
            const days = daysUntilExpiry(certification, today);

            // One notice per threshold crossed, and one on the day it lapses.
            // Anything already past its expiry keeps reporting daily: an expired
            // certificate on a live property is not a thing to mention once.
            const milestone = days <= 0 || EXPIRY_NOTICE_DAYS.includes(days);

            if (!milestone) {
                continue;
            }

            await recordAudit(prisma, {
                action: 'KOSHER_CERTIFICATION_EXPIRING',
                actor: null,
                entityType: AUDIT_ENTITY.kosherCertification,
                entityId: certification.id,
                summary:
                    days <= 0
                        ? `Kosher certificate from ${certification.authorityName} has expired at ${certification.profile.hotel.name}`
                        : `Kosher certificate from ${certification.authorityName} expires in ${days} days at ${certification.profile.hotel.name}`,
                metadata: {
                    hotelId: certification.profile.hotel.id,
                    daysUntilExpiry: days,
                    expiresOn: toDateOnly(certification.expiresOn)
                }
            }).catch((err) =>
                // Best effort by design, but not silent: an unwritten notice is
                // a certificate nobody is going to hear about again.
                logger.warn(
                    { err, certificationId: certification.id },
                    'Could not record a kosher certificate expiry notice'
                )
            );

            notified += 1;
        }

        return { notified, skipped: false };
    } finally {
        await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext('kosher_certification_sweep'))`;
    }
};
