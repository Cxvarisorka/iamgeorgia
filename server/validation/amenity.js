import { z } from 'zod';

import { nameField, slugField, textField } from './normalize.js';
import { SUPPORTED_LOCALES } from '../lib/locales.js';

const AMENITY_CATEGORIES = [
    'General',
    'FoodDrink',
    'Wellness',
    'Parking',
    'Business',
    'Family',
    'Ski',
    'Accessibility',
    'Transportation'
];

const AMENITY_SCOPES = ['HOTEL', 'ROOM', 'BOTH'];

export const idParamSchema = z.object({ id: z.string().min(1) });

export const amenityLocaleParamSchema = z.object({
    id: z.string().min(1),
    locale: z.enum(SUPPORTED_LOCALES.filter((locale) => locale !== 'en'))
});

// `code` is the stable machine key the client's icon map and the seed file both
// key on, so it is write-once: it may be set on create and never changed.
// Renaming one would silently break every hotel that already claims it.
export const createAmenitySchema = z
    .object({
        code: slugField,
        name: nameField,
        category: z.enum(AMENITY_CATEGORIES),
        scope: z.enum(AMENITY_SCOPES).default('HOTEL'),
        icon: textField(60).nullish(),
        sortOrder: z.number().int().min(0).max(9999).optional()
    })
    .strict();

export const updateAmenitySchema = z
    .object({
        name: nameField,
        category: z.enum(AMENITY_CATEGORIES),
        scope: z.enum(AMENITY_SCOPES),
        icon: textField(60).nullish(),
        sortOrder: z.number().int().min(0).max(9999),
        isActive: z.boolean()
    })
    .strict()
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'Provide at least one field to update'
    });

export const amenityTranslationSchema = z.object({ name: nameField.nullish() }).strict();

export const amenityQuerySchema = z.object({
    category: z.union([z.enum(AMENITY_CATEGORIES), z.array(z.enum(AMENITY_CATEGORIES))]).optional(),
    scope: z.enum(AMENITY_SCOPES).optional(),
    // Admin screens need to see deactivated amenities to reactivate them; the
    // public catalogue never should.
    includeInactive: z.stringbool().default(false),
    locale: z.enum(SUPPORTED_LOCALES).default('en')
});
