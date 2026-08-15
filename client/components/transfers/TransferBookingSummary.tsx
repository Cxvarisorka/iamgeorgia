"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";

import { VehicleIllustration } from "./VehicleIllustration";
import { Badge } from "@/components/ui/Badge";
import { getTransferLocation } from "@/data/transferLocations";
import { fill } from "@/lib/i18n/dictionaries";
import { plural } from "@/lib/i18n/plural";
import { useI18n } from "@/lib/i18n/provider";
import {
  formatDuration,
  formatJourneyDate,
  isPerPerson,
  luggageSummary,
  passengerSummary,
  totalFor,
  type TransferQuery,
} from "@/lib/transfers/query";
import { cn, formatPrice } from "@/lib/utils";
import type { TransferQuote } from "@/types";

interface TransferBookingSummaryProps {
  quote: TransferQuote;
  query: TransferQuery;
  /** Rendered under the total — the page's primary action. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The priced summary of one chosen transfer.
 *
 * Shared by the details page, checkout and confirmation so the figure a
 * traveller sees never changes shape between screens — the commonest way a
 * booking flow loses someone's trust is a total that looks different on the
 * next page.
 */
export function TransferBookingSummary({
  quote,
  query,
  children,
  className,
}: TransferBookingSummaryProps) {
  const { t, locale, intlLocale } = useI18n();
  const { offer, price, durationMinutes } = quote;

  const from = getTransferLocation(query.from, locale);
  const to = getTransferLocation(query.to, locale);
  const passengers = Math.max(1, query.adults + query.children);
  const perPerson = isPerPerson(offer);
  const legs = query.type === "return" ? 2 : 1;
  const total = totalFor(quote, query);

  return (
    <div className={cn("border border-line bg-surface shadow-card", className)}>
      <div className="flex items-center gap-4 border-b border-line p-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-surface-earth/60 text-ink">
          <VehicleIllustration vehicleClass={offer.vehicleClass} className="max-w-12" />
        </span>
        <div className="min-w-0">
          <h2 className="type-h4 truncate">{offer.name}</h2>
          <p className="type-caption mt-1 text-muted">
            {t.transfers.vehicleClasses[offer.vehicleClass]} · {offer.provider.name}
          </p>
        </div>
        <Badge tone={offer.kind === "private" ? "brand" : "neutral"} className="ms-auto shrink-0">
          {offer.kind === "private" ? t.transfers.kinds.private : t.transfers.kinds.shared}
        </Badge>
      </div>

      <dl className="divide-y divide-line px-5">
        <div className="py-3.5">
          <dt className="type-caption text-muted">{t.transfers.summary.route}</dt>
          <dd className="type-body-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
            <span>{from?.name ?? "—"}</span>
            <ArrowRight size={14} className="text-brand-text rtl:-scale-x-100" aria-hidden />
            <span className="sr-only"> {t.a11y.to} </span>
            <span>{to?.name ?? "—"}</span>
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="type-caption text-muted">{t.transfers.summary.pickUp}</dt>
          <dd className="type-body-sm text-end font-medium text-ink">
            {formatJourneyDate(query.date, intlLocale)}
            {query.time && ` · ${query.time}`}
          </dd>
        </div>

        {query.type === "return" && (
          <div className="flex items-baseline justify-between gap-4 py-3.5">
            <dt className="type-caption text-muted">{t.transfers.summary.returnPickUp}</dt>
            <dd className="type-body-sm text-end font-medium text-ink">
              {formatJourneyDate(query.returnDate, intlLocale)}
              {query.returnTime && ` · ${query.returnTime}`}
            </dd>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="type-caption text-muted">{t.transfers.summary.journeyTime}</dt>
          <dd className="type-body-sm text-end font-medium text-ink">
            {fill(t.common.approx, {
              value: formatDuration(durationMinutes, {
                hour: t.common.hourShort,
                minute: t.common.minuteShort,
              }),
            })}{" "}
            · {fill(t.transfers.detail.kmByRoad, { count: quote.distanceKm })}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="type-caption text-muted">{t.transfers.summary.passengers}</dt>
          <dd className="type-body-sm text-end font-medium text-ink">
            {passengerSummary(query, locale, t.units)}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="type-caption text-muted">{t.transfers.summary.luggage}</dt>
          <dd className="type-body-sm text-end font-medium text-ink">
            {luggageSummary(query, locale, t.units)}
          </dd>
        </div>
      </dl>

      <dl className="space-y-2.5 border-t border-line px-5 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="type-body-sm text-muted">
            {perPerson
              ? fill(t.transfers.summary.perPersonLine, {
                  price: formatPrice(price, intlLocale),
                  passengers: plural(locale, passengers, t.units.passenger),
                })
              : fill(t.transfers.summary.perJourney, { name: offer.name })}
          </dt>
          <dd className="type-body-sm tabular-nums">
            {formatPrice(perPerson ? price * passengers : price, intlLocale)}
          </dd>
        </div>

        {legs === 2 && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-body-sm text-muted">{t.transfers.summary.returnJourney}</dt>
            <dd className="type-body-sm tabular-nums">
              {formatPrice(perPerson ? price * passengers : price, intlLocale)}
            </dd>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4">
          <dt className="type-body-sm text-muted">{t.transfers.summary.tollsTaxes}</dt>
          <dd className="type-body-sm text-success">{t.common.included}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
          <dt className="type-h4">{t.common.total}</dt>
          <dd className="type-h4 tabular-nums">{formatPrice(total, intlLocale)}</dd>
        </div>
      </dl>

      {children && <div className="px-5 pb-5">{children}</div>}

      <p className="type-caption flex items-start gap-2 border-t border-line px-5 py-4 text-muted">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
        {offer.cancellation}
      </p>
    </div>
  );
}
