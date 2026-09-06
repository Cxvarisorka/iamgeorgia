"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Clock, Search } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Cell, DataTable, EmptyRow, Row, type Column } from "./DataTable";
import { OrderStatusBadge } from "./StatusBadge";
import {
  ORDER_STATUSES,
  formatOrderDates,
  formatOrderParty,
  isRequestOverdue,
  orderStatusHints,
  orderStatusLabels,
} from "@/lib/admin/orders";
import { formatInstant } from "@/lib/admin/bookings";
import { formatMoney } from "@/lib/money";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { OrderStatus, OrderSummary } from "@/types/order";

/**
 * The order register — one row per package sold, whatever it is made of.
 *
 * Filters live in the URL and nothing is filtered locally, so a filtered view
 * is shareable and the server keeps doing the paging. Status is multi-select
 * because the two queues an operator actually works — the requests and the
 * live trips — are each more than one state.
 *
 * The on-request queue is the reason this screen exists, so it is a chip of
 * its own rather than one option among five: those orders hold rooms and
 * seats that nobody else can sell until somebody answers.
 */

export function OrdersBrowser({
  data,
  total,
  page,
  totalPages,
  pendingTotal,
  basePath = "/admin/orders",
}: {
  data: OrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Every order awaiting an answer, not just the ones on this page. */
  pendingTotal: number;
  /** Where a reference links: the admin detail or the portal page. */
  basePath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const localePath = useLocalePath();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("search") ?? "");

  const apply = (changes: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      next.delete(key);
      if (Array.isArray(value)) for (const item of value) next.append(key, item);
      else if (value !== null && value !== "") next.set(key, value);
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

  const selected = params.getAll("status").filter((value): value is OrderStatus =>
    ORDER_STATUSES.includes(value as OrderStatus),
  );
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const toggle = (status: OrderStatus) =>
    apply({
      status: selected.includes(status)
        ? selected.filter((value) => value !== status)
        : [...selected, status],
    });

  // Margin is on the summary for staff and absent for everyone else, so the
  // column follows the data rather than a role flag the browser would have to
  // be told about.
  const showMargin = data.some((order) => typeof order.marginCents === "number");

  const columns: Column[] = [
    { label: "Reference" },
    { label: "Trip" },
    { label: "Buyer", hideBelow: "lg" },
    { label: "Travelling", hideBelow: "md" },
    { label: "Party", hideBelow: "xl" },
    { label: "Status" },
    ...(showMargin ? [{ label: "Margin", align: "end" as const, hideBelow: "xl" as const }] : []),
    { label: "Total", align: "end" },
  ];

  const field =
    "h-10 rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-ink outline-none focus:border-ink";
  const chip =
    "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[0.8125rem] font-medium whitespace-nowrap transition-colors";

  const now = new Date();

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
            placeholder="Reference, buyer name or email"
            aria-label="Search orders"
            className={cn(field, "w-full ps-9")}
          />
        </div>

        <label className="flex items-center gap-2 text-[0.8125rem] text-muted">
          Travelling
          <input
            type="date"
            value={from}
            onChange={(event) => apply({ from: event.target.value || null })}
            aria-label="Travelling on or after"
            className={field}
          />
          <span aria-hidden>–</span>
          <input
            type="date"
            value={to}
            onChange={(event) => apply({ to: event.target.value || null })}
            aria-label="Travelling on or before"
            className={field}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => toggle("PENDING_CONFIRMATION")}
          aria-pressed={selected.includes("PENDING_CONFIRMATION")}
          className={cn(
            chip,
            selected.includes("PENDING_CONFIRMATION")
              ? "border-warning bg-warning/15 text-warning-text"
              : "border-warning/40 text-warning-text hover:bg-warning/10",
          )}
        >
          <Clock size={14} aria-hidden />
          On request
          <span className="rounded-full bg-warning/25 px-1.5 text-[0.75rem] tabular-nums">
            {pendingTotal}
          </span>
        </button>

        <span className="mx-1 h-6 w-px bg-line" aria-hidden />

        <button
          type="button"
          onClick={() => apply({ status: null })}
          aria-pressed={selected.length === 0}
          className={cn(
            chip,
            selected.length === 0
              ? "border-brand bg-brand-soft text-brand-text"
              : "border-line text-body hover:border-subtle hover:text-ink",
          )}
        >
          All
        </button>

        {ORDER_STATUSES.filter((status) => status !== "PENDING_CONFIRMATION").map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => toggle(status)}
            aria-pressed={selected.includes(status)}
            className={cn(
              chip,
              selected.includes(status)
                ? "border-brand bg-brand-soft text-brand-text"
                : "border-line text-body hover:border-subtle hover:text-ink",
            )}
          >
            {orderStatusLabels[status]}
          </button>
        ))}
      </div>

      {/* One status selected is a queue with a meaning; three is a filter. */}
      {selected.length === 1 && (
        <p className="mt-3 text-[0.8125rem] text-muted">{orderStatusHints[selected[0]]}</p>
      )}

      <p className="mt-3 text-[0.8125rem] text-muted" aria-live="polite">
        {total === 0 ? "No orders match these filters." : `${total} order${total === 1 ? "" : "s"}`}
      </p>

      <div className={cn("mt-4 transition-opacity", pending && "opacity-60")}>
        {/* Desktop: a real table. Below lg the same rows render as cards. */}
        <div className="hidden rounded-sm border border-line bg-surface lg:block">
          <DataTable columns={columns} caption="Orders">
            {data.length === 0 ? (
              <EmptyRow colSpan={columns.length} message="Nothing to show." />
            ) : (
              data.map((order) => {
                const overdue = isRequestOverdue(order.requestDeadlineAt, now);

                return (
                  <Row key={order.reference} className={cn(overdue && "bg-error/5")}>
                    <Cell>
                      <Link
                        href={localePath(`${basePath}/${order.reference}`)}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {order.reference}
                      </Link>
                      {order.pendingCount > 0 && order.requestDeadlineAt && (
                        <span
                          className={cn(
                            "mt-0.5 flex items-center gap-1 text-[0.75rem]",
                            overdue ? "font-medium text-error-text" : "text-warning-text",
                          )}
                        >
                          {overdue ? (
                            <AlertTriangle size={11} aria-hidden />
                          ) : (
                            <Clock size={11} aria-hidden />
                          )}
                          {overdue ? "overdue " : "by "}
                          {formatInstant(order.requestDeadlineAt)}
                        </span>
                      )}
                    </Cell>
                    <Cell>
                      {order.package.name ?? "Built to order"}
                      <span className="block text-[0.75rem] text-muted">
                        {order.itemCount} {order.itemCount === 1 ? "part" : "parts"}
                      </span>
                    </Cell>
                    <Cell hideBelow="lg">
                      {order.leadName}
                      {order.partner && (
                        <span className="block text-[0.75rem] text-muted">{order.partner.name}</span>
                      )}
                    </Cell>
                    <Cell hideBelow="md">{formatOrderDates(order.startDate, order.endDate)}</Cell>
                    <Cell hideBelow="xl">
                      {formatOrderParty(order.adults, order.childAges, order.rooms)}
                    </Cell>
                    <Cell>
                      <OrderStatusBadge status={order.status} />
                      {/* Beside the status, never instead of it: the order is
                          booked, and it is the parts that are outstanding. */}
                      {order.pendingCount > 0 && (
                        <span className="ms-2 inline-flex items-center gap-1 text-[0.75rem] text-muted">
                          <Clock size={12} aria-hidden />
                          {order.pendingCount}
                        </span>
                      )}
                    </Cell>
                    {showMargin && (
                      <Cell align="end" hideBelow="xl" className="tabular-nums text-muted">
                        {typeof order.marginCents === "number"
                          ? formatMoney(order.marginCents, order.currency)
                          : "—"}
                      </Cell>
                    )}
                    <Cell align="end" className="tabular-nums">
                      {formatMoney(order.totalCents, order.currency)}
                    </Cell>
                  </Row>
                );
              })
            )}
          </DataTable>
        </div>

        <ul className="flex flex-col gap-3 lg:hidden">
          {data.length === 0 && (
            <li className="py-12 text-center text-[0.875rem] text-muted">Nothing to show.</li>
          )}
          {data.map((order) => {
            const overdue = isRequestOverdue(order.requestDeadlineAt, now);

            return (
              <li
                key={order.reference}
                className={cn(
                  "rounded-sm border border-line bg-surface p-4",
                  overdue && "border-error/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={localePath(`${basePath}/${order.reference}`)}
                    className="font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {order.reference}
                  </Link>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-2 text-[0.875rem] text-body">
                  {order.package.name ?? "Built to order"}
                </p>
                <p className="text-[0.8125rem] text-muted">{order.leadName}</p>
                <p className="mt-1 text-[0.8125rem] text-muted">
                  {formatOrderDates(order.startDate, order.endDate)}
                </p>
                {order.pendingCount > 0 && (
                  <p
                    className={cn(
                      "mt-2 flex items-center gap-1.5 text-[0.75rem]",
                      overdue ? "font-medium text-error-text" : "text-warning-text",
                    )}
                  >
                    {overdue ? (
                      <AlertTriangle size={12} aria-hidden />
                    ) : (
                      <Clock size={12} aria-hidden />
                    )}
                    {order.pendingCount} awaiting an answer
                    {order.requestDeadlineAt &&
                      ` · ${overdue ? "overdue " : "by "}${formatInstant(order.requestDeadlineAt)}`}
                  </p>
                )}
                <p className="mt-2 font-medium text-ink tabular-nums">
                  {formatMoney(order.totalCents, order.currency)}
                </p>
              </li>
            );
          })}
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
