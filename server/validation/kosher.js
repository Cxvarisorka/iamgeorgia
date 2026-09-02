import { z } from 'zod';

import { emailField, nameField, phoneField, textField, websiteField } from './normalize.js';
import { dateOnlyField } from './ratePlan.js';

/**
 * Kosher request schemas.
 *
 * The single most important property of this file is what is **absent**.
 * `verification`, `verifiedAt`, `verifiedBy` and `lockedAt` appear in no schema
 * an ordinary write goes through, so no combination of fields on a profile
 * update or a certification edit can mark a certificate verified. Verification
 * is its own endpoint with its own schema and its own audit action — the same
 * treatment `status` already gets on a hotel, and for the same reason: a check
 * someone can forget to write is weaker than a field that does not exist.
 */

export const KOSHER_SERVICE_LEVELS = ['NONE', 'ON_REQUEST', 'KOSHER_FRIENDLY', 'PARTIAL', 'FULL'];
export const KOSHER_CERTIFICATION_SCOPES = ['PROPERTY', 'KITCHEN', 'RESTAURANT', 'PASSOVER'];
export const KOSHER_DATA_SOURCES = ['ADMIN', 'HOTEL', 'SUPPLIER', 'IMPORT'];

/**
 * The states an admin may put a certificate into.
 *
 * `UNVERIFIED` is not among them: it is where a certificate starts and where an
 * edit sends it back to, never somewhere a decision moves it. Recording
 * "I looked at this and decided nothing" as a deliberate action would make the
 * audit trail say something that is not true.
 */
export const KOSHER_VERIFICATION_DECISIONS = ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'];

// Keyed on `hotelId`, like every other sub-router mounted beneath a hotel.
export const kosherCertificationParamSchema = z.object({
    hotelId: z.string().min(1),
    certId: z.string().min(1)
});

export const hotelDocumentParamSchema = z.object({
    hotelId: z.string().min(1),
    documentId: z.string().min(1)
});

/**
 * Enabling kosher services, and every later edit to the profile.
 *
 * `serviceLevel` is required rather than defaulted. The column has a default so
 * it can be NOT NULL, but a default that silently classifies a property nobody
 * assessed is precisely the misconfiguration this feature is supposed to make
 * hard — so the API insists somebody chooses.
 */
export const kosherProfileSchema = z
    .object({
        serviceLevel: z.enum(KOSHER_SERVICE_LEVELS),
        notes: textField(2000).nullish(),
        contactName: nameField.nullish(),
        contactEmail: emailField.nullish(),
        contactPhone: phoneField.nullish()
    })
    .strict();

/**
 * A certificate, as issued.
 *
 * `expiresOn` is nullish rather than optional so that "this authority issues no
 * expiry" can be stated explicitly by sending null, and told apart from a form
 * that simply did not include the field.
 */
const certificationFields = z
    .object({
        authorityName: textField(200),
        authorityWebsite: websiteField.nullish(),
        name: textField(200).nullish(),
        reference: textField(120).nullish(),
        // No zod default: the column carries `@default(PROPERTY)`, and a
        // default here would make `{}` parse to `{ scope: 'PROPERTY' }` and so
        // slip past the "provide at least one field" check on the partial —
        // turning an empty PATCH into a silent rewrite of the scope.
        scope: z.enum(KOSHER_CERTIFICATION_SCOPES).optional(),
        issuedOn: dateOnlyField.nullish(),
        expiresOn: dateOnlyField.nullish(),
        // A document already attached to this hotel. Ownership is checked in
        // the service — an id alone proves nothing about who it belongs to.
        documentId: z.string().min(1).nullish()
    })
    .strict();

// Dates are compared as `YYYY-MM-DD` strings, which sort correctly as text and
// avoid dragging a time zone into a comparison of two calendar dates. The
// database CHECK constraint says the same thing, because a rule worth enforcing
// at the edge is worth enforcing where nothing can route around it.
const datesOrdered = (value) =>
    !value.issuedOn || !value.expiresOn || value.expiresOn >= value.issuedOn;

const DATE_ORDER_MESSAGE = {
    message: 'A certificate cannot expire before it was issued',
    path: ['expiresOn']
};

export const kosherCertificationSchema = certificationFields.refine(datesOrdered, DATE_ORDER_MESSAGE);

/**
 * A partial edit.
 *
 * Built from the base fields rather than from `kosherCertificationSchema`,
 * because `.partial()` discards the refinements attached to a schema — so
 * chaining off the refined version would silently drop the date check on
 * exactly the path most likely to send a bad pair.
 *
 * The date check still cannot see the stored row from here: a request that
 * moves only `expiresOn` earlier than a stored `issuedOn` is caught by the
 * service, which re-checks against the merged record.
 */
export const updateKosherCertificationSchema = certificationFields
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'Provide at least one field to update'
    })
    .refine(datesOrdered, DATE_ORDER_MESSAGE);

/**
 * A verification decision.
 *
 * Notes are required for anything other than an approval: "rejected" with no
 * reason is not a decision anyone can act on, and the property will ask why.
 */
export const verifyKosherCertificationSchema = z
    .object({
        decision: z.enum(KOSHER_VERIFICATION_DECISIONS),
        notes: textField(1000).nullish()
    })
    .strict()
    .refine((value) => value.decision === 'VERIFIED' || Boolean(value.notes), {
        message: 'Say why, so the property can be told',
        path: ['notes']
    });

/** Attaching an already-uploaded asset to a hotel as a document. */
export const attachHotelDocumentSchema = z
    .object({
        fileAssetId: z.string().min(1),
        docType: z
            .string()
            .trim()
            .min(1)
            .max(60)
            .refine((value) => /^[A-Z][A-Z0-9_]*$/.test(value), {
                message: 'Use an upper-case machine key, for example KOSHER_CERTIFICATE'
            }),
        label: textField(200).nullish(),
        validUntil: dateOnlyField.nullish()
    })
    .strict();

/**
 * A supplier-supplied kosher payload.
 *
 * Separate from `kosherProfileSchema` because a sync carries provenance an
 * admin form never does, and because the rules that apply to it — never write a
 * locked record, never touch a certificate — belong to this shape rather than
 * to that one.
 */
export const kosherSupplierPayloadSchema = z
    .object({
        serviceLevel: z.enum(KOSHER_SERVICE_LEVELS),
        notes: textField(2000).nullish(),
        contactName: nameField.nullish(),
        contactEmail: emailField.nullish(),
        contactPhone: phoneField.nullish(),
        source: z.enum(['SUPPLIER', 'IMPORT', 'HOTEL']).default('SUPPLIER'),
        sourceRef: textField(200).nullish()
    })
    .strict();
