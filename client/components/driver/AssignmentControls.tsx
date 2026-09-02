"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { ApiError, describeError } from "@/lib/api/client";
import { acceptAssignment, declineAssignment, updateAssignmentStatus } from "@/lib/api/driverPanel";
import { driverActionLabels } from "@/lib/admin/dispatch";
import type { DriverAssignment } from "@/types/driver";
import type { TransferLegStatus } from "@/types/transfer";

/**
 * The buttons a driver presses.
 *
 * One big primary action — the next step the server says is legal — and the
 * alternatives underneath. Every press sends `expectedFrom`, so a tap that
 * lands twice on a bad connection cannot skip a step: the second one comes
 * back as a conflict and the screen simply refreshes.
 */
export function AssignmentControls({ assignment }: { assignment: DriverAssignment }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const run = async (key: string, call: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);

    try {
      await call();
      router.refresh();
    } catch (caught) {
      const details = caught instanceof ApiError ? (caught.details as { reason?: string } | undefined) : undefined;

      if (details?.reason === "STALE_STATE") {
        router.refresh();
        return;
      }

      setError(describeError(caught));
    } finally {
      setBusy(null);
      setDeclining(false);
    }
  };

  const order: TransferLegStatus[] = ["EN_ROUTE", "ARRIVED", "ON_BOARD", "COMPLETED", "NO_SHOW_REPORTED"];
  const moves = order.filter((state) => assignment.allowedTransitions.includes(state));
  const [primary, ...rest] = moves;

  const move = (to: TransferLegStatus) =>
    run(to, () => updateAssignmentStatus(assignment.id, { to, expectedFrom: assignment.leg.status }));

  const big =
    "flex h-14 w-full items-center justify-center gap-2 rounded-sm text-[1rem] font-semibold transition-colors disabled:opacity-50";

  if (assignment.canAccept) {
    return (
      <div className="space-y-3">
        <button type="button" disabled={busy !== null} onClick={() => void run("accept", () => acceptAssignment(assignment.id))} className={`${big} bg-brand text-white hover:bg-brand-hover`}>
          {busy === "accept" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
          Accept this job
        </button>
        {!declining ? (
          <button type="button" disabled={busy !== null} onClick={() => setDeclining(true)} className={`${big} border border-line bg-surface text-body hover:border-ink/40`}>
            <X size={18} aria-hidden />
            I can&apos;t take it
          </button>
        ) : (
          <div className="space-y-2 rounded-sm border border-line bg-surface p-3">
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why not? (optional)"
              className="h-11 w-full rounded-sm border border-line px-3 text-[0.9375rem] text-ink focus:border-ink focus:outline-none"
            />
            <button type="button" disabled={busy !== null} onClick={() => void run("decline", () => declineAssignment(assignment.id, reason.trim() || undefined))} className={`${big} bg-error text-white`}>
              {busy === "decline" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null}
              Decline the job
            </button>
          </div>
        )}
        {error && <p role="alert" className="text-[0.875rem] text-error-text">{error}</p>}
      </div>
    );
  }

  if (!primary && !assignment.canDecline) {
    return error ? <p role="alert" className="text-[0.875rem] text-error-text">{error}</p> : null;
  }

  return (
    <div className="space-y-3">
      {primary && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void move(primary)}
          className={`${big} ${primary === "NO_SHOW_REPORTED" ? "bg-warning text-ink" : "bg-brand text-white hover:bg-brand-hover"}`}
        >
          {busy === primary ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
          {driverActionLabels[primary] ?? primary}
        </button>
      )}

      {rest.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {rest.map((state) => (
            <button
              key={state}
              type="button"
              disabled={busy !== null}
              onClick={() => void move(state)}
              className={`${big} h-12 border text-[0.9375rem] ${
                state === "NO_SHOW_REPORTED" ? "border-warning/50 bg-surface text-warning-text" : "border-line bg-surface text-body hover:border-ink/40"
              }`}
            >
              {busy === state ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
              {driverActionLabels[state] ?? state}
            </button>
          ))}
        </div>
      )}

      {assignment.canDecline && assignment.leg.status === "ACCEPTED" && (
        <button type="button" disabled={busy !== null} onClick={() => void run("decline", () => declineAssignment(assignment.id))} className="mx-auto block text-[0.8125rem] text-muted underline-offset-4 hover:underline">
          I can no longer take this job
        </button>
      )}

      {error && <p role="alert" className="text-[0.875rem] text-error-text">{error}</p>}
    </div>
  );
}
