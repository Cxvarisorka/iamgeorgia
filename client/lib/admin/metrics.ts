import { listAdminBookings } from "@/lib/api/bookings";
import { formatMoneyCompact } from "@/lib/money";
import { ACTIVE_BOOKING_STATUSES } from "./bookings";
import type { BookingSummary, HotelBookingStatus } from "@/types/booking";

/**
 * Derived numbers for the panel.
 *
 * These used to be synchronous functions over a mock array. Bookings are real
 * records now, so every one of them is a request — which is why they are async
 * and why the dashboard fires them in parallel rather than one after another.
 * The partner counts made the same move earlier for the same reason: counting
 * client-side would mean fetching every record just to take its length.
 *
 * Counting queries ask for `pageSize: 1`. They want the `total`, not the rows.
 */

/** How many bookings are in a given state. One request, no rows. */
export async function countByStatus(status: HotelBookingStatus): Promise<number> {
  const { total } = await listAdminBookings({ status, pageSize: 1 });

  return total;
}

/** Bookings that still owe the operator something. */
export async function countActive(): Promise<number> {
  const { total } = await listAdminBookings({ status: ACTIVE_BOOKING_STATUSES, pageSize: 1 });

  return total;
}

/**
 * Money the studio can count, over a recent window.
 *
 * Deliberately scoped rather than "all time": a lifetime total would mean
 * reading every booking ever made on every dashboard render. The window is
 * stated in the label so the figure is never mistaken for something it is not.
 */
export async function recentValue(days = 30): Promise<{ amountCents: number; currency: string }> {
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data } = await listAdminBookings({ from, status: ACTIVE_BOOKING_STATUSES, pageSize: 100 });

  return {
    amountCents: data.reduce((sum, booking) => sum + booking.totalCents, 0),
    currency: data[0]?.currency ?? "GEL",
  };
}

/** The newest bookings, for the dashboard's activity list. */
export async function recentBookings(limit = 6): Promise<BookingSummary[]> {
  const { data } = await listAdminBookings({ pageSize: limit });

  return data;
}

/** Stays starting soonest, which is what an operator actually watches. */
export async function upcomingArrivals(limit = 6): Promise<BookingSummary[]> {
  const { data } = await listAdminBookings({
    status: "CONFIRMED",
    from: new Date().toISOString().slice(0, 10),
    pageSize: limit,
  });

  return data;
}

/** Bookings against one property, for its detail screen. */
export async function bookingsForHotel(hotelId: string, limit = 5): Promise<BookingSummary[]> {
  const { data } = await listAdminBookings({ hotelId, pageSize: limit });

  return data;
}

const ADMIN_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** An instant — created, confirmed. Stay dates use `formatStayDate` instead. */
export function formatAdminDate(iso: string): string {
  return ADMIN_DATE.format(new Date(iso));
}

/** Re-exported so screens have one import for a headline figure. */
export const formatCompactMoney = formatMoneyCompact;
