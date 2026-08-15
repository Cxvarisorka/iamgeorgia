"use client";

import { Ban, Check, Loader2, PauseCircle, PlayCircle, Search } from "lucide-react";
import { useState } from "react";

import { PartnerStatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import type { PartnerStatus } from "@/types";

/**
 * The partner review workflow.
 *
 * Which transitions are offered depends on where the partner is, and approval
 * is blocked outright while documents are missing — that rule is the whole
 * point of the review queue, so the button states it rather than letting an
 * operator approve and find out later.
 */
export function PartnerActions({
  initialStatus,
  missingDocuments,
}: {
  initialStatus: PartnerStatus;
  missingDocuments: number;
}) {
  const [status, setStatus] = useState<PartnerStatus>(initialStatus);
  const [busy, setBusy] = useState<PartnerStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const transition = (next: PartnerStatus, note: string) => {
    setBusy(next);
    setMessage(null);
    setTimeout(() => {
      setStatus(next);
      setBusy(null);
      setMessage(note);
    }, 400);
  };

  const paperworkComplete = missingDocuments === 0;
  const isApplicant = status === "pending" || status === "in-review";

  const base =
    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm px-4 text-[0.8125rem] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] text-muted">Current status</span>
        <PartnerStatusBadge status={status} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {status === "pending" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => transition("in-review", "Moved into review.")}
            className={cn(base, "border border-ink/20 text-ink hover:border-ink hover:bg-surface-soft")}
          >
            {busy === "in-review" ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <Search size={15} aria-hidden />
            )}
            Start review
          </button>
        )}

        {isApplicant && (
          <button
            type="button"
            disabled={!paperworkComplete || busy !== null}
            onClick={() =>
              transition("active", "Partner approved. Their listings can now go live.")
            }
            className={cn(base, "bg-brand text-white hover:bg-brand-hover")}
          >
            {busy === "active" ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <Check size={15} aria-hidden />
            )}
            Approve partner
          </button>
        )}

        {status === "active" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              transition("suspended", "Partner suspended. Their listings are hidden.")
            }
            className={cn(
              base,
              "border border-error/40 text-error-text hover:bg-error/8",
            )}
          >
            {busy === "suspended" ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <PauseCircle size={15} aria-hidden />
            )}
            Suspend partner
          </button>
        )}

        {(status === "suspended" || status === "rejected") && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => transition("active", "Partner reinstated.")}
            className={cn(base, "bg-brand text-white hover:bg-brand-hover")}
          >
            {busy === "active" ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <PlayCircle size={15} aria-hidden />
            )}
            Reinstate partner
          </button>
        )}

        {isApplicant && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => transition("rejected", "Application declined.")}
            className={cn(
              base,
              "mt-2 border border-error/40 text-error-text hover:bg-error/8",
            )}
          >
            {busy === "rejected" ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <Ban size={15} aria-hidden />
            )}
            Decline application
          </button>
        )}
      </div>

      <p aria-live="polite" className="mt-4 text-[0.75rem] leading-relaxed text-muted">
        {message ??
          (isApplicant && !paperworkComplete
            ? `Approval is blocked until all documents are received — ${missingDocuments} outstanding.`
            : status === "active"
              ? "This partner is live and can receive bookings."
              : "No action outstanding.")}
      </p>
    </div>
  );
}
