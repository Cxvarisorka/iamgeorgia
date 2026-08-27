import { z } from 'zod';

import { nameField, slugField, textField } from './normalize.js';
import { SUPPORTED_LOCALES } from '../lib/locales.js';

const ROOM_TYPE_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
const BATHROOM_TYPES = ['PRIVATE', 'ENSUITE', 'SHARED'];
const BED_TYPE_CODES = ['SINGLE', 'TWIN', 'DOUBLE', 'QUEEN', 'KING', 'SOFA', 'BUNK', 'FUTON'];
const CHILD_CHARGE_MODES = ['FREE', 'PERCENT_OF_ADULT', 'FIXED_PER_NIGHT', 'FULL_ADULT'];

export const hotelScopedParamSchema = z.object({ hotelId: z.string().min(1) });

export const roomTypeParamSchema = z.object({
    hotelId: z.string().min(1),
    roomTypeId: z.string().min(1)
});

export const roomTypeImageParamSchema = z.object({
    hotelId: z.string().min(1),
    roomTypeId: z.string().min(1),
    imageId: z.string().min(1)
});

export const roomTypeLocaleParamSchema = z.object({
    hotelId: z.string().min(1),
    roomTypeId: z.string().min(1),
    locale: z.enum(SUPPORTED_LOCALES.filter((locale) => locale !== 'en'))
});

/**
 * The occupancy numbers have to agree with each other before they reach the
 * database.
 *
 * A CHECK constraint says the same thing and is the real guarantee — it also
 * covers writers that never went through a route. This exists so the answer is
 * a 400 naming the field rather than a 409 quoting a constraint name, because
 * these are numbers an admin types by hand and gets wrong.
 *
 * Note that `maxOccupancy` is deliberately not `maxAdults + maxChildren`: a
 * room may take 2 adults and 2 children but only 3 guests in total.
 */
const coherentOccupancy = (schema) =>
    schema
        .refine((v) => v.maxAdults === undefined || v.maxOccupancy === undefined || v.maxAdults <= v.maxOccupancy, {
            message: 'maxAdults cannot exceed maxOccupancy',
            path: ['maxAdults']
        })
        .refine(
            (v) => v.maxChildren === undefined || v.maxOccupancy === undefined || v.maxChildren <= v.maxOccupancy,
            { message: 'maxChildren cannot exceed maxOccupancy', path: ['maxChildren'] }
        )
        .refine((v) => v.minAdults === undefined || v.maxAdults === undefined || v.minAdults <= v.maxAdults, {
            message: 'minAdults cannot exceed maxAdults',
            path: ['minAdults']
        })
        .refine(
            (v) =>
                v.standardOccupancy === undefined ||
                v.maxOccupancy === undefined ||
                v.standardOccupancy <= v.maxOccupancy,
            { message: 'standardOccupancy cannot exceed maxOccupancy', path: ['standardOccupancy'] }
        );

const roomTypeFields = {
    code: slugField,
    name: nameField,
    description: textField(4000).nullish(),
    status: z.enum(ROOM_TYPE_STATUSES),
    sortOrder: z.number().int().min(0).max(9999),
    roomSizeSqm: z.number().int().min(1).max(2000).nullish(),

    maxOccupancy: z.number().int().min(1).max(30),
    maxAdults: z.number().int().min(1).max(30),
    maxChildren: z.number().int().min(0).max(30),
    minAdults: z.number().int().min(0).max(30),
    standardOccupancy: z.number().int().min(1).max(30),
    extraBedCapacity: z.number().int().min(0).max(10),

    bathroomType: z.enum(BATHROOM_TYPES),
    smokingAllowed: z.boolean(),
    accessible: z.boolean()
};

export const createRoomTypeSchema = coherentOccupancy(
    z
        .object({
            ...roomTypeFields,
            // Sensible defaults so the wizard's room step is short: name it, say
            // how many people it sleeps, move on.
            status: z.enum(ROOM_TYPE_STATUSES).default('ACTIVE'),
            maxAdults: z.number().int().min(1).max(30).default(2),
            maxChildren: z.number().int().min(0).max(30).default(0),
            minAdults: z.number().int().min(0).max(30).default(1),
            standardOccupancy: z.number().int().min(1).max(30).default(2),
            extraBedCapacity: z.number().int().min(0).max(10).default(0),
            bathroomType: z.enum(BATHROOM_TYPES).default('PRIVATE'),
            smokingAllowed: z.boolean().default(false),
            accessible: z.boolean().default(false),
            sortOrder: z.number().int().min(0).max(9999).optional()
        })
        .strict()
);

export const updateRoomTypeSchema = coherentOccupancy(
    z
        .object(roomTypeFields)
        .strict()
        .partial()
        .refine((value) => Object.keys(value).length > 0, {
            message: 'Provide at least one field to update'
        })
);

/**
 * A bed configuration, sent whole.
 *
 * `groupIndex` separates alternative make-ups of the same room: group 0 might
 * be one king, group 1 two twins. Beds within a group add up; groups do not add
 * to each other.
 */
export const setBedsSchema = z
    .object({
        beds: z
            .array(
                z
                    .object({
                        bedTypeCode: z.enum(BED_TYPE_CODES),
                        quantity: z.number().int().min(1).max(20).default(1),
                        groupIndex: z.number().int().min(0).max(9).default(0)
                    })
                    .strict()
            )
            .max(40)
    })
    .strict();

export const roomTypeAmenitiesSchema = z
    .object({
        amenities: z
            .array(
                z
                    .object({
                        amenityId: z.string().min(1),
                        note: textField(200).nullish()
                    })
                    .strict()
            )
            .max(120)
    })
    .strict();

export const roomTypeTranslationSchema = z
    .object({
        name: nameField.nullish(),
        description: textField(4000).nullish()
    })
    .strict();

export const roomTypeQuerySchema = z.object({
    status: z.union([z.enum(ROOM_TYPE_STATUSES), z.array(z.enum(ROOM_TYPE_STATUSES))]).optional(),
    locale: z.enum(SUPPORTED_LOCALES).default('en'),
    // Occupancy the caller wants to fit. When given, every room type comes back
    // annotated with whether it fits and, if not, why — which is what lets the
    // admin room list answer "why is this hotel not showing for a family?"
    adults: z.coerce.number().int().min(1).max(30).optional(),
    childAges: z
        .union([z.coerce.number().int().min(0).max(17), z.array(z.coerce.number().int().min(0).max(17))])
        .optional()
});

/** The room gallery. Room images carry no category — they are all of the room. */
export const attachRoomImageSchema = z
    .object({
        fileAssetId: z.string().min(1),
        caption: textField(300).nullish(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
        isCover: z.boolean().optional()
    })
    .strict();

export const updateRoomImageSchema = z
    .object({
        caption: textField(300).nullable(),
        sortOrder: z.number().int().min(0).max(9999),
        isCover: z.boolean()
    })
    .strict()
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'Provide at least one field to update'
    });

export const reorderRoomImagesSchema = z
    .object({ order: z.array(z.string().min(1)).min(1).max(500) })
    .strict();

/** A hotel's child policy, replaced whole — bands only make sense as a set. */
export const childPolicySchema = z
    .object({
        infantMaxAge: z.number().int().min(0).max(17).default(2),
        childMaxAge: z.number().int().min(1).max(17).default(11),
        childrenCountTowardOccupancy: z.boolean().default(false),
        maxChildrenFreePerRoom: z.number().int().min(0).max(10).nullish(),
        bands: z
            .array(
                z
                    .object({
                        minAge: z.number().int().min(0).max(99),
                        maxAge: z.number().int().min(0).max(99),
                        label: textField(60),
                        chargeMode: z.enum(CHILD_CHARGE_MODES).default('FREE'),
                        // Basis points for PERCENT_OF_ADULT, minor units for
                        // FIXED_PER_NIGHT, ignored otherwise.
                        chargeValue: z.number().int().min(0).max(1_000_000).default(0),
                        requiresExtraBed: z.boolean().default(false)
                    })
                    .strict()
                    .refine((band) => band.maxAge >= band.minAge, {
                        message: 'A band cannot end before it begins',
                        path: ['maxAge']
                    })
            )
            .max(10)
            .default([])
    })
    .strict()
    .refine((value) => value.childMaxAge > value.infantMaxAge, {
        message: 'The child band must extend past the infant band',
        path: ['childMaxAge']
    });
