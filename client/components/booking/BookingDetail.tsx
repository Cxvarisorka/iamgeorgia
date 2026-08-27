import { BedDouble, Mail, MapPin, Phone, ShieldCheck, Users, XCircle } from "lucide-react";

import { formatInstant, formatStayDate } from "@/lib/booking/stay";
import { plural } from "@/lib/i18n/plural";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import type { Booking, HotelBookingStatus } from "@/types/booking";
import { cn } from "@/lib/utils";

interface BookingDetailProps {
  booking: Booking;
}

/**
 * A booking as the guest's own record of it.
 *
 * Everything here is read from the snapshot the server froze at confirmation,
 * not from the live hotel: the room name, the board, the cancellation tiers and
 * every figure. That is the point of taking a snapshot — a voucher printed six
 * months after the property renamed the room still describes what was sold, and
 * a cancellation charge is computed from terms the guest actually agreed to.
 */
export async function BookingDetail({ booking }: BookingDetailProps) {
  const { t, locale, intlLocale, fill } = await getI18n();
  const { hotelSnapshot: property, currency } = booking;

  const statusTone: Record<HotelBookingStatus, string> = {
    PENDING: "border-warning/40 bg-warning/10 text-warning-text",
    CONFIRMED: "border-success/40 bg-success/10 text-success",
    CANCELLED: "border-error/40 bg-error/10 text-error-text",
    COMPLETED: "border-line bg-surface-soft text-body",
    NO_SHOW: "border-line bg-surface-soft text-muted",
  };

  return (
    <div className="flex flex-col gap-8">
      {/* --- the record itself ------------------------------------------- */}
      <section className="border border-line bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-line p-6">
          <div className="min-w-0">
            <p className="type-caption text-muted">{t.booking.manage.reference}</p>
            <p className="type-h3 mt-1 tabular-nums">{booking.reference}</p>
            <p className="type-caption mt-2 text-subtle">
              {fill(t.booking.manage.bookedOn, {
                date: formatInstant(booking.createdAt, intlLocale),
              })}
            </p>
          </div>

          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase",
              statusTone[booking.status],
            )}
          >
            {t.booking.status[booking.status]}
          </span>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <p className="type-caption text-muted">{t.booking.manage.property}</p>
            <p className="type-body mt-1 font-medium text-ink">{property.name}</p>
            {property.address && (
              <p className="type-body-sm mt-2 flex items-start gap-2 text-muted">
                <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                {property.address}
              </p>
            )}
            {property.phone && (
              <p className="type-body-sm mt-1.5 flex items-center gap-2 text-muted">
                <Phone size={14} className="shrink-0" aria-hidden />
                {property.phone}
              </p>
            )}
            {property.email && (
              <p className="type-body-sm mt-1.5 flex items-center gap-2 text-muted">
                <Mail size={14} className="shrink-0" aria-hidden />
                {property.email}
              </p>
            )}
          </div>

          <div>
            <p className="type-caption text-muted">{t.booking.manage.stay}</p>
            <p className="type-body mt-1 font-medium text-ink">
              {formatStayDate(booking.checkIn, intlLocale)} –{" "}
              {formatStayDate(booking.checkOut, intlLocale)}
            </p>
            <p className="type-body-sm mt-2 text-muted">
              {plural(locale, booking.nights, t.units.night)} ·{" "}
              {plural(locale, booking.rooms, t.units.room)}
            </p>
            {property.checkIn.from && (
              <p className="type-caption mt-2 text-subtle">
                {fill(t.booking.manage.checkInFrom, { time: property.checkIn.from })}
              </p>
            )}
            {property.checkOut.until && (
              <p className="type-caption text-subtle">
                {fill(t.booking.manage.checkOutBy, { time: property.checkOut.until })}
              </p>
            )}
          </div>

          <div>
            <p className="type-caption text-muted">{t.booking.manage.leadGuest}</p>
            <p className="type-body-sm mt-1 text-ink">{booking.leadGuestName}</p>
            <p className="type-body-sm mt-1.5 flex items-center gap-2 text-muted">
              <Mail size={14} className="shrink-0" aria-hidden />
              {booking.leadGuestEmail}
            </p>
            {booking.leadGuestPhone && (
              <p className="type-body-sm mt-1.5 flex items-center gap-2 text-muted">
                <Phone size={14} className="shrink-0" aria-hidden />
                {booking.leadGuestPhone}
              </p>
            )}
          </div>

          <div>
            <p className="type-caption text-muted">{t.booking.manage.specialRequests}</p>
            <p className="type-body-sm mt-1 text-body">
              {booking.specialRequests ?? t.booking.manage.noRequests}
            </p>
          </div>
        </div>
      </section>

      {/* --- what was bought, room by room -------------------------------- */}
      <section>
        <h2 className="type-h3">{t.booking.manage.roomsTitle}</h2>

        <div className="mt-5 flex flex-col gap-5">
          {booking.bookingRooms.map((room) => {
            const freeUntil = room.cancellation.freeUntil;
            /*
             * The tiers worth listing are the ones that cost something *and*
             * start somewhere. A window that charges nothing is the free tier,
             * already stated above; an open-ended one with no `fromAt` is a
             * non-refundable rate expressed as a single all-time window, and
             * rendering it would read as "From —: ₾1,062.60" beneath a line
             * that already says the rate is non-refundable.
             */
            const chargedWindows = room.cancellation.windows.filter(
              (window) => window.chargeCents > 0 && window.fromAt !== null,
            );

            return (
              <article
                key={room.id}
                className={cn(
                  "border border-line bg-surface p-5",
                  room.status === "CANCELLED" && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="type-h4">{room.roomTypeName}</h3>
                    <p className="type-body-sm mt-1 text-muted">{room.ratePlanName}</p>
                  </div>
                  <p className="type-h4 shrink-0 tabular-nums">
                    {formatMoney(room.sellSubtotalCents, currency, intlLocale)}
                  </p>
                </div>

                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  <li className="type-caption flex items-center gap-1.5 text-muted">
                    <Users size={13} aria-hidden />
                    {plural(locale, room.adults, t.units.adult)}
                    {room.childAges.length > 0 &&
                      ` · ${plural(locale, room.childAges.length, t.units.child)}`}
                  </li>
                  {room.bedConfiguration && (
                    <li className="type-caption flex items-center gap-1.5 text-muted">
                      <BedDouble size={13} aria-hidden />
                      {room.bedConfiguration}
                    </li>
                  )}
                  <li className="type-caption text-muted">
                    {t.booking.manage.mealPlan}: {room.mealPlan.name}
                  </li>
                </ul>

                {room.guests.length > 0 && (
                  <p className="type-caption mt-3 text-subtle">
                    {room.guests
                      .map((guest) => `${guest.firstName} ${guest.lastName}`)
                      .join(" · ")}
                  </p>
                )}

                <div className="mt-4 border-t border-line pt-4">
                  <p className="type-caption text-muted">{t.booking.manage.cancellationTerms}</p>

                  <p className="type-body-sm mt-1.5 flex items-start gap-2">
                    {freeUntil ? (
                      <>
                        <ShieldCheck
                          size={15}
                          className="mt-0.5 shrink-0 text-success"
                          aria-hidden
                        />
                        <span className="text-success">
                          {fill(t.booking.manage.freeUntil, {
                            date: formatInstant(freeUntil, intlLocale),
                          })}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle size={15} className="mt-0.5 shrink-0 text-subtle" aria-hidden />
                        <span className="text-muted">
                          {room.cancellation.summary ?? t.booking.manage.nonRefundable}
                        </span>
                      </>
                    )}
                  </p>

                  {chargedWindows.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {chargedWindows.map((window, index) => (
                        // A window is identified by its position in the schedule.
                        <li
                          key={index}
                          className="type-caption text-muted"
                        >
                          {fill(t.booking.manage.thenCharge, {
                            date: formatInstant(window.fromAt, intlLocale),
                            amount: formatMoney(window.chargeCents, currency, intlLocale),
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* --- money -------------------------------------------------------- */}
      <section className="border border-line bg-surface p-6">
        <dl className="space-y-3">
          {booking.taxIncludedCents > 0 && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="type-body-sm text-muted">{t.booking.manage.taxesIncluded}</dt>
              <dd className="type-body-sm tabular-nums">
                {formatMoney(booking.taxIncludedCents, currency, intlLocale)}
              </dd>
            </div>
          )}

          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
            <dt className="type-h4">{t.booking.manage.total}</dt>
            <dd className="type-h4 tabular-nums">
              {formatMoney(booking.totalCents, currency, intlLocale)}
            </dd>
          </div>

          {booking.payableAtPropertyCents > 0 && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="type-body-sm text-warning-text">{t.booking.manage.payAtProperty}</dt>
              <dd className="type-body-sm tabular-nums text-warning-text">
                {formatMoney(booking.payableAtPropertyCents, currency, intlLocale)}
              </dd>
            </div>
          )}

          {booking.cancellationChargeCents !== null && (
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
              <dt className="type-body-sm text-error-text">
                {t.booking.manage.cancellationCharge}
              </dt>
              <dd className="type-body-sm tabular-nums text-error-text">
                {formatMoney(booking.cancellationChargeCents, currency, intlLocale)}
              </dd>
            </div>
          )}
        </dl>

        {booking.cancelledAt && (
          <p className="type-caption mt-4 text-error-text">
            {fill(t.booking.manage.cancelledOn, {
              date: formatInstant(booking.cancelledAt, intlLocale),
            })}
          </p>
        )}
      </section>
    </div>
  );
}
