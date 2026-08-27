/**
 * Admin panel types.
 *
 * Shaped the way a real back office would receive them — a booking references
 * the product it is for rather than embedding it, and every record carries the
 * lifecycle state the panel actually filters and acts on. Swapping the mock
 * arrays in `data/admin/` for API responses should not change these shapes.
 */

/** The three things the studio sells. Bookings and revenue split along it. */
export type ProductKind = "hotel" | "tour" | "transfer";

/*
 * The prototype `Booking`, `BookingStatus`, `PaymentStatus` and
 * `BookingCustomer` used to live here.
 *
 * Bookings are real records now: see `types/booking.ts`, which mirrors the
 * server serializers. The prototype shapes were removed rather than kept
 * alongside, because two types called `Booking` in one barrel is a trap — the
 * one you get depends on import order, and the two disagree about whether
 * `total` is dollars or minor units.
 */

/**
 * Which partner fulfils a tour or transfer, on the screens that are still
 * prototypes.
 *
 * Deliberately not the real `Partner` from `types/partner.ts`. Hotel bookings
 * now carry a real partner; tours and transfers have no booking backend at all,
 * and typing their mock suppliers as live partners would imply the two can be
 * joined.
 */
export interface FulfilmentPartner {
  id: string;
  name: string;
  kind: string;
  city: string;
}

/** One month of the bookings-over-time series on the dashboard. */
export interface MonthlyBookings {
  /** Short month label, e.g. "Mar". */
  month: string;
  hotel: number;
  tour: number;
  transfer: number;
}

/*
 * The signed-in operator used to be a fixture here. It is now a real session:
 * see `SessionUser` in types/auth.ts.
 */
