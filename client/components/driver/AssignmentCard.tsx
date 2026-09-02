import Link from "next/link";
import { ChevronRight, Plane, Users } from "lucide-react";

import { TransferLegStatusBadge } from "@/components/admin/DispatchBadges";
import { driverLegStatusLabels, formatPickup } from "@/lib/admin/dispatch";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { DriverAssignment } from "@/types/driver";

/** One job in a list: when, where, how many, and where it stands. Big enough to tap. */
export function AssignmentCard({ assignment, locale }: { assignment: DriverAssignment; locale: Locale }) {
  const { leg, booking } = assignment;
  const offered = assignment.status === "OFFERED";

  return (
    <Link
      href={localePath(locale, `/driver/assignments/${assignment.id}`)}
      className={`flex items-center gap-4 rounded-sm border bg-surface p-4 transition-colors hover:border-ink/40 ${
        offered ? "border-brand" : "border-line"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[0.75rem] font-semibold tracking-wide text-muted uppercase tabular-nums">
          {formatPickup(leg.pickupAt, leg.timezone)}
        </p>
        <p className="mt-1 truncate text-[1rem] font-medium text-ink">
          {leg.from} → {leg.to}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
          <span className="inline-flex items-center gap-1">
            <Users size={13} aria-hidden />
            {booking.passengers} · {booking.luggage} bags
          </span>
          {booking.flightNumber && (
            <span className="inline-flex items-center gap-1">
              <Plane size={13} aria-hidden />
              {booking.flightNumber}
            </span>
          )}
          <span>{booking.leadPassengerName}</span>
        </p>
        <div className="mt-2">
          <TransferLegStatusBadge status={leg.status} label={driverLegStatusLabels[leg.status]} />
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-subtle rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}
