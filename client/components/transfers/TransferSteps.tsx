"use client";

import { Check } from "lucide-react";

import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface TransferStepsProps {
  /** 1-based index of the step the traveller is on. */
  current: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Where you are in the booking. Rendered as an ordered list so it is a
 * structure a screen reader can navigate, with the current step marked by
 * `aria-current` rather than by colour alone.
 */
export function TransferSteps({ current, className }: TransferStepsProps) {
  const { t } = useI18n();
  const steps = [
    t.transfers.steps.search,
    t.transfers.steps.choose,
    t.transfers.steps.details,
    t.transfers.steps.confirmed,
  ];

  return (
    <nav aria-label={t.transfers.steps.navLabel} className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
        {steps.map((label, index) => {
          const position = index + 1;
          const done = position < current;
          const active = position === current;

          return (
            <li key={label} className="flex items-center gap-2 sm:gap-3">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                  active && "bg-brand-soft text-brand-text",
                  done && "text-success",
                  !active && !done && "text-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold tabular-nums",
                    active && "bg-brand text-white",
                    done && "bg-success text-white",
                    !active && !done && "border border-line text-subtle",
                  )}
                >
                  {done ? <Check size={12} aria-hidden /> : position}
                </span>
                {label}
                {done && <span className="sr-only">{t.transfers.steps.completed}</span>}
              </span>

              {position < steps.length && (
                <span className="h-px w-4 bg-line sm:w-8" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
