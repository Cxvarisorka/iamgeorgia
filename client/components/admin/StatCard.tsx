import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  /** The headline figure, already formatted. */
  value: string;
  icon: LucideIcon;
  /** Signed percentage against the previous period. Omit when there is nothing to compare. */
  change?: number | null;
  /** Names the comparison period, e.g. "vs last month". */
  changeLabel?: string;
  hint?: string;
  className?: string;
}

/**
 * A single headline number.
 *
 * Deliberately not a chart — one figure with a comparison is the form that
 * answers "how are we doing" fastest, and a sparkline behind four of these
 * would be decoration. The delta carries an arrow and a sign as well as a
 * colour, so direction survives without colour vision.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeLabel = "vs last month",
  hint,
  className,
}: StatCardProps) {
  const hasChange = typeof change === "number";
  const positive = hasChange && change > 0;
  const negative = hasChange && change < 0;

  return (
    <div className={cn("rounded-sm border border-line bg-surface p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.8125rem] text-muted">{label}</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface-soft text-brand-text">
          <Icon size={16} aria-hidden />
        </span>
      </div>

      <p className="mt-3 font-display text-[1.75rem] leading-none text-ink tabular-nums">
        {value}
      </p>

      {hasChange ? (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[0.75rem]">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium tabular-nums",
              positive && "text-success",
              negative && "text-error-text",
              !positive && !negative && "text-muted",
            )}
          >
            {positive && <ArrowUpRight size={13} aria-hidden />}
            {negative && <ArrowDownRight size={13} aria-hidden />}
            {change > 0 ? "+" : ""}
            {change}%
          </span>
          <span className="text-subtle">{changeLabel}</span>
        </p>
      ) : (
        hint && <p className="mt-3 text-[0.75rem] text-subtle">{hint}</p>
      )}
    </div>
  );
}
