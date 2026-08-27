import type { BookingQuery, HotelBookingStatus } from "@/types/booking";

/**
 * Display vocabulary for bookings, mirroring `lib/admin/partners.ts`.
 *
 * The labels live here rather than in components so two screens cannot end up
 * calling the same state different things, and so the eventual translation pass
 * has one file to work through rather than nine.
 */

export const bookingStatusLabels: Record<HotelBookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No show",
};

/** What each state means for the operator, shown under a filter. */
export const bookingStatusHints: Record<HotelBookingStatus, string> = {
  PENDING: "Held but not yet confirmed.",
  CONFIRMED: "Rooms are committed and the guest has been told.",
  CANCELLED: "Rooms released. Any charge follows the terms agreed at booking.",
  COMPLETED: "The stay has finished.",
  NO_SHOW: "The guest never arrived.",
};

export const BOOKING_STATUSES: HotelBookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
];

/** The states that still owe the operator something. */
export const ACTIVE_BOOKING_STATUSES: HotelBookingStatus[] = ["PENDING", "CONFIRMED"];

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * A stay date, formatted without a time zone conversion.
 *
 * These arrive as `YYYY-MM-DD` — a calendar date at the property, not an
 * instant — so they are parsed as UTC and read back as UTC. Letting the
 * browser's zone touch them is how a booking appears to start a day early for
 * anyone west of the property.
 */
export const formatStayDate = (value: string): string =>
  DATE.format(new Date(`${value}T00:00:00Z`));

/** An actual instant: created, confirmed, cancelled, a cancellation deadline. */
export const formatInstant = (value: string | null | undefined): string =>
  value ? DATE_TIME.format(new Date(value)) : "—";

/** "1 – 4 Jun 2027 · 3 nights" */
export const formatStay = (checkIn: string, checkOut: string, nights: number): string =>
  `${formatStayDate(checkIn)} – ${formatStayDate(checkOut)} · ${nights} ${nights === 1 ? "night" : "nights"}`;

/**
 * Reads a booking query out of URL search params.
 *
 * Unrecognised values are dropped rather than rejected, so a stale bookmark or
 * a hand-edited URL shows an unfiltered list instead of an error page — the
 * same forgiving treatment `partnerQueryFromParams` already gives.
 */
export function bookingQueryFromParams(
  params: Record<string, string | string[] | undefined>,
  options: { lockedStatuses?: HotelBookingStatus[] } = {},
): BookingQuery {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const requested = params.status;
  const asArray = Array.isArray(requested) ? requested : requested ? [requested] : [];
  const valid = asArray.filter((value): value is HotelBookingStatus =>
    BOOKING_STATUSES.includes(value as HotelBookingStatus),
  );

  const page = Number.parseInt(read("page") ?? "", 10);

  return {
    status: options.lockedStatuses ?? (valid.length > 0 ? valid : undefined),
    search: read("search") || undefined,
    from: read("from") || undefined,
    to: read("to") || undefined,
    hotelId: read("hotelId") || undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 25,
  };
}
