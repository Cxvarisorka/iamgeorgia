import { z } from 'zod';

import { textField } from './normalize.js';

/**
 * Driver ratings.
 *
 * A score and, optionally, a few words. Nothing here names the driver: the
 * leg does, and the driver is whoever completed it.
 */

const RATING_STATUSES = ['PENDING', 'PUBLISHED', 'REJECTED'];

const idField = z.string().min(1).max(64);

export const submitRatingSchema = z
    .object({
        score: z.number().int().min(1).max(5),
        comment: textField(2000).nullish()
    })
    .strict();

export const guestRatingSchema = submitRatingSchema.extend({
    token: z.string().min(20).max(2000)
});

export const moderateRatingSchema = z
    .object({
        note: textField(1000).nullish()
    })
    .strict();

export const ratingQuerySchema = z
    .object({
        status: z.union([z.enum(RATING_STATUSES), z.array(z.enum(RATING_STATUSES))]).optional(),
        driverId: idField.optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25)
    })
    .strict();

export const ratingParamSchema = z.object({ id: idField });

export const legIndexParamSchema = z.object({
    reference: z.string().trim().toUpperCase().regex(/^TRF-\d{6}$/),
    legIndex: z.coerce.number().int().min(0).max(9)
});
