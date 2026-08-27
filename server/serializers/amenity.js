import { localise } from './localise.js';

/**
 * Amenity responses.
 *
 * `code` is included on purpose and is the field clients should key on: the
 * client's icon map and any saved filter both reference it, and unlike `id` it
 * is stable across a database rebuild.
 */

const TRANSLATABLE = ['name'];

export const toAmenity = (amenity, locale) => {
    const value = localise(amenity, amenity.translations, locale, TRANSLATABLE);

    return {
        id: value.id,
        code: value.code,
        name: value.name,
        category: value.category,
        scope: value.scope,
        icon: value.icon ?? null,
        sortOrder: value.sortOrder,
        isActive: value.isActive,
        ...(value._count ? { hotelCount: value._count.hotels ?? 0 } : {})
    };
};

/**
 * An amenity as it hangs off a hotel, carrying that property's own note.
 *
 * The note is why `hotel_amenities` is a table with a column rather than an
 * array of ids: "Parking, 15 GEL per night" is true of one hotel, not of the
 * amenity.
 */
export const toHotelAmenity = (hotelAmenity, locale) => ({
    ...toAmenity(hotelAmenity.amenity, locale),
    note: hotelAmenity.note ?? null
});

export const toAmenityTranslation = (translation) => ({
    locale: translation.locale,
    name: translation.name ?? null,
    updatedAt: translation.updatedAt
});
