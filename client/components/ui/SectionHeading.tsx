import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Optional "see all" link rendered opposite the title on wider screens. */
  action?: { label: string; href: string };
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  tone = "dark",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "text-center")}>
        {eyebrow && (
          <p className={cn("type-eyebrow mb-4", tone === "light" ? "text-on-dark/60" : "text-brand-text")}>
            {eyebrow}
          </p>
        )}
        <h2 className={cn("type-h2", tone === "light" ? "text-on-dark" : "text-ink")}>{title}</h2>
        {description && (
          <p
            className={cn(
              "type-body-lg mt-5",
              tone === "light" ? "text-on-dark/75" : "text-body",
            )}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-2 text-sm font-medium transition-colors",
            tone === "light" ? "text-on-dark hover:text-on-dark/70" : "text-ink hover:text-brand-text",
          )}
        >
          {action.label}
          <ArrowRight
            size={16}
            className="transition-transform duration-200 ease-(--ease-out-soft) group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      )}
    </div>
  );
}
