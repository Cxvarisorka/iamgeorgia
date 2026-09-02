import {
  Archive,
  CheckCircle2,
  Circle,
  Clock,
  PauseCircle,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  UserX,
  type LucideIcon,
} from "lucide-react";

import { fleetStatusLabels, verificationLabels } from "@/lib/admin/fleet";
import { cn } from "@/lib/utils";
import type { DriverVerificationStatus } from "@/types/driver";
import type { TransferStatus } from "@/types/transfer";

/**
 * Status pills for cars and drivers. The same rule as `StatusBadge.tsx`:
 * every state ships an icon and a word, never colour alone.
 */

type Tone = "neutral" | "positive" | "attention" | "critical" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-soft text-muted",
  positive: "bg-success/12 text-success",
  attention: "bg-warning/15 text-warning-text",
  critical: "bg-error/12 text-error-text",
  info: "bg-info/12 text-info",
};

function Pill({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: Tone;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <Icon size={13} className="shrink-0" aria-hidden />
      {children}
    </span>
  );
}

const fleetTones: Record<TransferStatus, { tone: Tone; icon: LucideIcon }> = {
  DRAFT: { tone: "attention", icon: Clock },
  ACTIVE: { tone: "positive", icon: CheckCircle2 },
  INACTIVE: { tone: "neutral", icon: PauseCircle },
  ARCHIVED: { tone: "neutral", icon: Archive },
};

export function FleetStatusBadge({ status, className }: { status: TransferStatus; className?: string }) {
  const { tone, icon } = fleetTones[status];
  return (
    <Pill tone={tone} icon={icon} className={className}>
      {fleetStatusLabels[status]}
    </Pill>
  );
}

const verificationTones: Record<DriverVerificationStatus, { tone: Tone; icon: LucideIcon }> = {
  UNVERIFIED: { tone: "neutral", icon: ShieldQuestion },
  PENDING: { tone: "attention", icon: Clock },
  VERIFIED: { tone: "positive", icon: ShieldCheck },
  REJECTED: { tone: "critical", icon: ShieldX },
};

export function DriverVerificationBadge({
  status,
  className,
}: {
  status: DriverVerificationStatus;
  className?: string;
}) {
  const { tone, icon } = verificationTones[status];
  return (
    <Pill tone={tone} icon={icon} className={className}>
      {verificationLabels[status]}
    </Pill>
  );
}

export function DriverActiveBadge({ isActive, className }: { isActive: boolean; className?: string }) {
  return isActive ? (
    <Pill tone="positive" icon={Circle} className={className}>
      Active
    </Pill>
  ) : (
    <Pill tone="critical" icon={UserX} className={className}>
      Deactivated
    </Pill>
  );
}
