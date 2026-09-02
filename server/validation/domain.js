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

/**
 * A place worth knowing about near a property.
 *
 * `name`, `type` and `distance` are the original three and are still the only
 * required fields, so every row written before this comment existed still
 * validates. The rest were added for religious facilities — an observant
 * traveller needs to know *which* synagogue and how far it is on foot, not that
 * one exists — and are optional because no existing row has them.
 *
 * Deliberately still Json rather than a table. Nearby places are read whole
 * with the hotel and never queried on their own, which is exactly the rule the
 * schema states. The *filterable* half of the same fact lives elsewhere and
 * already works: `synagogueNearby` and `mikvehNearby` are amenity codes, so
 * "properties with a mikveh nearby" is an indexed filter while "which mikveh,
 * and how far" is display data. When "within 800 m" becomes a filter, this
 * becomes a table with a PostGIS point — the extension and `Hotel.geo` are
 * already there — and that is a migration, not a redesign.
 */
export const nearbyPlaceSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    distance: z.string().min(1),
    /// A machine-readable kind, so the hotel page can group and icon these.
    /// `type` stays as it was: it is the operator's own wording.
    kind: z
        .enum([
            'SYNAGOGUE',
            'MIKVEH',
            'KOSHER_RESTAURANT',
            'KOSHER_SHOP',
            'ERUV',
            'AIRPORT',
            'STATION',
            'LANDMARK',
            'OTHER'
        ])
        .optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    /// Minutes on foot. The number that actually matters on a Shabbat, where a
    /// straight-line distance in kilometres does not.
    walkingMinutes: z.number().int().min(0).max(600).optional()
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
    // Deep-link data and event payloads: an object, shaped by whichever
    // handler wrote it. Constrained so a stray string cannot land in a column
    // the drain reads keys from.
    Notification: {
        payload: openObjectSchema
    },
    OutboxEvent: {
        payload: openObjectSchema
    },
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
    HotelKosherProfile: {
        // A supplier payload that could not be applied because the record is
        // locked. Shapeless by nature — one channel manager's kosher fields are
        // not another's — so it is constrained to an object and no further,
        // exactly like Hotel.externalRef.
        pendingSupplierData: openObjectSchema.nullable()
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
