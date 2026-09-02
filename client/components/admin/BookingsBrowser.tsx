"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Clock, Search } from "lucide-react";

import { BookingStatusBadge } from "./StatusBadge";
import { Cell, DataTable, EmptyRow, Row, type Column } from "./DataTable";
import {
  BOOKING_STATUSES,
  bookingStatusLabels,
  formatStay,
  formatStayDate,
} from "@/lib/admin/bookings";
import { formatMoney } from "@/lib/money";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { BookingSummary, HotelBookingStatus } from "@/types/booking";

/**
 * The bookings list.
 *
 * Filters live in the URL, not in component state, so a filtered view is
 * shareable, survives a reload and carries into the browser's history. The
 * component never filters locally — it writes to the URL and lets the Server
 * Component above it re-render, which is the same pattern `PartnersBrowser`
 * established and the reason a hundred thousand bookings will not have to be
 * shipped to the browser to search them.
 */

const columns: Column[] = [
  { label: "Reference" },
  { label: "Guest" },
  { label: "Property", hideBelow: "lg" },
  { label: "Stay", hideBelow: "md" },
  { label: "Status" },
  { label: "Total", align: "end" },
];

export function BookingsBrowser({
  data,
  total,
  page,
  pageSize,
  totalPages,
  lockedStatuses,
}: {
  data: BookingSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Set on a fixed queue, where the status filter is not the operator's to change. */
  lockedStatuses?: HotelBookingStatus[];
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

    // Changing a filter invalidates the page number: page 4 of the old result
    // set is rarely page 4 of the new one, and is often past the end of it.
    if (!("page" in changes)) next.delete("page");

    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  // Debounced, so typing a reference does not fire a request per keystroke.
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
            placeholder="Reference, guest name or email"
            aria-label="Search bookings"
            className={cn(field, "w-full ps-9")}
          />
        </div>

        {!lockedStatuses && (
          <select
            value={status}
            onChange={(event) => apply({ status: event.target.value })}
            aria-label="Filter by status"
            className={field}
          >
            <option value="all">All statuses</option>
            {BOOKING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {bookingStatusLabels[value]}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 text-[0.8125rem] text-muted">
          Arriving
          <input
            type="date"
            value={from}
            onChange={(event) => apply({ from: event.target.value || null })}
            aria-label="Arriving on or after"
            className={field}
          />
          <span aria-hidden>–</span>
          <input
            type="date"
            value={to}
            onChange={(event) => apply({ to: event.target.value || null })}
            aria-label="Arriving on or before"
            className={field}
          />
        </label>
      </div>

      <p className="mt-3 text-[0.8125rem] text-muted" aria-live="polite">
        {total === 0
          ? "No bookings match these filters."
          : `${total} booking${total === 1 ? "" : "s"}`}
      </p>

      <div className={cn("mt-4 transition-opacity", pending && "opacity-60")}>
        {/* Desktop: a real table. Below lg the same rows render as cards. */}
        <div className="hidden rounded-sm border border-line bg-surface lg:block">
          <DataTable columns={columns} caption="Hotel bookings">
            {data.length === 0 ? (
              <EmptyRow colSpan={columns.length} message="Nothing to show." />
            ) : (
              data.map((booking) => (
                <Row key={booking.reference}>
                  <Cell>
                    <Link
                      href={localePath(`/admin/bookings/${booking.reference}`)}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {booking.reference}
                    </Link>
                  </Cell>
                  <Cell>{booking.leadGuestName}</Cell>
                  <Cell hideBelow="lg">{booking.hotel.name}</Cell>
                  <Cell hideBelow="md">
                    {formatStay(booking.checkIn, booking.checkOut, booking.nights)}
                  </Cell>
                  <Cell>
                    <BookingStatusBadge status={booking.status} />
                    {/* Beside the status, never instead of it. The booking is
                        confirmed; it is a requirement that is outstanding, and
                        conflating the two would put a perfectly good
                        reservation in doubt. */}
                    {booking.requestsPending > 0 && (
                      <span className="ms-2 inline-flex items-center gap-1 text-[0.75rem] text-muted">
                        <Clock size={12} aria-hidden />
                        {booking.requestsPending}
                      </span>
                    )}
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
          {data.length === 0 && <li className="py-12 text-center text-muted">Nothing to show.</li>}
          {data.map((booking) => (
            <li key={booking.reference} className="rounded-sm border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={localePath(`/admin/bookings/${booking.reference}`)}
                  className="font-medium text-ink underline-offset-4 hover:underline"
                >
                  {booking.reference}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <BookingStatusBadge status={booking.status} />
                  {booking.requestsPending > 0 && (
                    <span className="inline-flex items-center gap-1 text-[0.75rem] text-muted">
                      <Clock size={12} aria-hidden />
                      {booking.requestsPending}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-[0.875rem] text-body">{booking.leadGuestName}</p>
              <p className="text-[0.8125rem] text-muted">{booking.hotel.name}</p>
              <p className="mt-1 text-[0.8125rem] text-muted">
                {formatStayDate(booking.checkIn)} · {booking.nights}{" "}
                {booking.nights === 1 ? "night" : "nights"} · {booking.rooms}{" "}
                {booking.rooms === 1 ? "room" : "rooms"}
              </p>
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
