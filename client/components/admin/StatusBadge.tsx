import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  Clock,
  PauseCircle,
  Search,
  type LucideIcon,
} from "lucide-react";

import { bookingStatusLabels, paymentStatusLabels } from "@/data/admin/bookings";
import { partnerStatusLabels } from "@/data/admin/partners";
import { cn } from "@/lib/utils";
import type { BookingStatus, PartnerStatus, PaymentStatus } from "@/types";

/**
 * Status pills.
 *
 * Every state ships an icon and a word, never colour alone — an operator
 * scanning two hundred rows for the ones that need attention cannot be asked
 * to distinguish amber from green, and roughly one man in twelve could not do
 * it anyway. The colours come from the reserved semantic tokens, which is why
 * chart series never borrow them.
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

const bookingTones: Record<BookingStatus, { tone: Tone; icon: LucideIcon }> = {
  pending: { tone: "attention", icon: Clock },
  confirmed: { tone: "positive", icon: CheckCircle2 },
  completed: { tone: "neutral", icon: Circle },
  cancelled: { tone: "critical", icon: Ban },
};

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const { tone, icon } = bookingTones[status];
  return (
    <Pill tone={tone} icon={icon} className={className}>
      {bookingStatusLabels[status]}
    </Pill>
  );
}

const paymentTones: Record<PaymentStatus, { tone: Tone; icon: LucideIcon }> = {
  unpaid: { tone: "attention", icon: AlertTriangle },
  deposit: { tone: "info", icon: Circle },
  paid: { tone: "positive", icon: CheckCircle2 },
  refunded: { tone: "neutral", icon: Ban },
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const { tone, icon } = paymentTones[status];
  return (
    <Pill tone={tone} icon={icon} className={className}>
      {paymentStatusLabels[status]}
    </Pill>
  );
}

const partnerTones: Record<PartnerStatus, { tone: Tone; icon: LucideIcon }> = {
  pending: { tone: "attention", icon: Clock },
  "in-review": { tone: "info", icon: Search },
  active: { tone: "positive", icon: CheckCircle2 },
  suspended: { tone: "critical", icon: PauseCircle },
  rejected: { tone: "neutral", icon: Ban },
};

export function PartnerStatusBadge({
  status,
  className,
}: {
  status: PartnerStatus;
  className?: string;
}) {
  const { tone, icon } = partnerTones[status];
  return (
    <Pill tone={tone} icon={icon} className={className}>
      {partnerStatusLabels[status]}
    </Pill>
  );
}
