"use client";

import { CalendarSearch, Compass, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "./Button";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Icons a Server Component may ask for by name.
 *
 * A lucide icon is a `forwardRef` object, and React will not serialise one
 * across the server/client boundary — `icon={CalendarSearch}` from a page
 * throws "Only plain objects can be passed to Client Components". A string
 * crosses fine, so a server caller names its icon and this module, which is
 * already on the client, resolves it.
 */
const NAMED_ICONS = {
  compass: Compass,
  calendarSearch: CalendarSearch,
  searchX: SearchX,
} satisfies Record<string, LucideIcon>;

export type EmptyStateIconName = keyof typeof NAMED_ICONS;

interface EmptyStateProps {
  title: string;
  description: string;
  /** Client callers only — a component cannot cross the RSC boundary. */
  icon?: LucideIcon;
  /** Server callers: name the icon instead of passing it. */
  iconName?: EmptyStateIconName;
  action?: { label: string; href: string };
  /** Rendered instead of a link when the reset is local UI state. */
  onReset?: () => void;
  resetLabel?: string;
}

/** A designed "nothing here" — never a bare message. */
export function EmptyState({
  title,
  description,
  icon,
  iconName,
  action,
  onReset,
  resetLabel,
}: EmptyStateProps) {
  const { t } = useI18n();
  const Icon = icon ?? (iconName ? NAMED_ICONS[iconName] : Compass);

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
