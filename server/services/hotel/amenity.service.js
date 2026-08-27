import { prisma } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';

/**
 * The amenity vocabulary.
 *
 * A small, slow-changing reference table seeded by `scripts/seed-amenities.js`
 * and extended by hand from the admin panel. The important property is that it
 * is shared: two hotels claiming "Ski Storage" reference the same row, which is
 * what makes "everywhere in Bakuriani with ski storage" an index scan rather
 * than a string comparison across a text array.
 *
 * Amenities are never deleted once a hotel has claimed one — deactivating is
 * the supported way to retire one, because deleting would silently change what
 * a property claims to offer.
 */

const translationInclude = (locale) =>
    locale && locale !== 'en' ? { where: { locale }, take: 1 } : false;

export const listAmenities = ({ category, scope, includeInactive, locale } = {}) =>
    prisma.amenity.findMany({
        where: {
            ...(includeInactive ? {} : { isActive: true }),
            ...(category ? { category: { in: Array.isArray(category) ? category : [category] } } : {}),
            // BOTH satisfies a request for either scope, so a room-amenity
            // picker offers "Air Conditioning" without listing "Airport
            // Shuttle".
            ...(scope ? { scope: { in: scope === 'BOTH' ? ['BOTH'] : [scope, 'BOTH'] } } : {})
        },
        include: { translations: translationInclude(locale) },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }]
    });

export const findAmenityOr404 = async (id, { locale } = {}) => {
    const amenity = await prisma.amenity.findFirst({
        where: { OR: [{ id }, { code: id }] },
        include: { translations: translationInclude(locale), _count: { select: { hotels: true } } }
    });

    if (!amenity) {
        throw new NotFoundError('Amenity not found');
    }

    return amenity;
};

export const createAmenity = async (input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const amenity = await tx.amenity.create({ data: input });

        await recordAudit(tx, {
            action: 'AMENITY_CREATED',
            actor,
            entityType: AUDIT_ENTITY.amenity,
            entityId: amenity.id,
            summary: `Created amenity ${amenity.name}`,
            metadata: { code: amenity.code, category: amenity.category },
            req
        });

        return amenity;
    });

export const updateAmenity = async (id, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const current = await tx.amenity.findUnique({
            where: { id },
            include: { _count: { select: { hotels: true } } }
        });

        if (!current) {
            throw new NotFoundError('Amenity not found');
        }

        // Deactivating one that hotels still claim is allowed — it stops the
        // amenity being offered on new properties without rewriting history —
        // but it is worth saying so in the audit trail.
        const deactivating = input.isActive === false && current.isActive;

        const amenity = await tx.amenity.update({ where: { id }, data: input });

        await recordAudit(tx, {
            action: 'AMENITY_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.amenity,
            entityId: amenity.id,
            summary: deactivating
                ? `Deactivated amenity ${amenity.name}, still claimed by ${current._count.hotels} hotel(s)`
                : `Updated amenity ${amenity.name}`,
            metadata: { fields: Object.keys(input), hotelCount: current._count.hotels },
            req
        });

        return amenity;
    });

export const upsertAmenityTranslation = async (id, locale, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const amenity = await tx.amenity.findUnique({ where: { id } });

        if (!amenity) {
            throw new NotFoundError('Amenity not found');
        }

        const translation = await tx.amenityTranslation.upsert({
            where: { amenityId_locale: { amenityId: id, locale } },
            create: { amenityId: id, locale, ...input },
            update: input
        });

        await recordAudit(tx, {
            action: 'AMENITY_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.amenity,
            entityId: id,
            summary: `Updated ${locale} translation for ${amenity.name}`,
            metadata: { locale },
            req
        });

        return translation;
    });

/**
 * Replaces a hotel's amenity set in one call.
 *
 * The admin panel edits amenities as a checklist, so the natural API is "here
 * is the whole set" rather than a stream of add/remove calls — one request,
 * one audit row, and no window in which a hotel is half-updated.
 */
export const setHotelAmenities = async (tx, hotelId, entries) => {
    const codes = entries.map(({ amenityId }) => amenityId);
    const found = await tx.amenity.findMany({ where: { id: { in: codes } }, select: { id: true } });

    if (found.length !== new Set(codes).size) {
        const known = new Set(found.map(({ id }) => id));
        throw new ConflictError('One or more amenities do not exist', {
            unknown: [...new Set(codes)].filter((id) => !known.has(id))
        });
    }

    await tx.hotelAmenity.deleteMany({ where: { hotelId } });

    if (entries.length > 0) {
        await tx.hotelAmenity.createMany({
            data: entries.map(({ amenityId, note }) => ({ hotelId, amenityId, note: note ?? null }))
        });
    }
};
