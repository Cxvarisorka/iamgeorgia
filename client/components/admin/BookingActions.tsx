"use client";

import { Ban, Check, Loader2, Send } from "lucide-react";
import { useState } from "react";

import { BookingStatusBadge } from "./StatusBadge";
import { bookingStatusLabels } from "@/data/admin/bookings";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types";

/**
 * The decisions an operator can take on one booking.
 *
 * State is local and resets on reload — there is nothing behind this. The
 * actions are here because the *shape* of the workflow is the thing being
 * designed: which transitions exist, what each one is called, and what
 * confirmation the operator gets back.
 */
export function BookingActions({ initialStatus }: { initialStatus: BookingStatus }) {
  const [status, setStatus] = useState<BookingStatus>(initialStatus);
  const [busy, setBusy] = useState<BookingStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const transition = (next: BookingStatus, note: string) => {
    setBusy(next);
    setMessage(null);
    setTimeout(() => {
      setStatus(next);
      setBusy(null);
      setMessage(note);
    }, 400);
  };

  const canConfirm = status === "pending";
  const canComplete = status === "confirmed";
  const canCancel = status === "pending" || status === "confirmed";

  const base =
    "inline-flex h-10 items-center justify-center gap-2 rounded-sm px-4 text-[0.8125rem] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] text-muted">Current status</span>
        <BookingStatusBadge status={status} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={!canConfirm || busy !== null}
          onClick={() =>
            transition("confirmed", "Booking confirmed. The guest would be emailed.")
          }
          className={cn(base, "bg-brand text-white hover:bg-brand-hover")}
        >
          {busy === "confirmed" ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <Check size={15} aria-hidden />
          )}
          Confirm booking
        </button>

        <button
          type="button"
          disabled={!canComplete || busy !== null}
          onClick={() => transition("completed", "Marked as completed.")}
          className={cn(
            base,
            "border border-ink/20 text-ink hover:border-ink hover:bg-surface-soft",
          )}
        >
          {busy === "completed" ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <Check size={15} aria-hidden />
          )}
          Mark as completed
        </button>

        <button
          type="button"
          disabled={busy !== null}
          className={cn(
            base,
            "border border-ink/20 text-ink hover:border-ink hover:bg-surface-soft",
          )}
          onClick={() => setMessage("A confirmation email would be resent to the guest.")}
        >
          <Send size={15} aria-hidden />
          Resend confirmation
        </button>

        <button
          type="button"
          disabled={!canCancel || busy !== null}
          onClick={() =>
            transition("cancelled", "Booking cancelled. A refund would follow the policy.")
          }
          className={cn(
            base,
            "border border-error/40 text-error-text hover:bg-error/8",
            "mt-2",
          )}
        >
          {busy === "cancelled" ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <Ban size={15} aria-hidden />
          )}
          Cancel booking
        </button>
      </div>

      <p aria-live="polite" className="mt-4 min-h-8 text-[0.75rem] text-muted">
        {message ??
          (status === "cancelled"
            ? "This booking is cancelled. No further transitions are available."
            : `Available transitions from ${bookingStatusLabels[status].toLowerCase()}.`)}
      </p>
    </div>
  );
}
