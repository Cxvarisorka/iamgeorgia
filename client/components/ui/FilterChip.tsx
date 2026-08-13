"use client";

import { cn } from "@/lib/utils";

interface FilterChipProps {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

/** Toggle pill used by every filter row in the product. */
export function FilterChip({ children, selected, onClick, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-[0.8125rem] font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-200 ease-(--ease-out-soft)",
        // Selected filters use the soft brand tint rather than a solid orange
        // fill — a page of filled orange chips would swamp the palette.
        selected
          ? "border-brand bg-brand-soft text-brand-text"
          : "border-line bg-transparent text-body hover:border-subtle hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
