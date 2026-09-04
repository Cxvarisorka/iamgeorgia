"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Clock, Search } from "lucide-react";

import { Cell, DataTable, EmptyRow, Row, type Column } from "./DataTable";
import { TourBookingStatusBadge } from "./StatusBadge";
import { formatInstant } from "@/lib/admin/bookings";
import { TOUR_BOOKING_STATUSES, formatDeparture, tourBookingStatusLabels } from "@/lib/admin/tours";
import { formatMoney } from "@/lib/money";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { TourBookingSummary } from "@/types/tour";

/**
 * The tour booking register — shared by the admin queue and the partner
 * portal, which differ only in where a row links to.
 *
 * Filters live in the URL, and nothing is filtered locally. An on-request
 * booking shows its deadline under the reference: that is the number an
 * operator is racing.
 */

const columns: Column[] = [
  { label: "Reference" },
  { label: "Traveller" },
  { label: "Tour", hideBelow: "lg" },
  { label: "Departure", hideBelow: "md" },
  { label: "Status" },
  { label: "Total", align: "end" },
];

export function TourBookingsBrowser({
  data,
  total,
  page,
  totalPages,
  basePath,
  caption = "Tour bookings",
}: {
  data: TourBookingSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Where a reference links: the admin detail or the portal page. */
  basePath: string;
  caption?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const localePath = useLocalePath();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("search") ?? "");

  const apply = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");

    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  useEffect(() => {
    const current = params.get("search") ?? "";
    if (search === current) return;

    const timer = setTimeout(() => apply({ search: search || null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const status = params.get("status") ?? "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const field =
    "h-10 rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-ink outline-none focus:border-ink";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Reference, traveller name or email"
            aria-label="Search tour bookings"
            className={cn(field, "w-full ps-9")}
          />
        </div>

        <select
          value={status}
          onChange={(event) => apply({ status: event.target.value })}
          aria-label="Filter by status"
          className={field}
        >
          <option value="all">All statuses</option>
          {TOUR_BOOKING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {tourBookingStatusLabels[value]}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-[0.8125rem] text-muted">
          Departing
          <input type="date" value={from} onChange={(event) => apply({ from: event.target.value || null })} aria-label="Departing on or after" className={field} />
          <span aria-hidden>–</span>
          <input type="date" value={to} onChange={(event) => apply({ to: event.target.value || null })} aria-label="Departing on or before" className={field} />
        </label>
      </div>

      <p className="mt-3 text-[0.8125rem] text-muted" aria-live="polite">
        {total === 0 ? "No bookings match these filters." : `${total} booking${total === 1 ? "" : "s"}`}
      </p>

      <div className={cn("mt-4 transition-opacity", pending && "opacity-60")}>
        <div className="hidden rounded-sm border border-line bg-surface lg:block">
          <DataTable columns={columns} caption={caption}>
            {data.length === 0 ? (
              <EmptyRow colSpan={columns.length} message="Nothing to show." />
            ) : (
              data.map((booking) => (
                <Row key={booking.reference}>
                  <Cell>
                    <Link
                      href={localePath(`${basePath}/${booking.reference}`)}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {booking.reference}
                    </Link>
                    {booking.status === "PENDING" && booking.requestDeadlineAt && (
                      <span className="mt-0.5 flex items-center gap-1 text-[0.75rem] text-warning-text">
                        <Clock size={11} aria-hidden />
                        by {formatInstant(booking.requestDeadlineAt)}
                      </span>
                    )}
                  </Cell>
                  <Cell>
                    {booking.leadTravellerName}
                    {booking.partner && (
                      <span className="block text-[0.75rem] text-muted">{booking.partner.name}</span>
                    )}
                  </Cell>
                  <Cell hideBelow="lg">
                    {booking.tour.title ?? "—"}
                    {booking.option && <span className="block text-[0.75rem] text-muted">{booking.option.name}</span>}
                  </Cell>
                  <Cell hideBelow="md">{formatDeparture(booking.date, booking.endDate)}</Cell>
                  <Cell>
                    <TourBookingStatusBadge status={booking.status} />
                  </Cell>
                  <Cell align="end" className="tabular-nums">
                    {formatMoney(booking.totalCents, booking.currency)}
                  </Cell>
                </Row>
              ))
            )}
          </DataTable>
        </div>

        <ul className="flex flex-col gap-3 lg:hidden">
          {data.length === 0 && <li className="py-12 text-center text-[0.875rem] text-muted">Nothing to show.</li>}
          {data.map((booking) => (
            <li key={booking.reference} className="rounded-sm border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={localePath(`${basePath}/${booking.reference}`)}
                  className="font-medium text-ink underline-offset-4 hover:underline"
                >
                  {booking.reference}
                </Link>
                <TourBookingStatusBadge status={booking.status} />
              </div>
              <p className="mt-2 text-[0.875rem] text-body">{booking.leadTravellerName}</p>
              <p className="text-[0.8125rem] text-muted">{booking.tour.title}</p>
              <p className="mt-1 text-[0.8125rem] text-muted">{formatDeparture(booking.date, booking.endDate)}</p>
              <p className="mt-2 font-medium text-ink tabular-nums">
                {formatMoney(booking.totalCents, booking.currency)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => apply({ page: String(page - 1) })}
            className="inline-flex h-10 items-center rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink hover:border-ink hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[0.8125rem] text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => apply({ page: String(page + 1) })}
            className="inline-flex h-10 items-center rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink hover:border-ink hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
