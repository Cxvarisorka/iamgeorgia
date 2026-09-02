import { z } from 'zod';

import { emailField, nameField, phoneField, textField } from './normalize.js';
import { attachDocumentSchema, dateOnlyField } from './fleet.js';

/**
 * Driver profiles.
 *
 * Every schema is `.strict()`. The rating counters are not here at all: they
 * are recomputed from rating rows and no request may set them.
 */

/** ISO 639-1. A closed list, because a free-text "languages" field is a list nobody can filter on. */
export const DRIVER_LANGUAGES = [
    'ka',
    'en',
    'ru',
    'he',
    'tr',
    'de',
    'fr',
    'es',
    'it',
    'ar',
    'hy',
    'az',
    'uk',
    'pl',
    'zh',
    'ja'
];

export const DRIVER_DOCUMENT_TYPES = ['DRIVING_LICENCE', 'ID_DOCUMENT', 'MEDICAL', 'BACKGROUND_CHECK', 'OTHER'];

const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'];

const idField = z.string().min(1).max(64);

const booleanQuery = z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional();

export const driverQuerySchema = z
    .object({
        providerId: idField.optional(),
        verificationStatus: z
            .union([z.enum(VERIFICATION_STATUSES), z.array(z.enum(VERIFICATION_STATUSES))])
            .optional(),
        isActive: booleanQuery,
        search: z.string().trim().min(1).max(80).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
    })
    .strict();

export const createDriverSchema = z
    .object({
        providerId: idField,
        firstName: nameField,
        lastName: nameField,
        phone: phoneField,
        email: emailField.nullish(),
        languages: z.array(z.enum(DRIVER_LANGUAGES)).max(DRIVER_LANGUAGES.length).default([]),
        yearsExperience: z.number().int().min(0).max(60).default(0),
        bio: textField(2000).nullish(),
        photoFileAssetId: idField.nullish(),
        licenceNumber: textField(64).nullish(),
        licenceExpiresOn: dateOnlyField.nullish(),
        dateOfBirth: dateOnlyField.nullish(),
        internalNotes: textField(4000).nullish(),
        homeBasePointId: idField.nullish()
    })
    .strict();

export const updateDriverSchema = createDriverSchema.partial();

/** What a driver may change about themselves: how to reach them and what to say about them. */
export const driverSelfUpdateSchema = z
    .object({
        phone: phoneField.optional(),
        languages: z.array(z.enum(DRIVER_LANGUAGES)).max(DRIVER_LANGUAGES.length).optional(),
        bio: textField(2000).nullish()
    })
    .strict();

export const verifyDriverSchema = z
    .object({
        status: z.enum(VERIFICATION_STATUSES),
        note: textField(1000).nullish()
    })
    .strict();

export const deactivateDriverSchema = z
    .object({
        reason: textField(500),
        /** Revoke any future assignments rather than refusing while they exist. */
        force: z.boolean().default(false)
    })
    .strict();

export const createDriverAccountSchema = z
    .object({
        email: emailField
    })
    .strict();

export const driverVehiclesSchema = z
    .object({
        vehicles: z
            .array(
                z
                    .object({
                        fleetVehicleId: idField,
                        isPrimary: z.boolean().default(false)
                    })
                    .strict()
            )
            .max(20)
    })
    .strict()
    .refine((body) => body.vehicles.filter((link) => link.isPrimary).length <= 1, {
        message: 'A driver has at most one primary car',
        path: ['vehicles']
    })
    .refine((body) => new Set(body.vehicles.map((link) => link.fleetVehicleId)).size === body.vehicles.length, {
        message: 'Each car may be linked once',
        path: ['vehicles']
    });

export const attachDriverDocumentSchema = attachDocumentSchema(DRIVER_DOCUMENT_TYPES);
