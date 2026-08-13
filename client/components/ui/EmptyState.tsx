"use client";

import { Compass } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "./Button";
import { useI18n } from "@/lib/i18n/provider";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  /** Rendered instead of a link when the reset is local UI state. */
  onReset?: () => void;
  resetLabel?: string;
}

/** A designed "nothing here" — never a bare message. */
export function EmptyState({
  title,
  description,
  icon: Icon = Compass,
  action,
  onReset,
  resetLabel,
}: EmptyStateProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line bg-surface-soft/40 px-6 py-20 text-center">
      <span className="mb-6 flex size-14 items-center justify-center rounded-full bg-background text-brand-text">
        <Icon size={22} aria-hidden />
      </span>
      <h3 className="type-h3 max-w-md">{title}</h3>
      <p className="type-body mt-3 max-w-md text-muted">{description}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            {resetLabel ?? t.actions.clearFilters}
          </Button>
        )}
        {action && (
          <Button href={action.href} variant="primary">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
