import { addDaysISO, todayISO } from "@/lib/booking/stay";
import type { TourAvailability, TourCategory, TourOfferAvailable } from "@/types/tour";

/**
 * The departure a visitor is shopping for: a date and a party.
 *
 * Like a hotel stay, it lives in the URL rather than in React state — every
 * price on a tour page is a server render from these exact parameters, and a
 * traveller comparing two journeys expects both tabs to show the same date.
 *
 * Child *ages* rather than a count, for the same reason the hotel search takes
 * them: an infant rides free and a child is priced on a band, and the server
 * cannot place either without the age.
 */
export interface TourStay {
  date: string;
  adults: number;
  childAges: number[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isDateOnly = (value: unknown): value is string =>
  typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Mirrors `validation/tour.js`, so the form can refuse before the server does. */
export function isValidTourStay(stay: TourStay | null): stay is TourStay {
  if (!stay) return false;
  if (!isDateOnly(stay.date)) return false;
  if (!Number.isInteger(stay.adults) || stay.adults < 1 || stay.adults > 60) return false;

  return stay.childAges.every((age) => Number.isInteger(age) && age >= 0 && age <= 17);
}

/** A week from today, two adults — what an empty picker means. */
export const defaultTourStay = (): TourStay => ({
  date: addDaysISO(todayISO(), 7),
  adults: 2,
  childAges: [],
});

type ParamValue = string | string[] | undefined;

const first = (value: ParamValue): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const asList = (value: ParamValue): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Reads a departure query out of URL params.
 *
 * Null when there is no date — that is a visitor browsing, not a failed
 * search — and null for a malformed one, so a stale bookmark shows the picker
 * rather than a crash.
 */
export function tourStayFromParams(params: Record<string, ParamValue>): TourStay | null {
  const date = first(params.date);

  if (!date) return null;

  const adults = Number.parseInt(first(params.adults) ?? "2", 10);
  const stay: TourStay = {
    date,
    adults: Number.isFinite(adults) ? adults : 2,
    childAges: asList(params.childAges)
      .map((age) => Number.parseInt(age, 10))
      .filter((age) => Number.isInteger(age)),
  };

  return isValidTourStay(stay) ? stay : null;
}

/** A departure query as a query string, for building an href. */
export const tourStayQueryString = (stay: TourStay): string => {
  const params = new URLSearchParams();

  params.set("date", stay.date);
  params.set("adults", String(stay.adults));
  for (const age of stay.childAges) params.append("childAges", String(age));

  return `?${params.toString()}`;
};

/**
 * The window a tour page prices.
 *
 * Two weeks from the chosen date, so a traveller who asked for a Tuesday can
 * see that the shared departure runs on Saturdays without a second search.
 * Well inside the server's 62-day cap.
 */
export const TOUR_WINDOW_DAYS = 14;

export const tourWindowFor = (stay: TourStay): { from: string; to: string } => ({
  from: stay.date,
  to: addDaysISO(stay.date, TOUR_WINDOW_DAYS - 1),
});

// --- catalogue vocabulary ---------------------------------------------------

/**
 * Filter vocabulary shared by the tours index controls.
 *
 * Values only — the words come from `t.tours.categories` and
 * `t.tours.durations`, keyed by exactly these strings.
 */
export const tourCategories: TourCategory[] = ["adventure", "culture", "wine", "nature", "city"];

export type TourDurationBucket = "1" | "2-3" | "4-6" | "7";

export const tourDurations: TourDurationBucket[] = ["1", "2-3", "4-6", "7"];

/** Matches a tour's day count against the duration filter buckets. */
export function matchesDuration(days: number, bucket: string): boolean {
  if (bucket === "1") return days === 1;
  if (bucket === "2-3") return days >= 2 && days <= 3;
  if (bucket === "4-6") return days >= 4 && days <= 6;

  return days >= 7;
}

// --- images -----------------------------------------------------------------

/**
 * The image to show for a tour: the gallery cover's card rendition when the
 * operator has uploaded one, else the editorial path under /public.
 */
export function tourImageUrl(tour: {
  image: string | null;
  coverImage: { url: string; variants: { variant: string; url: string }[] } | null;
}): string | null {
  if (tour.coverImage) {
    return (
      tour.coverImage.variants.find((variant) => variant.variant === "card")?.url ??
      tour.coverImage.url
    );
  }

  return tour.image || null;
}

// --- offers -----------------------------------------------------------------

/**
 * The cheapest thing anyone could actually book in the window, for the
 * sidebar and the mobile bar. Pure, and here rather than beside the client
 * component that lists departures: a Server Component may not call a
 * function exported from a "use client" module.
 */
export const cheapestTourOffer = (
  availability: TourAvailability | null,
): TourOfferAvailable | null =>
  availability?.options
    .flatMap((entry) => entry.dates)
    .filter((offer): offer is TourOfferAvailable => offer.available)
    .reduce<TourOfferAvailable | null>(
      (best, offer) =>
        best === null || offer.quote.totals.totalCents < best.quote.totals.totalCents ? offer : best,
      null,
    ) ?? null;
