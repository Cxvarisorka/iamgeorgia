import { apiFetch, serverFetch } from "./client";
import { toQueryString } from "./query";
import type {
  AmendBookingInput,
  Booking,
  BookingQuery,
  BookingSummary,
  CancellationQuote,
  ConfirmBookingInput,
  Hold,
} from "@/types/booking";
import type { Paginated } from "@/types/partner";

/**
 * Holds and bookings.
 *
 * Nothing here sends an amount. The server recomputes availability, occupancy,
 * every nightly rate, taxes and the final total before it will confirm
 * anything, and the request schema is strict — a body carrying a price is a
 * 400, not a silently ignored field.
 */

// --- reads ------------------------------------------------------------------

export const listAdminBookings = (query: BookingQuery = {}) =>
  serverFetch<Paginated<BookingSummary>>(`/api/admin/bookings${toQueryString(query)}`);

export const getAdminBooking = (reference: string) =>
  serverFetch<Booking>(`/api/admin/bookings/${reference}`);

export const listPartnerBookings = (query: BookingQuery = {}) =>
  serverFetch<Paginated<BookingSummary>>(`/api/partner/bookings${toQueryString(query)}`);

/**
 * One of a partner's own bookings, during a server render.
 *
 * The generic booking endpoint, not a partner-scoped one: it resolves the
 * session and then decides, and for a signed-in partner "decides" means the
 * booking has to carry their partner id. A reference belonging to anyone else
 * is a 404, not a 403, so the endpoint cannot be used to discover what exists.
 */
export const getPartnerBooking = (reference: string) =>
  serverFetch<Booking>(`/api/bookings/${reference}`);

/**
 * A guest reading their own booking.
 *
 * The email is not decoration: references come from a sequence and are
 * trivially enumerable, so the reference alone is not a credential.
 */
export const getGuestBooking = (reference: string, email: string) =>
  serverFetch<Booking>(`/api/bookings/${reference}${toQueryString({ email })}`);

export const getCancellationQuote = (reference: string, email?: string) =>
  serverFetch<CancellationQuote>(
    `/api/bookings/${reference}/cancellation-quote${toQueryString({ email })}`,
  );

// --- mutations --------------------------------------------------------------

/** Secures the rooms while the guest fills in their details. 409 if gone. */
export const createHold = (token: string) =>
  apiFetch<Hold>("/api/bookings/holds", { method: "POST", body: { token } });

/** Abandoning checkout. Always succeeds, even if already released. */
export const releaseHold = (token: string) =>
  apiFetch<void>(`/api/bookings/holds/${token}`, { method: "DELETE" });

/**
 * Confirms a booking.
 *
 * Pass an `idempotencyKey` and a retry returns the original booking rather than
 * making a second one — which is what stops a double-clicked submit button
 * taking two rooms.
 */
export const confirmBooking = (body: ConfirmBookingInput) =>
  apiFetch<Booking>("/api/bookings", {
    method: "POST",
    body,
    headers: body.idempotencyKey ? { "idempotency-key": body.idempotencyKey } : undefined,
  });

export const cancelBooking = (reference: string, body: { reason?: string; email?: string } = {}) =>
  apiFetch<BookingSummary & { cancellation: CancellationQuote }>(
    `/api/bookings/${reference}/cancel`,
    { method: "POST", body },
  );

/**
 * Corrects the paperwork on a booking.
 *
 * Deliberately cannot move the stay. Dates, rooms and money are not in the
 * input type and not in the server's schema — amending those means cancelling
 * and booking again, because the inventory has to be given back and the price
 * re-quoted.
 */
export const amendBooking = (reference: string, body: AmendBookingInput) =>
  apiFetch<Booking>(`/api/bookings/${reference}`, { method: "PATCH", body });

export const cancelBookingAsAdmin = (reference: string, reason?: string) =>
  apiFetch<BookingSummary & { cancellation: CancellationQuote }>(
    `/api/admin/bookings/${reference}/cancel`,
    { method: "POST", body: reason ? { reason } : {} },
  );
