"use client";

import { BedDouble, CarFront, Compass, ConciergeBell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatInstant, formatStayDate } from "@/lib/booking/stay";
import { plural } from "@/lib/i18n/plural";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";
import { resolvedHotel, resolvedService, resolvedTour, resolvedTransfer } from "@/lib/packages/query";
import type { PackageQuote, QuotedComponent } from "@/types/package";
import { cn } from "@/lib/utils";

const ICONS: Record<QuotedComponent["componentType"], LucideIcon> = {
  HOTEL_STAY: BedDouble,
  TRANSFER: CarFront,
  TOUR: Compass,
  SERVICE: ConciergeBell,
};

interface OrderCheckoutSummaryProps {
  packageName: string;
  quote: PackageQuote;
  className?: string;
}

/**
 * The trip being confirmed, read-only.
 *
 * The same lines the builder showed, with the choosing taken away: at
 * checkout the offer is signed and a change means going back and re-quoting.
 * The figures come from the draft rather than a fresh call, so what the buyer
 * agreed to is what they were shown when they clicked reserve.
 */
export function OrderCheckoutSummary({ packageName, quote, className }: OrderCheckoutSummaryProps) {
  const { t, locale, intlLocale } = useI18n();
  const money = (cents: number) => formatMoney(cents, quote.currency, intlLocale);

  const party = [
    plural(locale, quote.party.adults, t.units.adult),
    quote.party.children > 0 ? plural(locale, quote.party.children, t.units.child) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const included = quote.components.filter(
    (component) => component.included && component.resolved !== null,
  );

  return (
    <aside className={cn("border border-line bg-surface p-5 shadow-card", className)}>
      <h2 className="type-h4">{t.orders.checkout.summary}</h2>
      <p className="type-body-sm mt-1 text-ink">{packageName}</p>
      <p className="type-caption mt-1 text-muted">
        {formatStayDate(quote.startDate, intlLocale)} – {formatStayDate(quote.endDate, intlLocale)}{" "}
        · {party}
      </p>

      <ul className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
        {included.map((component) => {
          const Icon = ICONS[component.componentType];
          const hotel = resolvedHotel(component);
          const transfer = resolvedTransfer(component);
          const tour = resolvedTour(component);
          const service = resolvedService(component);

          const detail = hotel
            ? `${hotel.hotel.name} · ${hotel.roomType.name}`
            : transfer
              ? `${transfer.from.name} → ${transfer.to.name}`
              : tour
                ? `${tour.tour.title} · ${formatStayDate(tour.date, intlLocale)}`
                : service
                  ? service.service.name
                  : "";

          const when = hotel
            ? formatStayDate(hotel.checkIn, intlLocale)
            : transfer?.legs[0]
              ? formatInstant(transfer.legs[0].pickupAt, intlLocale)
              : null;

          return (
            <li key={component.slotIndex} className="flex items-start gap-2.5">
              <Icon size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="type-body-sm block text-ink">{component.label}</span>
                <span className="type-caption block truncate text-muted">{detail}</span>
                {when && <span className="type-caption block text-muted">{when}</span>}
              </span>
              <span className="type-body-sm shrink-0 tabular-nums text-body">
                {money(component.lineTotalCents)}
              </span>
            </li>
          );
        })}
      </ul>

      <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
        <div className="type-body-sm flex items-baseline justify-between gap-4">
          <dt className="text-muted">{t.orders.manage.partsTotal}</dt>
          <dd className="tabular-nums text-body">{money(quote.totals.componentsSellCents)}</dd>
        </div>

        {quote.totals.adjustmentCents !== 0 && (
          <div className="type-body-sm flex items-baseline justify-between gap-4">
            <dt className={quote.totals.adjustmentCents < 0 ? "text-accent-green" : "text-muted"}>
              {quote.totals.adjustmentCents < 0
                ? t.orders.manage.discount
                : t.orders.manage.supplement}
            </dt>
            <dd
              className={cn(
                "tabular-nums",
                quote.totals.adjustmentCents < 0 ? "text-accent-green" : "text-body",
              )}
            >
              {money(quote.totals.adjustmentCents)}
            </dd>
          </div>
        )}

        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="type-body font-semibold text-ink">{t.orders.manage.total}</dt>
          <dd className="type-h4 tabular-nums text-ink">{money(quote.totals.totalCents)}</dd>
        </div>
      </dl>

      {quote.kosher && quote.kosher.warnings.length > 0 && (
        <ul className="type-caption mt-4 flex flex-col gap-1 border-t border-line pt-3 text-muted">
          {quote.kosher.warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>· {warning.message}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
