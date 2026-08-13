"use client";

import { CalendarDays, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ScoreBadge } from "@/components/ui/Rating";
import { RequestModal } from "@/components/ui/RequestModal";
import type { Hotel } from "@/types";
import { formatPrice, pluralize } from "@/lib/utils";

interface BookingSummaryProps {
  hotel: Hotel;
}

/** Nights between two ISO dates; falls back to a two-night sample stay. */
function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 2;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const nights = Math.round(diff / 86_400_000);
  return nights > 0 ? nights : 2;
}

/**
 * Sticky reservation panel. Dates, occupancy and room choice are local UI state;
 * the totals are arithmetic on mock rates. No availability is ever checked.
 */
export function BookingSummary({ hotel }: BookingSummaryProps) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [roomId, setRoomId] = useState(hotel.rooms[0].id);
  const [modalOpen, setModalOpen] = useState(false);

  const room = hotel.rooms.find((item) => item.id === roomId) ?? hotel.rooms[0];
  const nights = nightsBetween(checkIn, checkOut);
  const roomTotal = room.pricePerNight * nights;
  const serviceCharge = Math.round(roomTotal * 0.05);
  const total = roomTotal + serviceCharge;

  const dateInput =
    "h-11 w-full rounded-sm border border-line bg-background/40 px-3 text-sm text-ink focus:border-ink focus:outline-none";

  return (
    <>
      <div className="border border-line bg-surface p-6 shadow-card">
        <div className="flex items-baseline justify-between gap-4">
          <p>
            <span className="type-caption block text-muted">From</span>
            <span className="type-h2">{formatPrice(hotel.priceFrom)}</span>
            <span className="type-body-sm text-muted"> / night</span>
          </p>
        </div>

        <div className="mt-5 border-y border-line py-4">
          <ScoreBadge score={hotel.guestScore} reviewCount={hotel.reviewCount} size="sm" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="type-caption mb-1.5 flex items-center gap-1.5 text-muted">
                <CalendarDays size={13} aria-hidden />
                Check-in
              </span>
              <input
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className={dateInput}
              />
            </label>
            <label className="block">
              <span className="type-caption mb-1.5 flex items-center gap-1.5 text-muted">
                <CalendarDays size={13} aria-hidden />
                Check-out
              </span>
              <input
                type="date"
                value={checkOut}
                min={checkIn || undefined}
                onChange={(event) => setCheckOut(event.target.value)}
                className={dateInput}
              />
            </label>
          </div>

          <label className="block">
            <span className="type-caption mb-1.5 block text-muted">Guests</span>
            <select
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              className={dateInput}
            >
              {Array.from({ length: 6 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {pluralize(count, "guest")}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="type-caption mb-1.5 block text-muted">Room</span>
            <select
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className={dateInput}
            >
              {hotel.rooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {formatPrice(item.pricePerNight)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <dl className="mt-6 space-y-2.5 border-t border-line pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-body-sm text-muted">
              {formatPrice(room.pricePerNight)} × {pluralize(nights, "night")}
            </dt>
            <dd className="type-body-sm tabular-nums">{formatPrice(roomTotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-body-sm text-muted">Service charge</dt>
            <dd className="type-body-sm tabular-nums">{formatPrice(serviceCharge)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
            <dt className="type-h4">Total</dt>
            <dd className="type-h4 tabular-nums">{formatPrice(total)}</dd>
          </div>
        </dl>

        <Button onClick={() => setModalOpen(true)} size="lg" fullWidth className="mt-6">
          Reserve
        </Button>

        <p className="type-caption mt-4 flex items-start gap-2 text-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
          {room.cancellation}. You will not be charged now.
        </p>
      </div>

      <RequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm your stay"
        subtitle={hotel.name}
        rows={[
          { label: "Property", value: hotel.name },
          { label: "Room", value: room.name },
          { label: "Check-in", value: checkIn || "Flexible" },
          { label: "Check-out", value: checkOut || "Flexible" },
          { label: "Nights", value: pluralize(nights, "night") },
          { label: "Guests", value: pluralize(guests, "guest") },
        ]}
        total={{ label: "Total", value: formatPrice(total) }}
        confirmLabel="Reserve"
      />
    </>
  );
}
