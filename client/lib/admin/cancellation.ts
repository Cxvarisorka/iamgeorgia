import type { Booking, CancellationQuote, CancellationWindow } from "@/types/booking";

/**
 * What cancelling a booking would cost right now.
 *
 * Read off the schedule frozen onto the booking, which is exactly what the
 * server does — the windows travel with the record precisely so that this is
 * arithmetic rather than a round trip. The hotel's *current* policy is not
 * consulted and must not be: what the guest is owed was settled at booking.
 *
 * `fromAt` is inclusive and `toAt` exclusive, matching the server, so a
 * cancellation exactly on a deadline falls into the tier the deadline opens.
 */
export function quoteFromSchedule(booking: Booking, at: Date = new Date()): CancellationQuote | null {
  const active = booking.bookingRooms.filter((room) => room.status === "CONFIRMED");

  if (active.length === 0) return null;

  const time = at.getTime();

  const chargeFor = (windows: CancellationWindow[], roomTotal: number): number => {
    const match =
      windows.find((window) => {
        const from = window.fromAt === null ? Number.NEGATIVE_INFINITY : Date.parse(window.fromAt);
        const to = window.toAt === null ? Number.POSITIVE_INFINITY : Date.parse(window.toAt);

        return time >= from && time < to;
      }) ?? windows.at(-1);

    // Never more than the room is worth, however the tier is expressed.
    return Math.min(match?.chargeCents ?? 0, roomTotal);
  };

  const chargeCents = active.reduce(
    (sum, room) => sum + chargeFor(room.cancellation.windows, room.sellSubtotalCents),
    0,
  );

  const total = active.reduce((sum, room) => sum + room.sellSubtotalCents, 0);

  return {
    chargeCents,
    refundCents: total - chargeCents,
    currency: booking.currency,
    refundable: chargeCents < total,
  };
}
