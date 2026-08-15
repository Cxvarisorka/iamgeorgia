"use client";

import { useState } from "react";

import { monthlyBookings } from "@/data/admin/bookings";
import { cn } from "@/lib/utils";

/**
 * Bookings per month, split by product.
 *
 * Stacked bars because the operator asks two questions of this at once — how
 * much came in, and what the mix was. Grouped bars answer the second and make
 * the first arithmetic; two separate charts answer neither well in the space
 * a dashboard has.
 *
 * Colour is the validated three-step categorical set from `globals.css`,
 * assigned in fixed order and never cycled. Every series is also named in the
 * legend and in the tooltip, so identity never rests on colour alone, and the
 * same numbers are available to a screen reader as a real table below.
 */

const series = [
  { key: "hotel", label: "Hotels", color: "var(--color-series-1)" },
  { key: "tour", label: "Tours", color: "var(--color-series-2)" },
  { key: "transfer", label: "Transfers", color: "var(--color-series-3)" },
] as const;

type SeriesKey = (typeof series)[number]["key"];

/** Rounds the axis top up to a clean step so gridlines land on round numbers. */
function axisMax(values: number[]): number {
  const peak = Math.max(...values, 1);
  const step = peak > 400 ? 100 : peak > 150 ? 50 : peak > 60 ? 25 : 10;
  return Math.ceil(peak / step) * step;
}

export function BookingsChart() {
  const [active, setActive] = useState<number | null>(null);

  const totals = monthlyBookings.map((row) => row.hotel + row.tour + row.transfer);
  const max = axisMax(totals);
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction));

  return (
    <div>
      {/* Legend first: it names the series before the reader meets the marks. */}
      <ul className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        {series.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-[0.8125rem] text-body">{entry.label}</span>
          </li>
        ))}
      </ul>

      <div className="relative">
        {/* Recessive gridlines with the value axis on the left. */}
        <div className="pointer-events-none absolute inset-0 bottom-7" aria-hidden>
          {gridLines.map((value, index) => (
            <div
              key={value}
              className="absolute inset-x-0 flex items-center gap-2"
              style={{ bottom: `${(index / (gridLines.length - 1)) * 100}%` }}
            >
              <span className="w-8 shrink-0 text-end text-[0.6875rem] text-subtle tabular-nums">
                {value}
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
          ))}
        </div>

        <div className="relative flex h-56 items-end gap-1 ps-10 sm:gap-2">
          {monthlyBookings.map((row, index) => {
            const total = row.hotel + row.tour + row.transfer;
            const isActive = active === index;

            return (
              <div
                key={row.month}
                className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                role="img"
                aria-label={`${row.month}: ${total} bookings — ${row.hotel} hotels, ${row.tour} tours, ${row.transfer} transfers`}
              >
                {/* Segments run top-down so the flex column stacks bottom-up. */}
                <div
                  className={cn(
                    "flex w-full flex-col justify-end transition-opacity duration-150",
                    active !== null && !isActive && "opacity-45",
                  )}
                  style={{ height: `${(total / max) * 100}%` }}
                >
                  {[...series].reverse().map((entry, reverseIndex) => {
                    const value = row[entry.key as SeriesKey];
                    if (value === 0) return null;
                    const isTop = reverseIndex === 0;
                    return (
                      <div
                        key={entry.key}
                        style={{
                          height: `${(value / total) * 100}%`,
                          backgroundColor: entry.color,
                        }}
                        className={cn(
                          // A 2px surface gap separates stacked segments rather
                          // than a border, so the fills never touch.
                          "w-full border-b-2 border-surface last:border-b-0",
                          isTop && "rounded-t-[4px]",
                        )}
                      />
                    );
                  })}
                </div>

                <span className="mt-2 block h-5 truncate text-center text-[0.6875rem] text-subtle">
                  {row.month}
                </span>

                {isActive && (
                  /*
                   * Anchored to the top of the plot rather than to the top of
                   * the bar: a tall bar would push the tooltip out of the panel
                   * and under the sticky header. Overlaying the plot is the
                   * normal behaviour and the dimmed neighbours keep the hovered
                   * column readable underneath.
                   */
                  <div
                    role="presentation"
                    className="pointer-events-none absolute top-0 left-1/2 z-20 w-40 -translate-x-1/2 rounded-sm border border-line bg-surface p-3 shadow-lift"
                  >
                    <p className="text-[0.8125rem] font-semibold text-ink">{row.month} 2026</p>
                    <p className="mt-0.5 text-[0.6875rem] text-muted">
                      {total} bookings in total
                    </p>
                    <ul className="mt-2 space-y-1">
                      {series.map((entry) => (
                        <li
                          key={entry.key}
                          className="flex items-center justify-between gap-3 text-[0.75rem]"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: entry.color }}
                              aria-hidden
                            />
                            <span className="truncate text-body">{entry.label}</span>
                          </span>
                          <span className="shrink-0 font-medium text-ink tabular-nums">
                            {row[entry.key as SeriesKey]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* The same figures as a table, for anyone not reading the marks. */}
      <table className="sr-only">
        <caption>Bookings per month by product, September to August</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {series.map((entry) => (
              <th key={entry.key} scope="col">
                {entry.label}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {monthlyBookings.map((row) => (
            <tr key={row.month}>
              <th scope="row">{row.month}</th>
              <td>{row.hotel}</td>
              <td>{row.tour}</td>
              <td>{row.transfer}</td>
              <td>{row.hotel + row.tour + row.transfer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
