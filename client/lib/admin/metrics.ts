import { bookings, monthlyBookings } from "@/data/admin/bookings";
import { partners } from "@/data/admin/partners";
import type { Booking, BookingStatus, ProductKind } from "@/types";

/**
 * Derived numbers for the panel.
 *
 * Everything is computed from the mock arrays rather than stored alongside
 * them, so a figure on the dashboard can never disagree with the table it
 * summarises — the commonest way a back office loses its operator's trust.
 */

export function countByStatus(status: BookingStatus): number {
  return bookings.filter((booking) => booking.status === status).length;
}

/** Money the studio can actually count: cancelled bookings are excluded. */
export function grossBookingValue(list: Booking[] = bookings): number {
  return list
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + booking.total, 0);
}

export function bookingsByKind(kind: ProductKind): Booking[] {
  return bookings.filter((booking) => booking.kind === kind);
}

export function pendingPartnerCount(): number {
  return partners.filter(
    (partner) => partner.status === "pending" || partner.status === "in-review",
  ).length;
}

export function activePartnerCount(): number {
  return partners.filter((partner) => partner.status === "active").length;
}

/** Total volume across all three products, per month. */
export function monthlyTotals(): { month: string; total: number }[] {
  return monthlyBookings.map((row) => ({
    month: row.month,
    total: row.hotel + row.tour + row.transfer,
  }));
}

/**
 * Change against the previous month, as a signed percentage. Returns null when
 * there is no earlier month to compare against, so the UI can omit the delta
 * rather than print a meaningless "+100%".
 */
export function monthOnMonthChange(): number | null {
  const totals = monthlyTotals();
  if (totals.length < 2) return null;
  const latest = totals[totals.length - 1].total;
  const previous = totals[totals.length - 2].total;
  if (previous === 0) return null;
  return Math.round(((latest - previous) / previous) * 100);
}

/** Bookings needing a decision, soonest travel date first. */
export function actionQueue(): Booking[] {
  return bookings
    .filter((booking) => booking.status === "pending")
    .sort((a, b) => a.travelDate.localeCompare(b.travelDate));
}

export function recentBookings(limit = 6): Booking[] {
  return [...bookings]
    .sort((a, b) => b.placedOn.localeCompare(a.placedOn))
    .slice(0, limit);
}

/** "12 Aug 2026" — one date format across the whole panel. */
export function formatAdminDate(iso: string): string {
  if (!iso) return "—";
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

/** Compact money for dense table cells and stat tiles: $184.2k. */
export function formatCompactMoney(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount}`;
}
