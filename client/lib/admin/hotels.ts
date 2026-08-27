import type { HotelQuery } from "@/lib/api/hotels";
import type { HotelStatus, PropertyType } from "@/types/catalogue";

/**
 * Display vocabulary for the hotel screens, mirroring `lib/admin/partners.ts`.
 */

export const hotelStatusLabels: Record<HotelStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "On sale",
  INACTIVE: "Off sale",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

export const hotelStatusHints: Record<HotelStatus, string> = {
  DRAFT: "Being set up. Invisible everywhere, including search.",
  ACTIVE: "Visible in search and bookable.",
  INACTIVE: "Temporarily off sale. Still editable, invisible to guests.",
  SUSPENDED: "Taken off sale by the platform.",
  ARCHIVED: "Closed permanently. Bookings against it remain readable.",
};

export const HOTEL_STATUSES: HotelStatus[] = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "ARCHIVED",
];

export const PROPERTY_TYPES: PropertyType[] = [
  "Hotel",
  "Boutique",
  "Resort",
  "Guesthouse",
  "Lodge",
  "Apartment",
  "Chalet",
  "Hostel",
  "Villa",
];

/**
 * Reads a hotel query out of URL params, dropping anything unrecognised so a
 * stale bookmark shows an unfiltered list rather than an error page.
 */
export function hotelQueryFromParams(
  params: Record<string, string | string[] | undefined>,
): HotelQuery {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const status = read("status");
  const propertyType = read("propertyType");
  const page = Number.parseInt(read("page") ?? "", 10);

  return {
    search: read("search") || undefined,
    status: HOTEL_STATUSES.includes(status as HotelStatus) ? (status as HotelStatus) : undefined,
    propertyType: PROPERTY_TYPES.includes(propertyType as PropertyType)
      ? (propertyType as PropertyType)
      : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 25,
  };
}

/** The image to show on a card: the smallest rendition that still reads. */
export function cardImage(cover: { url: string; variants: { variant: string; url: string }[] } | null): string | null {
  if (!cover) return null;

  return cover.variants.find((variant) => variant.variant === "card")?.url ?? cover.url;
}
