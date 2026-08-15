import { cn } from "@/lib/utils";

/**
 * The panel's table.
 *
 * A real `<table>` rather than a grid of divs, so column headers are announced
 * with their cells and the whole thing can be copied into a spreadsheet. It
 * scrolls inside its own container — the page body never scrolls sideways.
 *
 * On narrow screens each row is expected to render as a stacked card instead;
 * the list screens do that by rendering `AdminCardList` below `lg` rather than
 * shrinking a table nobody can read on a phone.
 */

export interface Column {
  /** Header text. Pass an empty string for an action column. */
  label: string;
  /** Right-align numeric columns so figures line up on the decimal. */
  align?: "start" | "end";
  /** Hide below the given breakpoint to keep the table scannable. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const hideClasses: Record<NonNullable<Column["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export function DataTable({
  columns,
  children,
  caption,
  className,
}: {
  columns: Column[];
  children: React.ReactNode;
  /** Describes the table for screen readers; visually hidden. */
  caption: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[44rem] border-collapse text-start">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {columns.map((column, index) => (
              <th
                key={`${column.label}-${index}`}
                scope="col"
                className={cn(
                  "px-4 py-3 text-[0.6875rem] font-semibold tracking-[0.1em] whitespace-nowrap text-muted uppercase",
                  column.align === "end" ? "text-end" : "text-start",
                  column.hideBelow && hideClasses[column.hideBelow],
                  column.className,
                )}
              >
                {column.label || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Row({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("transition-colors hover:bg-surface-soft/60", className)}>{children}</tr>
  );
}

export function Cell({
  children,
  align,
  hideBelow,
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  hideBelow?: Column["hideBelow"];
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 align-middle text-[0.875rem] text-body",
        align === "end" ? "text-end" : "text-start",
        hideBelow && hideClasses[hideBelow],
        className,
      )}
    >
      {children}
    </td>
  );
}

/** "Nothing here" inside a table, spanning every column. */
export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <p className="text-[0.9375rem] text-muted">{message}</p>
      </td>
    </tr>
  );
}
