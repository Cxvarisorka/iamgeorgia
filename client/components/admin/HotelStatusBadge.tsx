import {
  Archive,
  Ban,
  CheckCircle2,
  EyeOff,
  PenLine,
  type LucideIcon,
} from "lucide-react";

import { hotelStatusLabels } from "@/lib/admin/hotels";
import { cn } from "@/lib/utils";
import type { HotelStatus } from "@/types/catalogue";

/**
 * The hotel lifecycle pill, following the StatusBadge conventions: an icon and
 * a word for every state, never colour alone.
 */

type Tone = "neutral" | "positive" | "attention" | "critical" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-soft text-muted",
  positive: "bg-success/12 text-success",
  attention: "bg-warning/15 text-warning-text",
  critical: "bg-error/12 text-error-text",
  info: "bg-info/12 text-info",
};

const hotelTones: Record<HotelStatus, { tone: Tone; icon: LucideIcon }> = {
  DRAFT: { tone: "info", icon: PenLine },
  ACTIVE: { tone: "positive", icon: CheckCircle2 },
  INACTIVE: { tone: "attention", icon: EyeOff },
  SUSPENDED: { tone: "critical", icon: Ban },
  ARCHIVED: { tone: "neutral", icon: Archive },
};

export function HotelStatusBadge({
  status,
  className,
}: {
  status: HotelStatus;
  className?: string;
}) {
  const { tone, icon: Icon } = hotelTones[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <Icon size={13} className="shrink-0" aria-hidden />
      {hotelStatusLabels[status]}
    </span>
  );
}
