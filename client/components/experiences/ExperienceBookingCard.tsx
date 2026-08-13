"use client";

import { CalendarDays, Minus, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { RequestModal } from "@/components/ui/RequestModal";
import type { Experience } from "@/types";
import { formatPrice, pluralize } from "@/lib/utils";

interface ExperienceBookingCardProps {
  experience: Experience;
}

/** Visual booking panel. Local state only — no availability, no reservation. */
export function ExperienceBookingCard({ experience }: ExperienceBookingCardProps) {
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);

  const total = experience.price * guests;

  return (
    <>
      <div className="border border-line bg-surface p-6 shadow-card">
        <p>
          <span className="type-h2">{formatPrice(experience.price)}</span>
          <span className="type-body-sm text-muted"> per person</span>
        </p>
        <p className="type-caption mt-1 text-muted">{experience.duration}</p>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="type-caption mb-1.5 block text-muted">Preferred date</span>
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
            <span className="type-caption mb-1.5 block text-muted">Guests</span>
            <div className="flex h-12 items-center justify-between rounded-sm border border-line bg-background/40 px-2">
              <button
                type="button"
                onClick={() => setGuests((value) => Math.max(1, value - 1))}
                disabled={guests <= 1}
                aria-label="Remove a guest"
                className="flex size-9 items-center justify-center rounded-sm text-body transition-colors hover:bg-surface-soft disabled:opacity-35"
              >
                <Minus size={15} aria-hidden />
              </button>
              <span aria-live="polite" className="type-body-sm font-medium tabular-nums">
                {pluralize(guests, "guest")}
              </span>
              <button
                type="button"
                onClick={() => setGuests((value) => Math.min(10, value + 1))}
                disabled={guests >= 10}
                aria-label="Add a guest"
                className="flex size-9 items-center justify-center rounded-sm text-body transition-colors hover:bg-surface-soft disabled:opacity-35"
              >
                <Plus size={15} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-line pt-5">
          <span className="type-h4">Total</span>
          <span className="type-h4 tabular-nums">{formatPrice(total)}</span>
        </div>

        <Button onClick={() => setModalOpen(true)} size="lg" fullWidth className="mt-6">
          Request this experience
        </Button>

        <p className="type-caption mt-4 flex items-start gap-2 text-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
          No payment is taken at this stage.
        </p>
      </div>

      <RequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Request this experience"
        subtitle={experience.title}
        rows={[
          { label: "Experience", value: experience.title },
          { label: "Location", value: experience.location },
          { label: "Duration", value: experience.duration },
          { label: "Preferred date", value: date || "Flexible" },
          { label: "Guests", value: pluralize(guests, "guest") },
        ]}
        total={{ label: "Total", value: formatPrice(total) }}
        confirmLabel="Send request"
      />
    </>
  );
}
