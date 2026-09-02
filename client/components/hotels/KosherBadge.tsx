"use client";

import { BadgeCheck, ShieldAlert, ShieldQuestion, Star } from "lucide-react";

import { useI18n } from "@/lib/i18n/provider";
import { kosherBadge, type KosherTone } from "@/lib/hotels/kosher";
import type { KosherProfile, KosherSummary } from "@/types/catalogue";
import { cn } from "@/lib/utils";

/**
 * The kosher line on a card.
 *
 * Four tones, and the distinction between them is the feature. A travel agent
 * scanning a page of results has to be able to tell "somebody checked this
 * certificate" from "the hotel says so" from "the certificate ran out in
 * March", and a single "Kosher" chip would collapse all three into a claim the
 * platform cannot stand behind.
 *
 * `certified` comes from the server, where it needs a verified, unexpired,
 * property-scoped certificate. This component never re-derives it, and never
 * infers it from the feature list.
 */

const TONES: Record<KosherTone, { icon: typeof Star; className: string }> = {
  // The success colour, and the only tone that gets it. Everything else is
  // information; this one is an assurance.
  certified: { icon: BadgeCheck, className: "text-success" },
  expired: { icon: ShieldAlert, className: "text-error-text" },
  pending: { icon: ShieldQuestion, className: "text-muted" },
  declared: { icon: Star, className: "text-muted" },
};

interface KosherBadgeProps {
  kosher: KosherSummary | KosherProfile | null | undefined;
  /** Adds the certifying authority after the label, where there is room. */
  showAuthority?: boolean;
  className?: string;
}

export function KosherBadge({ kosher, showAuthority = false, className }: KosherBadgeProps) {
  const { t } = useI18n();

  if (!kosher) return null;

  const content = kosherBadge(kosher, t);

  if (!content) return null;

  const { icon: Icon, className: toneClass } = TONES[content.tone];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[0.8125rem]", toneClass, className)}
    >
      <Icon size={15} className="shrink-0" aria-hidden />
      <span className="font-medium">{content.label}</span>
      {showAuthority && content.detail && (
        // Hidden below `sm` rather than truncated: on a narrow card the
        // authority is the first thing worth losing, and a half-rendered
        // rabbinate name is worse than none.
        <span className="hidden text-muted sm:inline">· {content.detail}</span>
      )}
    </span>
  );
}
