import { CalendarSearch, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Rating } from "@/components/ui/Rating";
import { formatInstant } from "@/lib/booking/stay";
import { plural } from "@/lib/i18n/plural";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import type { TourStay } from "@/lib/tours/query";
import type { TourOfferAvailable, TourSummary } from "@/types/tour";

interface TourPanelProps {
  tour: TourSummary;
  stay: TourStay | null;
  /** The cheapest bookable departure in the window, if anything is bookable. */
  cheapest: TourOfferAvailable | null;
}

/**
 * The sticky panel beside a tour.
 *
 * It says one of three things, and which depends entirely on whether the
 * visitor has given us a date: an indicative "from" price per person, a real
 * total for a real departure and party, or "nothing in that window". Only the
 * middle one quotes a figure anybody could be charged, and it is labelled as a
 * total for the party so the two can never be confused.
 */
export async function TourPanel({ tour, stay, cheapest }: TourPanelProps) {
  const { t, locale, intlLocale, fill } = await getI18n();

  const party = stay
    ? [
        plural(locale, stay.adults, t.units.adult),
        stay.childAges.length > 0 ? plural(locale, stay.childAges.length, t.units.child) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="border border-line bg-surface p-6 shadow-card">
      <div className="flex items-baseline justify-between gap-4">
        {stay && cheapest ? (
          <p>
            <span className="type-caption block text-muted">{t.common.from}</span>
            <span className="type-h2 tabular-nums">
              {formatMoney(cheapest.quote.totals.totalCents, cheapest.quote.currency, intlLocale)}
            </span>
            <span className="type-body-sm block text-muted">
              {fill(t.tours.availability.totalFor, { party })}
            </span>
          </p>
        ) : (
          <p>
            <span className="type-caption block text-muted">{t.common.from}</span>
            {tour.priceFrom ? (
              <>
                <span className="type-h2 tabular-nums">
                  {formatMoney(tour.priceFrom.amountCents, tour.priceFrom.currency, intlLocale, {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="type-body-sm text-muted"> {t.tours.perPerson}</span>
              </>
            ) : (
              <span className="type-body-sm text-muted">{t.tours.search.datesRequired}</span>
            )}
          </p>
        )}
        <span className="type-caption shrink-0 rounded-full bg-surface-soft px-3 py-1 text-body">
          {tour.durationLabel}
        </span>
      </div>

      <div className="mt-5 border-y border-line py-4">
        <Rating value={tour.rating} reviewCount={tour.reviewCount} size="md" />
      </div>

      {stay ? (
        cheapest ? (
          <>
            <Button href="#departures" size="lg" fullWidth className="mt-5">
              {t.tours.results.viewDepartures}
            </Button>
            {cheapest.cancellation.freeUntil && (
              <p className="type-caption mt-4 flex items-start gap-2 text-muted">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-success" aria-hidden />
                {fill(t.tours.availability.freeUntil, {
                  date: formatInstant(cheapest.cancellation.freeUntil, intlLocale),
                })}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="type-body-sm mt-5 text-muted">{t.tours.availability.emptyTitle}</p>
            <Button href="#tour-search" variant="outline" fullWidth className="mt-4">
              {t.booking.search.edit}
            </Button>
          </>
        )
      ) : (
        <>
          <p className="type-body-sm mt-5 text-muted">{t.tours.search.datesRequired}</p>
          <Button href="#tour-search" size="lg" fullWidth className="mt-4">
            <CalendarSearch size={17} aria-hidden />
            {t.tours.availability.noDatesTitle}
          </Button>
        </>
      )}

      <p className="type-caption mt-4 text-subtle">{t.tours.checkout.terms}</p>
    </div>
  );
}
