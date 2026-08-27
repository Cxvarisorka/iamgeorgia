import { localise } from './localise.js';
import { toAmenity } from './amenity.js';
import { toImageAsset } from './media.js';
import { toRatePlan } from './ratePlan.js';

/**
 * Room type responses.
 *
 * The occupancy block is flattened deliberately. A client asking "can my family
 * stay here" should not have to know that `maxOccupancy` is not
 * `maxAdults + maxChildren`, so when the request says who is travelling the
 * server answers `fits` directly and keeps the raw numbers alongside for the
 * admin screens that do need them.
 */

const TRANSLATABLE = ['name', 'description'];

const localiseRoomType = (roomType, locale) =>
    localise(roomType, roomType.translations, locale, TRANSLATABLE);

/**
 * The bed configuration, grouped into its alternatives.
 *
 * Returned as groups rather than a flat list because a flat one reads as "one
 * king AND two twins AND a sofa", which is four more beds than the room has.
 */
const toBedGroups = (beds = []) => {
    const groups = new Map();

    for (const bed of beds) {
        const index = bed.groupIndex ?? 0;

        if (!groups.has(index)) {
            groups.set(index, { groupIndex: index, sleeps: 0, beds: [] });
        }

        const group = groups.get(index);

        group.beds.push({
            code: bed.bedType.code,
            name: bed.bedType.name,
            quantity: bed.quantity,
            sleeps: bed.bedType.sleeps
        });
        group.sleeps += bed.bedType.sleeps * bed.quantity;
    }

    return [...groups.values()].sort((a, b) => a.groupIndex - b.groupIndex);
};

const coverOf = (roomType) => {
    const images = roomType.images ?? [];
    const cover = images.find((image) => image.isCover) ?? images[0];

    return cover ? toImageAsset(cover.fileAsset) : null;
};

export const toRoomTypeSummary = (roomType, locale) => {
    const value = localiseRoomType(roomType, locale);

    return {
        id: value.id,
        hotelId: value.hotelId,
        code: value.code,
        name: value.name,
        status: value.status,
        sortOrder: value.sortOrder,
        roomSizeSqm: value.roomSizeSqm ?? null,
        occupancy: {
            max: value.maxOccupancy,
            maxAdults: value.maxAdults,
            maxChildren: value.maxChildren,
            minAdults: value.minAdults,
            standard: value.standardOccupancy,
            extraBedCapacity: value.extraBedCapacity
        },
        bedGroups: toBedGroups(roomType.beds),
        coverImage: coverOf(roomType),
        // Present only when the request said who is travelling.
        ...(roomType.occupancy
            ? {
                  availability: {
                      fits: roomType.occupancy.fits,
                      reasons: roomType.occupancy.reasons,
                      extraBedsNeeded: roomType.occupancy.extraBedsNeeded,
                      extraGuests: roomType.occupancy.extraGuests
                  }
              }
            : {})
    };
};

export const toRoomTypeDetail = (roomType, locale) => {
    const value = localiseRoomType(roomType, locale);

    return {
        ...toRoomTypeSummary(roomType, locale),
        description: value.description ?? null,
        bathroomType: value.bathroomType,
        smokingAllowed: value.smokingAllowed,
        accessible: value.accessible,
        amenities: (roomType.amenities ?? []).map((entry) => ({
            ...toAmenity(entry.amenity, locale),
            note: entry.note ?? null
        })),
        // The offers this room is sold as. One room, several rate plans, which
        // is the distinction the whole commercial model exists to preserve.
        ratePlans: (roomType.ratePlans ?? []).map(toRatePlan),
        images: (roomType.images ?? []).map((image) => ({
            ...toImageAsset(image.fileAsset),
            roomImageId: image.id,
            caption: image.caption ?? null,
            sortOrder: image.sortOrder,
            isCover: image.isCover
        })),
        createdAt: value.createdAt,
        updatedAt: value.updatedAt
    };
};

export const toRoomTypeTranslation = (translation) => ({
    locale: translation.locale,
    name: translation.name ?? null,
    description: translation.description ?? null,
    updatedAt: translation.updatedAt
});

/**
 * A hotel's child policy.
 *
 * Returns null when the hotel has never set one; the caller falls back to the
 * platform default rather than this pretending the hotel chose it.
 */
export const toChildPolicy = (policy) =>
    policy
        ? {
              infantMaxAge: policy.infantMaxAge,
              childMaxAge: policy.childMaxAge,
              childrenCountTowardOccupancy: policy.childrenCountTowardOccupancy,
              maxChildrenFreePerRoom: policy.maxChildrenFreePerRoom ?? null,
              bands: (policy.bands ?? []).map((band) => ({
                  minAge: band.minAge,
                  maxAge: band.maxAge,
                  label: band.label,
                  chargeMode: band.chargeMode,
                  chargeValue: band.chargeValue,
                  requiresExtraBed: band.requiresExtraBed
              })),
              updatedAt: policy.updatedAt
          }
        : null;
