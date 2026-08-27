import { z } from 'zod';

// Shapes for the Json columns in prisma/schema.prisma. Postgres will accept
// any JSON in those columns, so these schemas are the only thing standing
// between a typo and a page that crashes at render time. They mirror the
// interfaces in client/types/*.ts.

export const galleryImageSchema = z.object({
    src: z.string().min(1),
    alt: z.string().min(1)
});

export const gallerySchema = z.array(galleryImageSchema);

export const attractionSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1)
});

export const travelInfoSchema = z.object({
    bestTime: z.string().min(1),
    gettingThere: z.string().min(1),
    gettingAround: z.string().min(1),
    language: z.string().min(1)
});

export const reviewCategoryScoreSchema = z.object({
    label: z.string().min(1),
    score: z.number().min(0).max(10)
});

// Two schemas, one shape. A hotel is created as a DRAFT and filled in over
// eleven wizard steps, so the column has to accept a half-written policies
// object; refusing one would make the wizard unimplementable. Completeness is
// therefore not a storage rule but a publishing rule — `hotelPoliciesSchema`
// guards the shape on every write, and `completeHotelPoliciesSchema` is what
// the publish check runs before a hotel may go ACTIVE.
const hotelPolicyFields = {
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
    cancellation: z.string().min(1),
    children: z.string().min(1),
    pets: z.string().min(1),
    payment: z.string().min(1),
    rules: z.array(z.string().min(1))
};

export const completeHotelPoliciesSchema = z.object(hotelPolicyFields);
export const hotelPoliciesSchema = completeHotelPoliciesSchema.partial();

export const nearbyPlaceSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    distance: z.string().min(1)
});

export const expectationStepSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1)
});

export const socialLinkSchema = z.object({
    label: z.string().min(1),
    url: z.string().min(1)
});

export const partnerDocumentSchema = z.object({
    label: z.string().min(1),
    received: z.boolean()
});

// Prefill and audit metadata are open-ended by design — the first is whatever
// subset of a form an admin filled in, the second is whatever detail an action
// is worth recording. Constrained to an object so a stray array or string
// cannot land in a column the panel will try to read keys from.
const openObjectSchema = z.record(z.string(), z.unknown());

// Which Json field on which model is validated by which schema. The Prisma
// extension in db/index.js walks this map on every write.
export const jsonFieldSchemas = {
    Destination: {
        gallery: gallerySchema,
        attractions: z.array(attractionSchema),
        // Nullable, not optional: the extension skips `undefined` but does
        // validate an explicit null, and a destination can exist before anyone
        // has written its editorial travel notes.
        travelInfo: travelInfoSchema.nullable()
    },
    Hotel: {
        categoryScores: z.array(reviewCategoryScoreSchema),
        policies: hotelPoliciesSchema,
        nearby: z.array(nearbyPlaceSchema),
        // Whatever the availability provider needs to identify this property
        // upstream. Shapeless by nature — one channel manager's identifiers are
        // not another's — so it is constrained to an object and no further.
        externalRef: openObjectSchema.nullable()
    },
    HotelTranslation: {
        policies: hotelPoliciesSchema.nullable()
    },
    Tour: {
        gallery: gallerySchema
    },
    Experience: {
        gallery: gallerySchema,
        whatToExpect: z.array(expectationStepSchema)
    },
    Partner: {
        socialLinks: z.array(socialLinkSchema),
        documents: z.array(partnerDocumentSchema)
    },
    Invitation: {
        prefill: openObjectSchema
    },
    AuditLog: {
        metadata: openObjectSchema
    }
};
