"use client";

import { CalendarDays, Minus, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { RequestModal } from "@/components/ui/RequestModal";
import type { Tour } from "@/types";
import { formatPrice, pluralize } from "@/lib/utils";

interface TourPlanningCardProps {
  tour: Tour;
}

/**
 * Planning panel for a tour. Every control is local UI state and the request
 * ends in a prototype confirmation — no availability is checked and no booking
 * is created.
 */
export function TourPlanningCard({ tour }: TourPlanningCardProps) {
  const [date, setDate] = useState("");
  const [travellers, setTravellers] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);

  const subtotal = tour.priceFrom * travellers;
  // A flat, obviously indicative figure — this prototype does not price trips.
  const planningFee = 60;
  const total = subtotal + planningFee;

  return (
    <>
      <div className="border border-line bg-surface p-6 shadow-card">
        <div className="flex items-baseline justify-between gap-4">
          <p>
            <span className="type-caption block text-muted">From</span>
            <span className="type-h2">{formatPrice(tour.priceFrom)}</span>
            <span className="type-body-sm text-muted"> per person</span>
          </p>
          <span className="type-caption rounded-full bg-surface-soft px-3 py-1 text-body">
            {tour.durationLabel}
          </span>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="type-caption mb-1.5 block text-muted">Preferred start date</span>
            <span className="relative block">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-12 w-full rounded-sm border border-line bg-background/40 pr-3 pl-10 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </span>
          </label>

          <div>
            <span className="type-caption mb-1.5 block text-muted">Travellers</span>
            <div className="flex h-12 items-center justify-between rounded-sm border border-line bg-background/40 px-2">
              <button
                type="button"
                onClick={() => setTravellers((value) => Math.max(1, value - 1))}
                disabled={travellers <= 1}
                aria-label="Remove a traveller"
                className="flex size-9 items-center justify-center rounded-sm text-body transition-colors hover:bg-surface-soft disabled:opacity-35"
              >
                <Minus size={15} aria-hidden />
              </button>
              <span aria-live="polite" className="type-body-sm font-medium tabular-nums">
                {pluralize(travellers, "traveller")}
              </span>
              <button
                type="button"
                onClick={() => setTravellers((value) => Math.min(8, value + 1))}
                disabled={travellers >= 8}
                aria-label="Add a traveller"
                className="flex size-9 items-center justify-center rounded-sm text-body transition-colors hover:bg-surface-soft disabled:opacity-35"
              >
                <Plus size={15} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <dl className="mt-6 space-y-2.5 border-t border-line pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-body-sm text-muted">
              {formatPrice(tour.priceFrom)} × {pluralize(travellers, "traveller")}
            </dt>
            <dd className="type-body-sm tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-body-sm text-muted">Trip planning &amp; permits</dt>
            <dd className="type-body-sm tabular-nums">{formatPrice(planningFee)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
            <dt className="type-h4">Estimated total</dt>
            <dd className="type-h4 tabular-nums">{formatPrice(total)}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3">
          <Button onClick={() => setModalOpen(true)} size="lg" fullWidth>
            Request this journey
          </Button>
          <Button href="/contact" variant="outline" fullWidth>
            Ask a question
          </Button>
        </div>

        <p className="type-caption mt-5 flex items-start gap-2 text-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
          No payment is taken at this stage. A trip planner replies within one working day.
        </p>
      </div>

      <RequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Request this journey"
        subtitle={tour.title}
        rows={[
          { label: "Journey", value: tour.title },
          { label: "Duration", value: tour.durationLabel },
          { label: "Preferred start", value: date || "Flexible" },
          { label: "Travellers", value: pluralize(travellers, "traveller") },
        ]}
        total={{ label: "Estimated total", value: formatPrice(total) }}
        confirmLabel="Send request"
      />
    </>
  );
}
