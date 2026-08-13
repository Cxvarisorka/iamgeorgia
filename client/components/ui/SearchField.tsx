"use client";

import { Search, X } from "lucide-react";

import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  tone?: "light" | "dark";
  className?: string;
}

/**
 * Visual search input. It filters the local mock data on the page it sits in —
 * there is no search service behind it.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  tone = "light",
  className,
}: SearchFieldProps) {
  const { t } = useI18n();

  return (
    <div className={cn("relative", className)}>
      <label htmlFor="search-field" className="sr-only">
        {label}
      </label>
      <Search
        size={17}
        className={cn(
          "pointer-events-none absolute top-1/2 start-4 -translate-y-1/2",
          tone === "light" ? "text-ink/45" : "text-muted",
        )}
        aria-hidden
      />
      <input
        id="search-field"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t.actions.search}
        className={cn(
          "h-13 w-full rounded-sm pr-11 pl-11 text-sm transition-colors focus:outline-none",
          tone === "light"
            ? "bg-background/95 text-ink backdrop-blur-sm placeholder:text-ink/45 focus:bg-background"
            : "border border-line bg-surface text-ink placeholder:text-muted focus:border-ink",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t.actions.clearSearch}
          className={cn(
            "absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
            tone === "light" ? "text-ink/50 hover:bg-ink/10" : "text-muted hover:bg-surface-soft",
          )}
        >
          <X size={15} aria-hidden />
        </button>
      )}
    </div>
  );
}
