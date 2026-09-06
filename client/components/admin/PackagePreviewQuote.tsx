"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Play } from "lucide-react";

import { FormError, NumberInput, TextInput } from "./FormControls";
import { describeError } from "@/lib/api/client";
import { previewPackageQuoteClient } from "@/lib/api/packages";
import { slotReasonLabels, unavailableReasonLabels } from "@/lib/admin/packages";
import {
  resolvedHotel,
  resolvedService,
  resolvedTour,
  resolvedTransfer,
} from "@/lib/packages/query";
import { formatMoney } from "@/lib/money";
import { addDaysISO, todayISO } from "@/lib/booking/stay";
import { cn } from "@/lib/utils";
import type { PackageQuote, PackageWithChecklist, QuotedComponent } from "@/types/package";

/**
 * The real quote engine, run as staff, on a date the operator picks.
 *
 * This is the answer to "will this template actually sell", and it is the only
 * screen that can give it: a package has no price of its own, and whether a
 * slot resolves depends on live rates, live inventory and live certificates on
 * one specific date. It works on a DRAFT, which is the point — an operator
 * should find a broken slot here rather than a partner finding it at checkout.
 *
 * Net and margin are shown because the viewer is staff. The adjustment can put
 * a package below its own cost, and the only place that is visible before
 * publishing is this line.
 */
export function PackagePreviewQuote({ pkg }: { pkg: PackageWithChecklist }) {
  const [startDate, setStartDate] = useState(() => addDaysISO(todayISO(), 21));
  const [adults, setAdults] = useState(Math.max(2, pkg.party.minAdults));
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<PackageQuote | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      setQuote(
        await previewPackageQuoteClient(pkg.id, {
          startDate,
          adults,
          // Ages the operator has not given: eight is inside every child band,
          // which is what a sanity check wants rather than an edge case.
          childAges: Array.from({ length: children }, () => 8),
          rooms,
        }),
      );
    } catch (caught) {
      setQuote(null);
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const money = (cents: number) => formatMoney(cents, quote?.currency ?? pkg.currency);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-5">
        <TextInput
          label="Start date"
          type="date"
          min={todayISO()}
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <NumberInput
          label="Adults"
          min={1}
          max={60}
          value={adults}
          onChange={(event) => setAdults(Number(event.target.value))}
        />
        <NumberInput
          label="Children"
          min={0}
          max={20}
          value={children}
          onChange={(event) => setChildren(Number(event.target.value))}
        />
        <NumberInput
          label="Rooms"
          min={1}
          max={9}
          value={rooms}
          onChange={(event) => setRooms(Number(event.target.value))}
        />
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy || !startDate}
            onClick={() => void run()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-brand px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <Play size={15} aria-hidden />
            )}
            Quote
          </button>
        </div>
      </div>

      <FormError message={error} />

      {quote && (
        <div>
          {!quote.available && (
            <p className="mb-4 flex items-start gap-2 rounded-sm bg-warning/12 p-3 text-[0.8125rem] text-warning-text">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <strong>Not sellable on this date.</strong>{" "}
                {quote.unavailableReason
                  ? unavailableReasonLabels[quote.unavailableReason]
                  : "One or more slots did not resolve."}
              </span>
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {quote.components.map((component) => (
              <SlotRow key={component.slotIndex} component={component} money={money} />
            ))}
          </ul>

          <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
            <Line label="Parts (sell)" value={money(quote.totals.componentsSellCents)} />
            {typeof quote.totals.componentsNetCents === "number" && (
              <Line label="Parts (net)" value={money(quote.totals.componentsNetCents)} muted />
            )}
            {quote.totals.adjustmentCents !== 0 && (
              <Line
                label={quote.totals.adjustmentCents < 0 ? "Discount" : "Supplement"}
                value={money(quote.totals.adjustmentCents)}
              />
            )}
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="text-[0.8125rem] font-semibold text-ink">Buyer pays</dt>
              <dd className="text-base font-semibold tabular-nums text-ink">
                {money(quote.totals.totalCents)}
              </dd>
            </div>
            {typeof quote.totals.marginCents === "number" && (
              <Line
                label="Margin"
                value={money(quote.totals.marginCents)}
                muted={quote.totals.marginCents >= 0}
                bad={quote.totals.marginCents < 0}
              />
            )}
          </dl>

          {quote.kosher && (quote.kosher.blockers.length > 0 || quote.kosher.warnings.length > 0) && (
            <div className="mt-5 border-t border-line pt-4">
              {quote.kosher.blockers.map((finding, index) => (
                <p
                  key={`b-${finding.code}-${index}`}
                  className="text-[0.8125rem] text-error-text"
                >
                  · {finding.message}
                </p>
              ))}
              {quote.kosher.warnings.map((finding, index) => (
                <p key={`w-${finding.code}-${index}`} className="text-[0.8125rem] text-muted">
                  · {finding.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  muted,
  bad,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bad?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[0.8125rem]">
      <dt className={bad ? "text-error-text" : "text-muted"}>{label}</dt>
      <dd className={cn("tabular-nums", bad ? "text-error-text" : muted ? "text-muted" : "text-body")}>
        {value}
      </dd>
    </div>
  );
}

/** One slot's outcome: what filled it and for how much, or why nothing did. */
function SlotRow({
  component,
  money,
}: {
  component: QuotedComponent;
  money: (cents: number) => string;
}) {
  const hotel = resolvedHotel(component);
  const transfer = resolvedTransfer(component);
  const tour = resolvedTour(component);
  const service = resolvedService(component);

  const detail = hotel
    ? `${hotel.hotel.name} · ${hotel.roomType.name} · ${hotel.ratePlan.name}`
    : transfer
      ? `${transfer.vehicle.name} · ${transfer.from.name} → ${transfer.to.name}`
      : tour
        ? `${tour.tour.title} · ${tour.option.name} · ${tour.date}`
        : service
          ? `${service.service.name} · ${service.quantity} × ${service.days}d`
          : null;

  const failed = component.included && component.resolved === null;

  return (
    <li
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-3 rounded-sm border px-3 py-2.5",
        failed ? "border-error/40 bg-error/5" : "border-line",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-medium text-ink">
          <span className="me-2 tabular-nums text-muted">{component.slotIndex}</span>
          {component.label}
          {!component.required && <span className="ms-2 text-[0.75rem] text-muted">optional</span>}
        </span>
        <span className="block text-[0.75rem] text-muted">
          {detail ??
            (component.reason
              ? slotReasonLabels[component.reason]
              : "Did not resolve")}
        </span>
      </span>

      {component.resolved && (
        <span className="shrink-0 text-end">
          <span className="block text-[0.8125rem] tabular-nums text-ink">
            {money(component.lineTotalCents)}
          </span>
          {typeof component.resolved.netCents === "number" && (
            <span className="block text-[0.75rem] tabular-nums text-muted">
              net {money(component.resolved.netCents)}
            </span>
          )}
        </span>
      )}
    </li>
  );
}
