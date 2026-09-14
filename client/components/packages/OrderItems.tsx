"use client";

import { BedDouble, CarFront, Clock, Compass, ConciergeBell, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { formatInstant, formatStayDate } from "@/lib/booking/stay";
import { useI18n, useLocalePath } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";
import type { BookingSummary } from "@/types/booking";
import type { OrderItem, OrderItemStatus } from "@/types/order";
import type { ServiceBookingSummary } from "@/types/service";
import type { TourBookingSummary } from "@/types/tour";
import type { TransferBookingSummary } from "@/types/transfer";
import { cn } from "@/lib/utils";

const ICONS: Record<OrderItem["componentType"], LucideIcon> = {
  HOTEL_STAY: BedDouble,
  TRANSFER: CarFront,
  TOUR: Compass,
  SERVICE: ConciergeBell,
};

const TONES: Record<OrderItemStatus, "neutral" | "outline" | "nature"> = {
  REQUESTED: "outline",
  CONFIRMED: "nature",
  DECLINED: "neutral",
  CANCELLED: "neutral",
  COMPLETED: "neutral",
  NO_SHOW: "neutral",
};

interface OrderItemsProps {
  items: OrderItem[];
  currency: string;
  /** Rendered per item when the viewer may act on it. */
  action?: (item: OrderItem) => React.ReactNode;
  className?: string;
}

/**
 * The parts of an order, each with its own reference.
 *
 * The reference is the point of this list. A traveller arriving at a hotel
 * quotes the hotel's own reference, not the order's, and a driver looking for
 * a pick-up has the transfer's — so each row shows the child's reference as
 * prominently as the label, and links to that product's own page where one
 * exists.
 */
export function OrderItems({ items, currency, action, className }: OrderItemsProps) {
  const { t, intlLocale } = useI18n();
  const path = useLocalePath();

  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => {
        const Icon = ICONS[item.componentType];
        const gone = item.status === "CANCELLED" || item.status === "DECLINED";

        return (
          <li
            key={item.slotIndex}
            className={cn("border border-line bg-surface p-4", gone && "bg-surface-soft opacity-75")}
          >
            <div className="flex flex-wrap items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-soft text-brand-text">
                <Icon size={17} aria-hidden />
              </span>

              {/* The text column keeps a readable measure; when a phone cannot
                  fit it beside the price block, the price wraps under it. */}
              <div className="min-w-[11rem] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="type-body-sm font-semibold text-ink">{item.label}</span>
                  <Badge tone={TONES[item.status]}>{t.orders.itemStatus[item.status]}</Badge>
                  {!item.required && <Badge tone="neutral">{t.packages.optional}</Badge>}
                </div>

                <p className="type-caption mt-1 text-muted">{describe(item, intlLocale)}</p>

                {item.booking && (
                  <p className="type-caption mt-1.5 text-muted">
                    {t.orders.manage.partReference}:{" "}
                    <span className="font-medium tabular-nums text-body">
                      {item.booking.reference}
                    </span>
                    {childHref(item, path) && (
                      <>
                        {" · "}
                        <a
                          href={childHref(item, path) as string}
                          className="inline-flex items-center gap-1 text-brand-text underline-offset-4 hover:underline"
                        >
                          {t.orders.manage.viewBooking}
                          <ExternalLink size={11} aria-hidden />
                        </a>
                      </>
                    )}
                  </p>
                )}

                {item.status === "REQUESTED" && (
                  <p className="type-caption mt-1.5 inline-flex items-center gap-1.5 text-muted">
                    <Clock size={12} aria-hidden />
                    {t.packages.quote.onRequestHint}
                  </p>
                )}
              </div>

              <div className="ms-auto flex flex-col items-end gap-1.5">
                <span
                  className={cn(
                    "type-body-sm tabular-nums",
                    gone ? "text-muted line-through" : "text-ink",
                  )}
                >
                  {formatMoney(item.lineTotalCents, currency, intlLocale)}
                </span>
                {item.adjustmentCents !== 0 && !gone && (
                  <span className="type-caption tabular-nums text-accent-green">
                    {formatMoney(item.adjustmentCents, currency, intlLocale)}
                  </span>
                )}
                {gone && (item.cancellationChargeCents ?? 0) > 0 && (
                  <span className="type-caption tabular-nums text-muted">
                    {t.orders.manage.cancellationCharge}:{" "}
                    {formatMoney(item.cancellationChargeCents ?? 0, currency, intlLocale)}
                  </span>
                )}
                {action?.(item)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** One line of "what this part actually is", from the child booking. */
function describe(item: OrderItem, intlLocale: string): string {
  const booking = item.booking;

  if (!booking) return "";

  if (item.componentType === "HOTEL_STAY") {
    const stay = booking as BookingSummary;

    return `${stay.hotel.name} · ${formatStayDate(stay.checkIn, intlLocale)} – ${formatStayDate(stay.checkOut, intlLocale)}`;
  }

  if (item.componentType === "TRANSFER") {
    const transfer = booking as TransferBookingSummary;

    return [transfer.from, transfer.to].filter(Boolean).join(" → ") +
      ` · ${formatInstant(transfer.pickupAt, intlLocale)}`;
  }

  if (item.componentType === "TOUR") {
    const tour = booking as TourBookingSummary;

    return `${tour.tour.title ?? ""} · ${formatStayDate(tour.date, intlLocale)}`.trim();
  }

  const service = booking as ServiceBookingSummary;

  return `${service.service.name ?? ""} · ${formatStayDate(service.date, intlLocale)}`.trim();
}

/** Where the child's own page lives, for the products that have one. */
function childHref(item: OrderItem, path: (href: string) => string): string | null {
  const booking = item.booking;

  if (!booking) return null;

  // A hotel or tour booking has a guest-facing page keyed by reference; a
  // transfer leg and a service are only ever read through the order itself.
  if (item.componentType === "HOTEL_STAY" || item.componentType === "TOUR") {
    return path(`/booking/manage/${booking.reference}`);
  }

  return null;
}
