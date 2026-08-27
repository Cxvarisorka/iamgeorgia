import { z } from 'zod';

import { countryField, slugField } from './normalize.js';
import { dateOnlyField } from './ratePlan.js';
import { SUPPORTED_LOCALES } from '../lib/locales.js';

const PROPERTY_TYPES = ['Hotel', 'Boutique', 'Resort', 'Guesthouse', 'Lodge', 'Apartment', 'Chalet', 'Hostel', 'Villa'];
const MEAL_PLAN_CODES = ['RO', 'BB', 'HB', 'HB_PLUS', 'FB', 'FB_PLUS', 'AI', 'UAI'];

/**
 * Child ages, one per child.
 *
 * Ages rather than a count, because a hotel cannot price or place a child
 * without knowing how old it is — an eleven-year-old and a twelve-year-old may
 * be a child and an adult at the same property. A search that sends a count
 * would have to guess, and guessing here is how a quote gets disputed.
 */
const childAgesField = z
    .union([
        z.coerce.number().int().min(0).max(17),
        z.array(z.coerce.number().int().min(0).max(17)).max(10)
    ])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional();

const stayFields = {
    checkIn: dateOnlyField,
    checkOut: dateOnlyField,
    adults: z.coerce.number().int().min(1).max(30).default(2),
    childAges: childAgesField,
    rooms: z.coerce.number().int().min(1).max(9).default(1)
};

const stayOrdered = (schema) =>
    schema.refine((value) => value.checkOut > value.checkIn, {
        message: 'Check-out must be after check-in',
        path: ['checkOut']
    });

export const searchQuerySchema = stayOrdered(
    z.object({
        ...stayFields,

        destinationSlug: slugField.optional(),
        destinationPath: z.string().trim().max(400).optional(),
        countryCode: countryField.optional(),

        propertyType: z.union([z.enum(PROPERTY_TYPES), z.array(z.enum(PROPERTY_TYPES))]).optional(),
        minStars: z.coerce.number().int().min(1).max(5).optional(),
        amenity: z.union([slugField, z.array(slugField)]).optional(),
        mealPlan: z.union([z.enum(MEAL_PLAN_CODES), z.array(z.enum(MEAL_PLAN_CODES))]).optional(),
        refundableOnly: z.stringbool().default(false),

        locale: z.enum(SUPPORTED_LOCALES).default('en'),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(24)
    })
);

export const availabilityQuerySchema = stayOrdered(
    z.object({
        ...stayFields,
        locale: z.enum(SUPPORTED_LOCALES).default('en')
    })
);

export const offerTokenParamSchema = z.object({ token: z.string().min(20).max(4000) });

/** The body of a re-quote: nothing but the token, so nothing about money can ride along. */
export const offerQuoteSchema = z.object({ token: z.string().min(1).max(4000) }).strict();
