import { prisma } from '../../db/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { DEFAULT_CHILD_POLICY, resolveOccupancy } from './occupancy.service.js';

/**
 * Room types.
 *
 * The physical product, and the thing daily inventory will be counted on in
 * Phase 4. Everything commercial — price, meal plan, cancellation terms — hangs
 * off RatePlan instead, which is what stops a hotel needing three "Deluxe
 * Double" room types just because it sells the room three ways.
 *
 * Scoped to a hotel throughout: every function takes `hotelId` and every lookup
 * filters on it, so a room type id from one hotel cannot be used to reach
 * another's. That is the same shape the supplier ownership checks will need in
 * Phase 7.
 */

const translationInclude = (locale) =>
    locale && locale !== 'en' ? { where: { locale }, take: 1 } : false;

const detailInclude = (locale) => ({
    beds: { include: { bedType: true }, orderBy: [{ groupIndex: 'asc' }, { bedType: { sortOrder: 'asc' } }] },
    amenities: {
        include: { amenity: { include: { translations: translationInclude(locale) } } },
        orderBy: { amenity: { sortOrder: 'asc' } }
    },
    images: {
        include: { fileAsset: { include: { variants: true } } },
        orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }]
    },
    translations: translationInclude(locale)
});

const assertHotel = async (client, hotelId) => {
    const hotel = await client.hotel.findUnique({ where: { id: hotelId }, include: { childPolicy: true } });

    if (!hotel) {
        throw new NotFoundError('Hotel not found');
    }

    return hotel;
};

export const childPolicyFor = (hotel) => {
    if (!hotel?.childPolicy) {
        return DEFAULT_CHILD_POLICY;
    }

    const { infantMaxAge, childMaxAge, childrenCountTowardOccupancy, maxChildrenFreePerRoom } = hotel.childPolicy;

    return { infantMaxAge, childMaxAge, childrenCountTowardOccupancy, maxChildrenFreePerRoom };
};

export const findRoomTypeOr404 = async (hotelId, roomTypeId, { locale } = {}) => {
    const roomType = await prisma.roomType.findFirst({
        // Both halves matter: filtering on hotelId is what stops a room type id
        // from one property being read through another's URL.
        where: { id: roomTypeId, hotelId },
        include: detailInclude(locale)
    });

    if (!roomType) {
        throw new NotFoundError('Room type not found');
    }

    return roomType;
};

export const listRoomTypes = async (hotelId, { status, locale, adults, childAges } = {}) => {
    const hotel = await assertHotel(prisma, hotelId);

    const roomTypes = await prisma.roomType.findMany({
        where: {
            hotelId,
            ...(status ? { status: { in: Array.isArray(status) ? status : [status] } } : {})
        },
        include: detailInclude(locale),
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    // When the caller says who is travelling, annotate rather than filter: the
    // admin room list needs to show "this one does not fit, and here is why",
    // and search needs the same answer for a different reason.
    if (adults === undefined) {
        return { roomTypes, hotel };
    }

    const childPolicy = childPolicyFor(hotel);
    const ages = childAges === undefined ? [] : Array.isArray(childAges) ? childAges : [childAges];

    return {
        hotel,
        roomTypes: roomTypes.map((roomType) => ({
            ...roomType,
            occupancy: resolveOccupancy({ roomType, childPolicy, adults, childAges: ages })
        }))
    };
};

export const createRoomType = async (hotelId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await assertHotel(tx, hotelId);

        if (hotel.status === 'ARCHIVED') {
            throw new ConflictError('An archived hotel cannot be edited', { status: hotel.status });
        }

        const existing = await tx.roomType.count({ where: { hotelId } });

        const roomType = await tx.roomType.create({
            data: { ...input, hotelId, sortOrder: input.sortOrder ?? existing }
        });

        await recordAudit(tx, {
            action: 'ROOM_TYPE_CREATED',
            actor,
            entityType: AUDIT_ENTITY.roomType,
            entityId: roomType.id,
            summary: `Added room type ${roomType.name} to ${hotel.name}`,
            metadata: { hotelId, code: roomType.code, maxOccupancy: roomType.maxOccupancy },
            req
        });

        return roomType;
    });

export const updateRoomType = async (hotelId, roomTypeId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const current = await tx.roomType.findFirst({ where: { id: roomTypeId, hotelId } });

        if (!current) {
            throw new NotFoundError('Room type not found');
        }

        if (current.status === 'ARCHIVED') {
            throw new ConflictError('An archived room type cannot be edited', { status: current.status });
        }

        // The four occupancy numbers constrain each other, and a PATCH that
        // changes one of them has to be checked against the three it did not.
        // Validating only the submitted fields would let `maxOccupancy: 1` past
        // on a room that still claims to take two adults.
        const merged = { ...current, ...input };

        if (
            merged.maxAdults > merged.maxOccupancy ||
            merged.maxChildren > merged.maxOccupancy ||
            merged.minAdults > merged.maxAdults ||
            merged.standardOccupancy > merged.maxOccupancy
        ) {
            throw new BadRequestError('The occupancy limits contradict each other', {
                maxOccupancy: merged.maxOccupancy,
                maxAdults: merged.maxAdults,
                maxChildren: merged.maxChildren,
                minAdults: merged.minAdults,
                standardOccupancy: merged.standardOccupancy
            });
        }

        const roomType = await tx.roomType.update({ where: { id: roomTypeId }, data: input });

        await recordAudit(tx, {
            action: 'ROOM_TYPE_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.roomType,
            entityId: roomTypeId,
            summary: `Updated room type ${roomType.name}`,
            metadata: { hotelId, fields: Object.keys(input) },
            req
        });

        return roomType;
    });

/**
 * Archive rather than delete, for the same reason hotels archive: once Phase 6
 * lands, a booking has to keep resolving to the room it was made against.
 */
export const archiveRoomType = async (hotelId, roomTypeId, actor, req) =>
    prisma.$transaction(async (tx) => {
        const roomType = await tx.roomType.findFirst({ where: { id: roomTypeId, hotelId } });

        if (!roomType) {
            throw new NotFoundError('Room type not found');
        }

        if (roomType.status === 'ARCHIVED') {
            throw new ConflictError('This room type is already archived', { status: roomType.status });
        }

        const archived = await tx.roomType.update({
            where: { id: roomTypeId },
            data: { status: 'ARCHIVED' }
        });

        await recordAudit(tx, {
            action: 'ROOM_TYPE_ARCHIVED',
            actor,
            entityType: AUDIT_ENTITY.roomType,
            entityId: roomTypeId,
            summary: `Archived room type ${roomType.name}`,
            metadata: { hotelId, from: roomType.status },
            req
        });

        return archived;
    });

/**
 * Replaces the bed configuration whole.
 *
 * Beds are edited as a set in the admin panel, so the natural API is "here is
 * the configuration" rather than a stream of add and remove calls — one
 * request, one audit row, and no window in which a room has half its beds.
 */
export const setBeds = async (hotelId, roomTypeId, beds, actor, req) =>
    prisma.$transaction(async (tx) => {
        const roomType = await tx.roomType.findFirst({ where: { id: roomTypeId, hotelId } });

        if (!roomType) {
            throw new NotFoundError('Room type not found');
        }

        const codes = [...new Set(beds.map(({ bedTypeCode }) => bedTypeCode))];
        const bedTypes = await tx.bedType.findMany({ where: { code: { in: codes } } });
        const byCode = new Map(bedTypes.map((bedType) => [bedType.code, bedType.id]));

        const unknown = codes.filter((code) => !byCode.has(code));

        if (unknown.length > 0) {
            throw new ConflictError('One or more bed types do not exist', { unknown });
        }

        // The unique constraint is (roomTypeId, groupIndex, bedTypeId), so the
        // same bed twice in one group is a caller error, not two rows.
        const seen = new Set();

        for (const { bedTypeCode, groupIndex } of beds) {
            const slot = `${groupIndex}:${bedTypeCode}`;

            if (seen.has(slot)) {
                throw new BadRequestError('The same bed type appears twice in one group — use quantity instead', {
                    bedTypeCode,
                    groupIndex
                });
            }

            seen.add(slot);
        }

        await tx.roomBed.deleteMany({ where: { roomTypeId } });

        if (beds.length > 0) {
            await tx.roomBed.createMany({
                data: beds.map(({ bedTypeCode, quantity, groupIndex }) => ({
                    roomTypeId,
                    bedTypeId: byCode.get(bedTypeCode),
                    quantity,
                    groupIndex
                }))
            });
        }

        await recordAudit(tx, {
            action: 'ROOM_TYPE_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.roomType,
            entityId: roomTypeId,
            summary: `Set the bed configuration on ${roomType.name}`,
            metadata: { hotelId, beds: beds.length },
            req
        });

        return roomType;
    });

export const setRoomTypeAmenities = async (hotelId, roomTypeId, entries, actor, req) =>
    prisma.$transaction(async (tx) => {
        const roomType = await tx.roomType.findFirst({ where: { id: roomTypeId, hotelId } });

        if (!roomType) {
            throw new NotFoundError('Room type not found');
        }

        const ids = [...new Set(entries.map(({ amenityId }) => amenityId))];
        const found = await tx.amenity.findMany({ where: { id: { in: ids } }, select: { id: true, scope: true } });
        const byId = new Map(found.map((amenity) => [amenity.id, amenity]));

        const unknown = ids.filter((id) => !byId.has(id));

        if (unknown.length > 0) {
            throw new ConflictError('One or more amenities do not exist', { unknown });
        }

        // Scope is why the amenity table carries one: "Airport Shuttle" is
        // never a property of a room, and offering it here would produce a
        // room card that claims the hotel's facilities as its own.
        const wrongScope = ids.filter((id) => byId.get(id).scope === 'HOTEL');

        if (wrongScope.length > 0) {
            throw new ConflictError('One or more amenities cannot be applied to a room', { wrongScope });
        }

        await tx.roomTypeAmenity.deleteMany({ where: { roomTypeId } });

        if (entries.length > 0) {
            await tx.roomTypeAmenity.createMany({
                data: entries.map(({ amenityId, note }) => ({ roomTypeId, amenityId, note: note ?? null }))
            });
        }

        await recordAudit(tx, {
            action: 'ROOM_TYPE_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.roomType,
            entityId: roomTypeId,
            summary: `Set ${entries.length} amenities on ${roomType.name}`,
            metadata: { hotelId, count: entries.length },
            req
        });

        return roomType;
    });

export const upsertRoomTypeTranslation = async (hotelId, roomTypeId, locale, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const roomType = await tx.roomType.findFirst({ where: { id: roomTypeId, hotelId } });

        if (!roomType) {
            throw new NotFoundError('Room type not found');
        }

        const translation = await tx.roomTypeTranslation.upsert({
            where: { roomTypeId_locale: { roomTypeId, locale } },
            create: { roomTypeId, locale, ...input },
            update: input
        });

        await recordAudit(tx, {
            action: 'ROOM_TYPE_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.roomType,
            entityId: roomTypeId,
            summary: `Updated the ${locale} translation for ${roomType.name}`,
            metadata: { hotelId, locale },
            req
        });

        return translation;
    });
