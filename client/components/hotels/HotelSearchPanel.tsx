"use client";

import { CalendarDays, MapPin, Minus, Plus, Search, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface StayQuery {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

interface HotelSearchPanelProps {
  value: StayQuery;
  onChange: (next: StayQuery) => void;
  destinations: { slug: string; name: string }[];
  className?: string;
}

/**
 * Stay search panel. Dates and occupancy are visual only — no availability is
 * checked. The destination select is the one control that filters the list.
 */
export function HotelSearchPanel({
  value,
  onChange,
  destinations,
  className,
}: HotelSearchPanelProps) {
  const [guestsOpen, setGuestsOpen] = useState(false);

  const field = "flex flex-col gap-1.5 px-4 py-3.5";
  const label = "type-caption flex items-center gap-1.5 text-muted";
  const control = "h-6 w-full bg-transparent text-sm text-ink focus:outline-none";

  return (
    <div
      className={cn(
        "border border-line bg-surface shadow-lift",
        "grid divide-y divide-line md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:divide-x md:divide-y-0",
        className,
      )}
    >
      <label className={field}>
        <span className={label}>
          <MapPin size={13} aria-hidden />
          Destination
        </span>
        <select
          value={value.destination}
          onChange={(event) => onChange({ ...value, destination: event.target.value })}
          className={cn(control, "cursor-pointer")}
        >
          <option value="all">Anywhere in Georgia</option>
          {destinations.map((destination) => (
            <option key={destination.slug} value={destination.slug}>
              {destination.name}
            </option>
          ))}
        </select>
      </label>

      <label className={field}>
        <span className={label}>
          <CalendarDays size={13} aria-hidden />
          Check-in
        </span>
        <input
          type="date"
          value={value.checkIn}
          onChange={(event) => onChange({ ...value, checkIn: event.target.value })}
          className={control}
        />
      </label>

      <label className={field}>
        <span className={label}>
          <CalendarDays size={13} aria-hidden />
          Check-out
        </span>
        <input
          type="date"
          value={value.checkOut}
          min={value.checkIn || undefined}
          onChange={(event) => onChange({ ...value, checkOut: event.target.value })}
          className={control}
        />
      </label>

      <div className={cn(field, "relative")}>
        <span className={label}>
          <Users size={13} aria-hidden />
          Guests &amp; rooms
        </span>
        <button
          type="button"
          onClick={() => setGuestsOpen((open) => !open)}
          aria-expanded={guestsOpen}
          className={cn(control, "text-left")}
        >
          {value.guests} guests · {value.rooms} room{value.rooms > 1 ? "s" : ""}
        </button>

        {guestsOpen && (
          <div className="absolute top-full right-0 left-0 z-20 mt-px border border-line bg-surface p-4 shadow-card">
            {(
              [
                { key: "guests" as const, label: "Guests", min: 1, max: 12 },
                { key: "rooms" as const, label: "Rooms", min: 1, max: 6 },
              ]
            ).map((row) => (
              <div key={row.key} className="flex items-center justify-between py-2">
                <span className="type-body-sm">{row.label}</span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Fewer ${row.label.toLowerCase()}`}
                    disabled={value[row.key] <= row.min}
                    onClick={() => onChange({ ...value, [row.key]: value[row.key] - 1 })}
                    className="flex size-8 items-center justify-center rounded-sm border border-line text-body transition-colors hover:border-ink disabled:opacity-35"
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <span className="type-body-sm w-8 text-center tabular-nums">
                    {value[row.key]}
                  </span>
                  <button
                    type="button"
                    aria-label={`More ${row.label.toLowerCase()}`}
                    disabled={value[row.key] >= row.max}
                    onClick={() => onChange({ ...value, [row.key]: value[row.key] + 1 })}
                    className="flex size-8 items-center justify-center rounded-sm border border-line text-body transition-colors hover:border-ink disabled:opacity-35"
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </span>
              </div>
            ))}
            <Button
              size="sm"
              fullWidth
              className="mt-3"
              onClick={() => setGuestsOpen(false)}
            >
              Done
            </Button>
          </div>
        )}
      </div>

      <div className="p-3">
        <Button
          size="lg"
          fullWidth
          className="h-full md:w-32"
          onClick={() => setGuestsOpen(false)}
        >
          <Search size={17} aria-hidden />
          Search
        </Button>
      </div>
    </div>
  );
}
