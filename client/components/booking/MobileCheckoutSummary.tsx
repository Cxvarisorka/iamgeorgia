import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface MobileCheckoutSummaryProps {
  title: string;
  /** The formatted total, when the draft still carries one. */
  total?: string | null;
  /** The same summary panel the sidebar shows from `lg`. */
  children: React.ReactNode;
  className?: string;
}

/**
 * The checkout summary for screens below `lg`, where the sidebar would
 * otherwise drop under the whole form and the total would only appear after
 * the last field.
 *
 * Sits above the form and starts collapsed: the guest can confirm what they
 * are paying for and then get straight to typing. The same pattern as the
 * transfer booking page. Native `<details>`, so it works before hydration and
 * is keyboard-operable for free.
 */
export function MobileCheckoutSummary({ title, total, children, className }: MobileCheckoutSummaryProps) {
  return (
    <details className={cn("group lg:hidden", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border border-line bg-surface px-4 py-3.5">
        <span className="type-h4">{title}</span>
        <span className="flex items-center gap-3">
          {total && <span className="type-h4 tabular-nums">{total}</span>}
          <ChevronDown
            size={18}
            className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
