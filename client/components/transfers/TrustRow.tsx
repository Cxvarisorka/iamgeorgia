import { BadgeCheck, Headphones, ShieldCheck, UserRoundCheck } from "lucide-react";

import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/**
 * Trust markers.
 *
 * Ground transport is the part of a trip where a traveller is most exposed —
 * a stranger, a car, an unfamiliar road, usually at night. These say what the
 * studio actually does, and nothing more: they are descriptions of our process,
 * not guarantees, and none of them commits us to anything a prototype cannot
 * honour.
 *
 * The wording lives in `t.transfers.trust`; only the icons are here, paired
 * positionally with the four entries the dictionary is guaranteed to hold.
 */
const icons = [BadgeCheck, UserRoundCheck, ShieldCheck, Headphones];

interface TrustRowProps {
  tone?: "dark" | "light";
  className?: string;
}

export async function TrustRow({ tone = "dark", className }: TrustRowProps) {
  const { t } = await getI18n();

  return (
    <ul className={cn("grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {t.transfers.trust.map((marker, index) => {
        const Icon = icons[index] ?? BadgeCheck;
        return (
          <li key={marker.title}>
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full",
                tone === "light" ? "bg-on-dark/12 text-on-dark" : "bg-surface-soft text-brand-text",
              )}
            >
              <Icon size={18} aria-hidden />
            </span>
            <h3
              className={cn("type-h4 mt-4", tone === "light" ? "text-on-dark" : "text-ink")}
            >
              {marker.title}
            </h3>
            <p
              className={cn(
                "type-body-sm mt-2",
                tone === "light" ? "text-on-dark/70" : "text-muted",
              )}
            >
              {marker.body}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
