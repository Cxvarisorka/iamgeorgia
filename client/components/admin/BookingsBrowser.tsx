"use client";

import Link from "next/link";
import { ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPanel } from "./AdminPage";
import { Cell, DataTable, EmptyRow, Row } from "./DataTable";
import { BookingStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import {
  bookingSortOptions,
  bookingStatusLabels,
  productKindLabels,
  type BookingSort,
} from "@/data/admin/bookings";
import { formatAdminDate } from "@/lib/admin/metrics";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn, formatPrice } from "@/lib/utils";
import type { Booking, BookingStatus, ProductKind } from "@/types";

const statusFilters: (BookingStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

const kindFilters: (ProductKind | "all")[] = ["all", "hotel", "tour", "transfer"];

interface BookingsBrowserProps {
  bookings: Booking[];
  /** Seeded from the URL, so the dashboard can deep-link to the pending queue. */
  initialStatus: BookingStatus | "all";
}

/**
 * The bookings ledger: search, filter, sort, open.
 *
 * All filtering is client-side over the mock array. Below `lg` the table is
 * replaced by stacked cards rather than being squeezed — a five-column table
 * on a phone is a table nobody reads.
 */
export function BookingsBrowser({ bookings, initialStatus }: BookingsBrowserProps) {
  const path = useLocalePath();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">(initialStatus);
  const [kind, setKind] = useState<ProductKind | "all">("all");
  const [sort, setSort] = useState<BookingSort>("recent");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = bookings.filter((booking) => {
      if (status !== "all" && booking.status !== status) return false;
      if (kind !== "all" && booking.kind !== kind) return false;
      if (needle) {
        const haystack = [
          booking.reference,
          booking.customer.name,
          booking.customer.email,
          booking.customer.country,
          booking.productName,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sort === "recent") sorted.sort((a, b) => b.placedOn.localeCompare(a.placedOn));
    if (sort === "travel") sorted.sort((a, b) => a.travelDate.localeCompare(b.travelDate));
    if (sort === "value-high") sorted.sort((a, b) => b.total - a.total);
    if (sort === "value-low") sorted.sort((a, b) => a.total - b.total);
    return sorted;
  }, [bookings, query, status, kind, sort]);

  const activeFilters =
    (status !== "all" ? 1 : 0) + (kind !== "all" ? 1 : 0) + (query.trim() ? 1 : 0);

  const reset = () => {
    setQuery("");
    setStatus("all");
    setKind("all");
  };

  const chip = (selected: boolean) =>
    cn(
      "inline-flex h-8 items-center rounded-full border px-3 text-[0.75rem] font-medium whitespace-nowrap transition-colors",
      selected
        ? "border-brand bg-brand-soft text-brand-text"
        : "border-line bg-transparent text-body hover:border-subtle hover:text-ink",
    );

  return (
    <>
      {/* Filters sit in one row above the results, as an operator expects. */}
      <div className="mt-6 rounded-sm border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-subtle"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Reference, guest name, email or product"
              aria-label="Search bookings"
              className="h-10 w-full rounded-sm border border-line bg-background/50 ps-9 pe-3 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex min-w-0 items-center gap-2">
              <SlidersHorizontal size={15} className="shrink-0 text-subtle" aria-hidden />
              <span className="sr-only">Sort bookings by</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as BookingSort)}
                className="h-10 rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-body focus:border-ink focus:outline-none"
              >
                {bookingSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm px-3 text-[0.8125rem] font-medium text-brand-text transition-colors hover:bg-surface-soft"
              >
                <X size={14} aria-hidden />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-start sm:gap-8">
          <fieldset className="min-w-0">
            <legend className="mb-2 text-[0.6875rem] font-semibold tracking-[0.1em] text-muted uppercase">
              Status
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {statusFilters.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                  className={chip(status === value)}
                >
                  {value === "all" ? "All" : bookingStatusLabels[value]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="mb-2 text-[0.6875rem] font-semibold tracking-[0.1em] text-muted uppercase">
              Product
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {kindFilters.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                  className={chip(kind === value)}
                >
                  {value === "all" ? "All" : productKindLabels[value]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <p className="mt-4 text-[0.8125rem] text-muted" aria-live="polite">
        <span className="font-medium text-ink">{results.length}</span>
        {results.length === 1 ? " booking" : " bookings"}
        {activeFilters > 0 ? " match your filters" : " in the ledger"}
      </p>

      {/* Desktop: the full ledger. */}
      <AdminPanel className="mt-3 hidden lg:block" bodyClassName="p-0">
        <DataTable
          caption="All bookings, filterable by status and product"
          columns={[
            { label: "Reference" },
            { label: "Customer" },
            { label: "Product" },
            { label: "Travel date" },
            { label: "Status" },
            { label: "Payment", hideBelow: "xl" },
            { label: "Total", align: "end" },
            { label: "" },
          ]}
        >
          {results.length === 0 ? (
            <EmptyRow
              colSpan={8}
              message="No bookings match those filters. Clear them to see the full ledger."
            />
          ) : (
            results.map((booking) => (
              <Row key={booking.id}>
                <Cell>
                  <Link
                    href={path(`/admin/bookings/${booking.id}`)}
                    className="font-medium text-ink tabular-nums underline-offset-4 hover:underline"
                  >
                    {booking.reference}
                  </Link>
                  <span className="block text-[0.75rem] text-subtle">
                    Placed {formatAdminDate(booking.placedOn)}
                  </span>
                </Cell>
                <Cell>
                  <span className="block truncate font-medium text-ink">
                    {booking.customer.name}
                  </span>
                  <span className="block truncate text-[0.75rem] text-muted">
                    {booking.customer.country}
                  </span>
                </Cell>
                <Cell>
                  <span className="block max-w-52 truncate">{booking.productName}</span>
                  <span className="block text-[0.75rem] text-subtle">
                    {productKindLabels[booking.kind]} · {booking.guests}{" "}
                    {booking.guests === 1 ? "guest" : "guests"}
                  </span>
                </Cell>
                <Cell className="whitespace-nowrap">
                  {formatAdminDate(booking.travelDate)}
                </Cell>
                <Cell>
                  <BookingStatusBadge status={booking.status} />
                </Cell>
                <Cell hideBelow="xl">
                  <PaymentStatusBadge status={booking.payment} />
                </Cell>
                <Cell align="end" className="font-semibold text-ink tabular-nums">
                  {formatPrice(booking.total)}
                </Cell>
                <Cell align="end">
                  <Link
                    href={path(`/admin/bookings/${booking.id}`)}
                    aria-label={`Open booking ${booking.reference}`}
                    className="inline-flex size-8 items-center justify-center rounded-sm text-subtle transition-colors hover:bg-surface-soft hover:text-ink"
                  >
                    <ChevronRight size={16} className="rtl:-scale-x-100" aria-hidden />
                  </Link>
                </Cell>
              </Row>
            ))
          )}
        </DataTable>
      </AdminPanel>

      {/* Mobile: one card per booking. */}
      <div className="mt-3 flex flex-col gap-3 lg:hidden">
        {results.length === 0 ? (
          <p className="rounded-sm border border-dashed border-line bg-surface-soft/40 px-5 py-12 text-center text-[0.875rem] text-muted">
            No bookings match those filters.
          </p>
        ) : (
          results.map((booking) => (
            <Link
              key={booking.id}
              href={path(`/admin/bookings/${booking.id}`)}
              className="rounded-sm border border-line bg-surface p-4 transition-colors hover:border-subtle"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-ink tabular-nums">
                    {booking.reference}
                  </p>
                  <p className="mt-1 truncate text-[0.9375rem] font-medium text-ink">
                    {booking.customer.name}
                  </p>
                  <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
                    {booking.productName}
                  </p>
                </div>
                <p className="shrink-0 text-end text-[0.9375rem] font-semibold text-ink tabular-nums">
                  {formatPrice(booking.total)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <BookingStatusBadge status={booking.status} />
                <PaymentStatusBadge status={booking.payment} />
                <span className="ms-auto text-[0.75rem] text-subtle">
                  {formatAdminDate(booking.travelDate)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
