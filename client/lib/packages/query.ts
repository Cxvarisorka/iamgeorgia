import { addDaysISO, todayISO } from "@/lib/booking/stay";
import type { PackageQuote, QuotedComponent, ResolvedHotelSlot, ResolvedServiceSlot, ResolvedTourSlot, ResolvedTransferSlot } from "@/types/package";

/**
 * What a visitor is shopping for on a package page: a start date, a party and
 * the choices they have made within the slots.
 *
 * It lives in the URL for the same reason a hotel stay does — every price on
 * the page is a server render from these exact parameters, and two tabs
 * comparing two packages must not disagree about the party.
 *
 * `choices` is the one piece that would be unreadable spelled out as separate
 * parameters (a rate plan for slot 0, a vehicle for slot 1, an option for slot
 * 2), so it travels as one JSON object, exactly as the server's schema reads
 * it. `exclude` is the optional slots the buyer switched off.
 */

/** One slot's choice. Which key matters depends on the slot's type. */
export interface SlotChoice {
  hotelId?: string;
  ratePlanId?: string;
  vehicleId?: string;
  tourOptionId?: string;
}

export interface PackageSearch {
  startDate: string;
  adults: number;
  childAges: number[];
  rooms: number;
  choices: Record<number, SlotChoice>;
  exclude: number[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isDateOnly = (value: unknown): value is string =>
  typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Mirrors `validation/package.js`, so the form refuses before the server does. */
export function isValidPackageSearch(search: PackageSearch | null): search is PackageSearch {
  if (!search) return false;
  if (!isDateOnly(search.startDate)) return false;
  if (!Number.isInteger(search.adults) || search.adults < 1 || search.adults > 60) return false;
  if (!Number.isInteger(search.rooms) || search.rooms < 1 || search.rooms > 9) return false;

  return search.childAges.every((age) => Number.isInteger(age) && age >= 0 && age <= 17);
}

/** Three weeks out, two adults, one room — what an empty picker means. */
export const defaultPackageSearch = (): PackageSearch => ({
  startDate: addDaysISO(todayISO(), 21),
  adults: 2,
  childAges: [],
  rooms: 1,
  choices: {},
  exclude: [],
});

type ParamValue = string | string[] | undefined;

const first = (value: ParamValue): string | undefined => (Array.isArray(value) ? value[0] : value);

const asList = (value: ParamValue): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * A choices object out of its URL parameter.
 *
 * Anything unparseable becomes "no choices" rather than an error: a truncated
 * link should show the package with its cheapest slots, not a broken page.
 */
export function parseChoices(raw: string | undefined): Record<number, SlotChoice> {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const choices: Record<number, SlotChoice> = {};

    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const slotIndex = Number.parseInt(key, 10);

      if (!Number.isInteger(slotIndex) || slotIndex < 0) continue;
      if (!value || typeof value !== "object") continue;

      choices[slotIndex] = value as SlotChoice;
    }

    return choices;
  } catch {
    return {};
  }
}

/**
 * Reads a package search out of URL params.
 *
 * Null when there is no start date — that is a visitor browsing rather than a
 * failed search — and null for a malformed one, so a stale bookmark shows the
 * picker instead of a crash.
 */
export function packageSearchFromParams(
  params: Record<string, ParamValue>,
): PackageSearch | null {
  const startDate = first(params.startDate);

  if (!startDate) return null;

  const adults = Number.parseInt(first(params.adults) ?? "2", 10);
  const rooms = Number.parseInt(first(params.rooms) ?? "1", 10);

  const search: PackageSearch = {
    startDate,
    adults: Number.isFinite(adults) ? adults : 2,
    rooms: Number.isFinite(rooms) ? rooms : 1,
    childAges: asList(params.childAges)
      .map((age) => Number.parseInt(age, 10))
      .filter((age) => Number.isInteger(age)),
    choices: parseChoices(first(params.choices)),
    exclude: asList(params.exclude)
      .map((slot) => Number.parseInt(slot, 10))
      .filter((slot) => Number.isInteger(slot)),
  };

  return isValidPackageSearch(search) ? search : null;
}

/** The search as a query string, for an href or a router push. */
export function packageSearchQueryString(search: PackageSearch): string {
  const params = new URLSearchParams();

  params.set("startDate", search.startDate);
  params.set("adults", String(search.adults));
  if (search.rooms !== 1) params.set("rooms", String(search.rooms));
  for (const age of search.childAges) params.append("childAges", String(age));
  if (Object.keys(search.choices).length > 0) params.set("choices", JSON.stringify(search.choices));
  for (const slot of search.exclude) params.append("exclude", String(slot));

  return `?${params.toString()}`;
}

/** The same, shaped for `lib/api/packages.ts`. */
export const packageQuoteQuery = (search: PackageSearch, locale?: string) => ({
  startDate: search.startDate,
  adults: search.adults,
  childAges: search.childAges,
  rooms: search.rooms,
  choices:
    Object.keys(search.choices).length > 0 ? JSON.stringify(search.choices) : undefined,
  exclude: search.exclude.length > 0 ? search.exclude : undefined,
  locale,
});

// --- reading a quote --------------------------------------------------------

/**
 * Narrowing helpers for a resolved slot.
 *
 * The union is discriminated by the *component's* type rather than by a field
 * on the resolved object, because the server shapes each branch to what that
 * product's summary needs. Each helper takes the whole component so the
 * discriminant travels with the value.
 */
export const resolvedHotel = (component: QuotedComponent): ResolvedHotelSlot | null =>
  component.componentType === "HOTEL_STAY" ? (component.resolved as ResolvedHotelSlot | null) : null;

export const resolvedTransfer = (component: QuotedComponent): ResolvedTransferSlot | null =>
  component.componentType === "TRANSFER" ? (component.resolved as ResolvedTransferSlot | null) : null;

export const resolvedTour = (component: QuotedComponent): ResolvedTourSlot | null =>
  component.componentType === "TOUR" ? (component.resolved as ResolvedTourSlot | null) : null;

export const resolvedService = (component: QuotedComponent): ResolvedServiceSlot | null =>
  component.componentType === "SERVICE" ? (component.resolved as ResolvedServiceSlot | null) : null;

/** The day of the trip a slot falls on, from its resolved dates. */
export function slotDate(quote: PackageQuote, component: QuotedComponent): string | null {
  const hotel = resolvedHotel(component);
  if (hotel) return hotel.checkIn;

  const transfer = resolvedTransfer(component);
  if (transfer) return transfer.legs[0]?.pickupAt.slice(0, 10) ?? null;

  const tour = resolvedTour(component);
  if (tour) return tour.date;

  const service = resolvedService(component);
  if (service) return service.date;

  return quote.startDate;
}

/** Anything on request: the checkout has to say so before the card is taken. */
export const hasOnRequestSlot = (quote: PackageQuote): boolean =>
  quote.components.some((component) => {
    if (!component.included) return false;

    const tour = resolvedTour(component);
    if (tour?.option.confirmationMode === "ON_REQUEST") return true;

    const service = resolvedService(component);

    return service?.service.confirmationMode === "ON_REQUEST";
  });

/** Slots that hold inventory, and so need a countdown at checkout. */
export const holdableSlots = (quote: PackageQuote): number[] =>
  quote.components
    .filter(
      (component) =>
        component.included &&
        component.resolved !== null &&
        (component.componentType === "HOTEL_STAY" || component.componentType === "TOUR"),
    )
    .map((component) => component.slotIndex);

// --- images -----------------------------------------------------------------

/** The gallery cover's card rendition, else the editorial path under /public. */
export function packageImageUrl(pkg: {
  image: string | null;
  coverImage: { url: string; variants: { variant: string; url: string }[] } | null;
}): string | null {
  if (pkg.coverImage) {
    return (
      pkg.coverImage.variants.find((variant) => variant.variant === "card")?.url ??
      pkg.coverImage.url
    );
  }

  return pkg.image || null;
}

// --- catalogue vocabulary ---------------------------------------------------

export type PackageDurationBucket = "2-3" | "4-6" | "7";

export const packageDurations: PackageDurationBucket[] = ["2-3", "4-6", "7"];

/** The nights range a duration bucket stands for, for the listing query. */
export function durationRange(bucket: string): { minNights?: number; maxNights?: number } {
  if (bucket === "2-3") return { minNights: 2, maxNights: 3 };
  if (bucket === "4-6") return { minNights: 4, maxNights: 6 };
  if (bucket === "7") return { minNights: 7 };

  return {};
}
