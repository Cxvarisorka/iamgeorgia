import { z } from 'zod';

import { emailField, nameField, phoneField, textField } from './normalize.js';
import { dateOnlyField } from './ratePlan.js';

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
const GUEST_TYPES = ['ADULT', 'CHILD', 'INFANT'];

export const holdSchema = z.object({ token: z.string().min(20).max(4000) }).strict();

export const holdTokenParamSchema = z.object({ token: z.string().min(10).max(200) });

export const referenceParamSchema = z.object({ reference: z.string().min(1).max(64) });

/**
 * Proof that an anonymous caller is the guest who booked.
 *
 * Ignored for a signed-in admin or partner, whose session already proves it.
 */
export const guestLookupSchema = z.object({ email: emailField.optional() });

/**
 * A confirmation request.
 *
 * Note what is absent: any amount at all. The request carries identifiers,
 * dates and people; every figure is recomputed server-side. A body that could
 * name a price would be a body that could set one.
 */
export const confirmBookingSchema = z
    .object({
        // Either a hold taken at checkout, or an offer straight from search for
        // a server-to-server booking that has no checkout page.
        holdToken: z.string().min(10).max(200).optional(),
        offerToken: z.string().min(20).max(4000).optional(),

        leadGuest: z
            .object({
                firstName: nameField,
                lastName: nameField,
                email: emailField,
                phone: phoneField.optional()
            })
            .strict(),

        guests: z
            .array(
                z
                    .object({
                        type: z.enum(GUEST_TYPES).default('ADULT'),
                        firstName: nameField,
                        lastName: nameField,
                        age: z.number().int().min(0).max(120).optional()
                    })
                    .strict()
            )
            .max(20)
            .optional(),

        specialRequests: textField(1000).optional(),
        source: z.enum(['web', 'partner', 'admin']).default('web'),

        // Supplied by the client when it can; derived from the request when it
        // cannot. Either way a retry returns the original booking.
        idempotencyKey: z.string().min(8).max(200).optional()
    })
    .strict()
    .refine((value) => Boolean(value.holdToken) !== Boolean(value.offerToken), {
        message: 'Provide either a holdToken or an offerToken, not both',
        path: ['holdToken']
    });

export const cancelBookingSchema = z
    .object({ reason: textField(500).optional(), email: emailField.optional() })
    .strict()
    .optional()
    .default({});

export const bookingQuerySchema = z.object({
    status: z.union([z.enum(BOOKING_STATUSES), z.array(z.enum(BOOKING_STATUSES))]).optional(),
    hotelId: z.string().min(1).optional(),
    partnerId: z.string().min(1).optional(),
    from: dateOnlyField.optional(),
    to: dateOnlyField.optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

/**
 * An amendment to a booking.
 *
 * What is absent is the whole design. No dates, no room, no rate, no party, no
 * amount: changing any of those changes what was sold and what it costs, and
 * that is a cancellation and a fresh booking, not an edit — the inventory has
 * to be released and re-claimed and the price re-quoted. What is left is the
 * paperwork around the sale: who is arriving, how to reach them, and what the
 * property should be told.
 *
 * `email` is not the lead guest's new address — it is the proof an anonymous
 * guest offers that the booking is theirs, exactly as `cancelBookingSchema`
 * uses it. The address being *changed* is `leadGuest.email`.
 */
export const amendBookingSchema = z
    .object({
        leadGuest: z
            .object({
                firstName: nameField.optional(),
                lastName: nameField.optional(),
                email: emailField.optional(),
                // Null clears it; the field is optional on the booking.
                phone: phoneField.nullish()
            })
            .strict()
            .optional(),

        specialRequests: textField(1000).nullish(),

        email: emailField.optional()
    })
    .strict();
