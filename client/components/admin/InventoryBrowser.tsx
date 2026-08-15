"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Search, Star, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPanel } from "./AdminPage";
import { Cell, DataTable, EmptyRow, Row } from "./DataTable";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn, formatPrice } from "@/lib/utils";

/**
 * One row of catalogue inventory, flattened from a Hotel or a Tour so both
 * lists can share this screen. The pages map their own data into this shape
 * rather than the component learning about two entity types.
 */
export interface InventoryRow {
  id: string;
  slug: string;
  name: string;
  image: string;
  /** Region or city, shown under the name. */
  location: string;
  /** Property type, or tour category — whatever the list filters on. */
  group: string;
  /** Nightly rate or per-person price. */
  price: number;
  priceUnit: string;
  /** Out of 5 for tours, out of 10 for hotels. Normalised to 5 by the caller. */
  rating: number;
  reviewCount: number;
  /** Rooms for a hotel, itinerary days for a tour. */
  detailLabel: string;
  featured: boolean;
  /** Bookings currently in the ledger for this product. */
  bookings: number;
}

interface InventoryBrowserProps {
  rows: InventoryRow[];
  /** Distinct values for the group filter chips, in display order. */
  groups: string[];
  groupLegend: string;
  /** Where a row links to inside the admin panel. */
  basePath: string;
  emptyMessage: string;
  searchPlaceholder: string;
}

export function InventoryBrowser({
  rows,
  groups,
  groupLegend,
  basePath,
  emptyMessage,
  searchPlaceholder,
}: InventoryBrowserProps) {
  const path = useLocalePath();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (group !== "all" && row.group !== group) return false;
      if (featuredOnly && !row.featured) return false;
      if (needle) {
        const haystack = `${row.name} ${row.location} ${row.group}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, query, group, featuredOnly]);

  const activeFilters =
    (group !== "all" ? 1 : 0) + (featuredOnly ? 1 : 0) + (query.trim() ? 1 : 0);

  const chip = (selected: boolean) =>
    cn(
      "inline-flex h-8 items-center rounded-full border px-3 text-[0.75rem] font-medium whitespace-nowrap transition-colors",
      selected
        ? "border-brand bg-brand-soft text-brand-text"
        : "border-line bg-transparent text-body hover:border-subtle hover:text-ink",
    );

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
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-10 w-full rounded-sm border border-line bg-background/50 ps-9 pe-3 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={featuredOnly}
              onClick={() => setFeaturedOnly((current) => !current)}
              className={chip(featuredOnly)}
            >
              <Star
                size={13}
                className={cn("me-1.5", featuredOnly && "fill-current")}
                aria-hidden
              />
              Featured only
            </button>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setGroup("all");
                  setFeaturedOnly(false);
                }}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm px-3 text-[0.8125rem] font-medium text-brand-text transition-colors hover:bg-surface-soft"
              >
                <X size={14} aria-hidden />
                Clear
              </button>
            )}
          </div>
        </div>

        <fieldset className="mt-4 border-t border-line pt-4">
          <legend className="mb-2 text-[0.6875rem] font-semibold tracking-[0.1em] text-muted uppercase">
            {groupLegend}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={group === "all"}
              onClick={() => setGroup("all")}
              className={chip(group === "all")}
            >
              All
            </button>
            {groups.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={group === value}
                onClick={() => setGroup(value)}
                className={chip(group === value)}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <p className="mt-4 text-[0.8125rem] text-muted" aria-live="polite">
        <span className="font-medium text-ink">{results.length}</span>
        {results.length === 1 ? " listing" : " listings"}
        {activeFilters > 0 ? " match your filters" : " published"}
      </p>

      <AdminPanel className="mt-3 hidden lg:block" bodyClassName="p-0">
        <DataTable
          caption="Catalogue listings"
          columns={[
            { label: "Listing" },
            { label: groupLegend },
            { label: "Detail", hideBelow: "xl" },
            { label: "Rating" },
            { label: "Bookings", align: "end" },
            { label: "Price", align: "end" },
            { label: "" },
          ]}
        >
          {results.length === 0 ? (
            <EmptyRow colSpan={7} message={emptyMessage} />
          ) : (
            results.map((row) => (
              <Row key={row.id}>
                <Cell>
                  <span className="flex items-center gap-3">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-sm bg-line">
                      <Image
                        src={row.image}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={path(`${basePath}/${row.slug}`)}
                        className="block max-w-56 truncate font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <span className="block truncate text-[0.75rem] text-muted">
                        {row.location}
                      </span>
                    </span>
                    {row.featured && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-medium text-brand-text">
                        <Star size={10} className="fill-current" aria-hidden />
                        Featured
                      </span>
                    )}
                  </span>
                </Cell>
                <Cell>{row.group}</Cell>
                <Cell hideBelow="xl" className="text-[0.8125rem] text-muted">
                  {row.detailLabel}
                </Cell>
                <Cell>
                  <span className="inline-flex items-center gap-1.5">
                    <Star size={13} className="fill-accent-gold text-accent-gold" aria-hidden />
                    <span className="font-medium text-ink tabular-nums">
                      {row.rating.toFixed(1)}
                    </span>
                    <span className="text-[0.75rem] text-subtle tabular-nums">
                      ({row.reviewCount})
                    </span>
                  </span>
                </Cell>
                <Cell align="end" className="tabular-nums">
                  {row.bookings}
                </Cell>
                <Cell align="end">
                  <span className="block font-semibold text-ink tabular-nums">
                    {formatPrice(row.price)}
                  </span>
                  <span className="block text-[0.75rem] text-subtle">{row.priceUnit}</span>
                </Cell>
                <Cell align="end">
                  <Link
                    href={path(`${basePath}/${row.slug}`)}
                    aria-label={`Edit ${row.name}`}
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:hidden">
        {results.length === 0 ? (
          <p className="rounded-sm border border-dashed border-line bg-surface-soft/40 px-5 py-12 text-center text-[0.875rem] text-muted sm:col-span-2">
            {emptyMessage}
          </p>
        ) : (
          results.map((row) => (
            <Link
              key={row.id}
              href={path(`${basePath}/${row.slug}`)}
              className="flex gap-3 rounded-sm border border-line bg-surface p-3 transition-colors hover:border-subtle"
            >
              <span className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-line">
                <Image src={row.image} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-medium text-ink">
                  {row.name}
                </span>
                <span className="block truncate text-[0.8125rem] text-muted">
                  {row.location}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-subtle">
                  <span className="font-medium text-ink tabular-nums">
                    {formatPrice(row.price)}
                  </span>
                  <span>{row.group}</span>
                  <span className="inline-flex items-center gap-1">
                    <Star size={11} className="fill-accent-gold text-accent-gold" aria-hidden />
                    {row.rating.toFixed(1)}
                  </span>
                </span>
              </span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
