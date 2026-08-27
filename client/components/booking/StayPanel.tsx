import { CalendarSearch, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ScoreBadge } from "@/components/ui/Rating";
import { formatInstant, nightsBetween } from "@/lib/booking/stay";
import { plural } from "@/lib/i18n/plural";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { formatPrice } from "@/lib/utils";
import type { StayWindowIssue } from "@/lib/booking/errors";
import type { Offer, StayQuery } from "@/types/booking";

interface StayPanelProps {
  guestScore: number;
  reviewCount: number;
  /** Indicative nightly rate from the catalogue, in whole units. */
  priceFrom: number;
  stay: StayQuery | null;
  /** The cheapest bookable offer for `stay`, if anything is bookable at all. */
  cheapest: Offer | null;
  /**
   * Set when the platform will not sell this stay at all. Distinct from having
   * nothing free: the panel must not tell someone a property is full when the
   * truth is that we do not take bookings that far ahead.
   */
  refused?: NonNullable<StayWindowIssue> | null;
}

/**
 * The sticky panel beside a property.
 *
 * It says one of three things, and which one depends entirely on whether the
 * visitor has given us dates: an indicative nightly rate, a real total for a
 * real stay, or "nothing on those dates". The middle case is the only one that
 * quotes a figure anybody could be charged, and it is labelled as a total for
 * the whole stay rather than a nightly rate so the two can never be confused.
 */
export async function StayPanel({
  guestScore,
  reviewCount,
  priceFrom,
  stay,
  cheapest,
  refused = null,
}: StayPanelProps) {
  const { t, locale, intlLocale, fill } = await getI18n();

  const nights = stay ? nightsBetween(stay.checkIn, stay.checkOut) : 0;
  const freeUntil = cheapest?.terms.cancellation.freeUntil ?? null;

  return (
    <div className="border border-line bg-surface p-6 shadow-card">
      {stay && cheapest ? (
        <p>
          <span className="type-caption block text-muted">{t.common.from}</span>
          <span className="type-h2 tabular-nums">
            {formatMoney(
              cheapest.quote.totals.totalCents,
              cheapest.quote.currency,
              intlLocale,
            )}
          </span>
          <span className="type-body-sm block text-muted">
            {fill(t.booking.availability.totalForStay, {
              nights: plural(locale, nights, t.units.night),
            })}
          </span>
        </p>
      ) : (
        <p>
          <span className="type-caption block text-muted">{t.common.from}</span>
          <span className="type-h2">{formatPrice(priceFrom, intlLocale)}</span>
          <span className="type-body-sm text-muted"> {t.common.perNightShort}</span>
        </p>
      )}

      <div className="mt-5 border-y border-line py-4">
        <ScoreBadge score={guestScore} reviewCount={reviewCount} size="sm" />
      </div>

      {stay ? (
        cheapest ? (
          <>
            <Button href="#rooms" size="lg" fullWidth className="mt-5">
              {t.hotels.selectRoom}
            </Button>
            {freeUntil && (
              <p className="type-caption mt-4 flex items-start gap-2 text-muted">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-success" aria-hidden />
                {fill(t.booking.availability.freeUntil, {
                  date: formatInstant(freeUntil, intlLocale),
                })}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="type-body-sm mt-5 text-muted">
              {refused
                ? fill(t.booking.window[refused.key], { limit: refused.limit })
                : t.booking.availability.emptyTitle}
            </p>
            <Button href="#stay-search" variant="outline" fullWidth className="mt-4">
              {t.booking.search.edit}
            </Button>
          </>
        )
      ) : (
        <>
          <p className="type-body-sm mt-5 text-muted">{t.booking.search.datesRequired}</p>
          <Button href="#stay-search" size="lg" fullWidth className="mt-4">
            <CalendarSearch size={17} aria-hidden />
            {t.booking.availability.selectDates}
          </Button>
        </>
      )}

      <p className="type-caption mt-4 text-subtle">{t.booking.checkout.payAtPropertyHint}</p>
    </div>
  );
}
