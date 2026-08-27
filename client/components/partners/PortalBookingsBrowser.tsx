"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Cell, DataTable, EmptyRow, Row, type Column } from "@/components/admin/DataTable";
import { BookingStatusBadge } from "@/components/admin/StatusBadge";
import {
  BOOKING_STATUSES,
  bookingStatusLabels,
  formatStay,
  formatStayDate,
} from "@/lib/admin/bookings";
import { useLocalePath } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BookingSummary } from "@/types/booking";

/**
 * A partner's own bookings.
 *
 * The same URL-driven filtering the admin queue uses, and for the same reason:
 * nothing is filtered in the browser, so a partner with four thousand bookings
 * costs exactly what one with four costs. The display vocabulary is shared with
 * the panel rather than restated — two screens calling the same state different
 * things is how a back office starts lying to itself.
 *
 * The reference is the only link out, because it is the one thing a partner
 * quotes when they call about a booking and the one thing they will have
 * written down.
 */

const columns: Column[] = [
  { label: "Reference" },
  { label: "Guest" },
  { label: "Property", hideBelow: "xl" },
  { label: "Stay" },
  { label: "Status" },
  { label: "Total", align: "end" },
];

export function PortalBookingsBrowser({
  data,
  total,
  page,
  totalPages,
}: {
  data: BookingSummary[];
  total: number;
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const path = useLocalePath();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("search") ?? "");

  const apply = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    }

    // A changed filter invalidates the page number: page 4 of the old result
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
        <div className="relative min-w-[15rem] flex-1">
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
            aria-label="Search your bookings"
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
          {BOOKING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {bookingStatusLabels[value]}
            </option>
          ))}
        </select>

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
          <DataTable columns={columns} caption="Your bookings">
            {data.length === 0 ? (
              <EmptyRow colSpan={columns.length} message="Nothing to show." />
            ) : (
              data.map((booking) => (
                <Row key={booking.reference}>
                  <Cell>
                    <Link
                      href={path(`/portal/bookings/${booking.reference}`)}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {booking.reference}
                    </Link>
                  </Cell>
                  <Cell>{booking.leadGuestName}</Cell>
                  <Cell hideBelow="xl">{booking.hotel.name}</Cell>
                  <Cell>{formatStay(booking.checkIn, booking.checkOut, booking.nights)}</Cell>
                  <Cell>
                    <BookingStatusBadge status={booking.status} />
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
          {data.length === 0 && (
            <li className="py-12 text-center text-[0.875rem] text-muted">Nothing to show.</li>
          )}
          {data.map((booking) => (
            <li key={booking.reference} className="rounded-sm border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={path(`/portal/bookings/${booking.reference}`)}
                  className="font-medium text-ink underline-offset-4 hover:underline"
                >
                  {booking.reference}
                </Link>
                <BookingStatusBadge status={booking.status} />
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
