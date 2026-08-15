"use client";

import Link from "next/link";
import { ChevronRight, FileWarning, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPanel } from "./AdminPage";
import { Cell, DataTable, EmptyRow, Row } from "./DataTable";
import { PartnerStatusBadge } from "./StatusBadge";
import { partnerKindLabels, partnerStatusLabels } from "@/data/admin/partners";
import { formatAdminDate, formatCompactMoney } from "@/lib/admin/metrics";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { Partner, PartnerKind, PartnerStatus } from "@/types";

const statusFilters: (PartnerStatus | "all")[] = [
  "all",
  "pending",
  "in-review",
  "active",
  "suspended",
  "rejected",
];

const kindFilters: (PartnerKind | "all")[] = [
  "all",
  "hotel",
  "tour-operator",
  "transport",
  "experience",
];

/**
 * The partner register.
 *
 * Defaults to every partner, but the review queue is one click away and the
 * dashboard links straight into it — the applications are the only rows that
 * carry a deadline, so they get a shortcut rather than being buried in a
 * status dropdown.
 */
export function PartnersBrowser({ partners }: { partners: Partner[] }) {
  const path = useLocalePath();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PartnerStatus | "all">("all");
  const [kind, setKind] = useState<PartnerKind | "all">("all");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return partners.filter((partner) => {
      if (status !== "all" && partner.status !== status) return false;
      if (kind !== "all" && partner.kind !== kind) return false;
      if (needle) {
        const haystack =
          `${partner.name} ${partner.legalName} ${partner.contactName} ${partner.email} ${partner.city}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [partners, query, status, kind]);

  const activeFilters =
    (status !== "all" ? 1 : 0) + (kind !== "all" ? 1 : 0) + (query.trim() ? 1 : 0);

  const chip = (selected: boolean) =>
    cn(
      "inline-flex h-8 items-center rounded-full border px-3 text-[0.75rem] font-medium whitespace-nowrap transition-colors",
      selected
        ? "border-brand bg-brand-soft text-brand-text"
        : "border-line bg-transparent text-body hover:border-subtle hover:text-ink",
    );

  const missingDocs = (partner: Partner) =>
    partner.documents.filter((doc) => !doc.received).length;

  return (
    <>
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
              placeholder="Trading name, contact, email or city"
              aria-label="Search partners"
              className="h-10 w-full rounded-sm border border-line bg-background/50 ps-9 pe-3 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setKind("all");
              }}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm px-3 text-[0.8125rem] font-medium text-brand-text transition-colors hover:bg-surface-soft"
            >
              <X size={14} aria-hidden />
              Clear filters
            </button>
          )}
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
                  {value === "all" ? "All" : partnerStatusLabels[value]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="mb-2 text-[0.6875rem] font-semibold tracking-[0.1em] text-muted uppercase">
              Type
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
                  {value === "all" ? "All" : partnerKindLabels[value]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <p className="mt-4 text-[0.8125rem] text-muted" aria-live="polite">
        <span className="font-medium text-ink">{results.length}</span>
        {results.length === 1 ? " partner" : " partners"}
        {activeFilters > 0 ? " match your filters" : " on the register"}
      </p>

      <AdminPanel className="mt-3 hidden lg:block" bodyClassName="p-0">
        <DataTable
          caption="Registered partners and pending applications"
          columns={[
            { label: "Partner" },
            { label: "Type" },
            { label: "Status" },
            { label: "Paperwork", hideBelow: "xl" },
            { label: "Listings", align: "end" },
            { label: "Revenue", align: "end" },
            { label: "Applied", hideBelow: "xl" },
            { label: "" },
          ]}
        >
          {results.length === 0 ? (
            <EmptyRow
              colSpan={8}
              message="No partners match those filters. Clear them to see the whole register."
            />
          ) : (
            results.map((partner) => {
              const missing = missingDocs(partner);
              return (
                <Row key={partner.id}>
                  <Cell>
                    <Link
                      href={path(`/admin/partners/${partner.id}`)}
                      className="block max-w-56 truncate font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {partner.name}
                    </Link>
                    <span className="block truncate text-[0.75rem] text-muted">
                      {partner.contactName} · {partner.city}
                    </span>
                  </Cell>
                  <Cell>{partnerKindLabels[partner.kind]}</Cell>
                  <Cell>
                    <PartnerStatusBadge status={partner.status} />
                  </Cell>
                  <Cell hideBelow="xl">
                    {missing === 0 ? (
                      <span className="text-[0.8125rem] text-success">Complete</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-warning-text">
                        <FileWarning size={13} aria-hidden />
                        {missing} outstanding
                      </span>
                    )}
                  </Cell>
                  <Cell align="end" className="tabular-nums">
                    {partner.listings}
                  </Cell>
                  <Cell align="end" className="font-medium text-ink tabular-nums">
                    {partner.revenue > 0 ? formatCompactMoney(partner.revenue) : "—"}
                  </Cell>
                  <Cell hideBelow="xl" className="whitespace-nowrap text-[0.8125rem]">
                    {formatAdminDate(partner.appliedOn)}
                  </Cell>
                  <Cell align="end">
                    <Link
                      href={path(`/admin/partners/${partner.id}`)}
                      aria-label={`Open ${partner.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-sm text-subtle transition-colors hover:bg-surface-soft hover:text-ink"
                    >
                      <ChevronRight size={16} className="rtl:-scale-x-100" aria-hidden />
                    </Link>
                  </Cell>
                </Row>
              );
            })
          )}
        </DataTable>
      </AdminPanel>

      <div className="mt-3 flex flex-col gap-3 lg:hidden">
        {results.length === 0 ? (
          <p className="rounded-sm border border-dashed border-line bg-surface-soft/40 px-5 py-12 text-center text-[0.875rem] text-muted">
            No partners match those filters.
          </p>
        ) : (
          results.map((partner) => (
            <Link
              key={partner.id}
              href={path(`/admin/partners/${partner.id}`)}
              className="rounded-sm border border-line bg-surface p-4 transition-colors hover:border-subtle"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-medium text-ink">
                    {partner.name}
                  </p>
                  <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
                    {partnerKindLabels[partner.kind]} · {partner.city}
                  </p>
                </div>
                <PartnerStatusBadge status={partner.status} className="shrink-0" />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[0.75rem] text-subtle">
                <span>{partner.listings} listings</span>
                <span>
                  {partner.revenue > 0 ? formatCompactMoney(partner.revenue) : "No revenue yet"}
                </span>
                {missingDocs(partner) > 0 && (
                  <span className="inline-flex items-center gap-1 text-warning-text">
                    <FileWarning size={12} aria-hidden />
                    {missingDocs(partner)} documents outstanding
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
