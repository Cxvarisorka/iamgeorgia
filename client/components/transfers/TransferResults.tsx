"use client";

import { useSearchParams } from "next/navigation";
import { CarFront, MapPinned, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TransferCard } from "./TransferCard";
import {
  countActiveFilters,
  defaultTransferFilters,
  TransferFilters,
  type TransferFilterState,
} from "./TransferFilters";
import { TransferJourneyBar } from "./TransferJourneyBar";
import { TransferSearch } from "./TransferSearch";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { TransferCardSkeleton } from "@/components/ui/Skeleton";
import { passengerBands, transferSortOptions, type TransferSort } from "@/data/transfers";
import { fill } from "@/lib/i18n/dictionaries";
import { plural } from "@/lib/i18n/plural";
import { useI18n, useLocalePath } from "@/lib/i18n/provider";
import {
  isSearchable,
  parseTransferQuery,
  quotesForQuery,
  serializeTransferQuery,
  totalFor,
} from "@/lib/transfers/query";
import type { TransferQuote } from "@/types";

/** How long the mocked search "takes". Long enough to see the skeletons, short
 *  enough not to be theatre. A real build would swap this for the fetch. */
const MOCK_SEARCH_MS = 650;

export function TransferResults() {
  const searchParams = useSearchParams();
  const path = useLocalePath();
  const { t, locale } = useI18n();

  const query = useMemo(() => parseTransferQuery(searchParams), [searchParams]);
  const selectedSlug = searchParams.get("selected");
  /** Only the journey — filter and sort changes must not re-trigger the search. */
  const journeyKey = serializeTransferQuery(query);

  /**
   * Filters are stamped with the journey they were chosen against. A new
   * journey invalidates them — most obviously the price ceiling, which was set
   * against a different set of fares — so they fall back to the defaults
   * without an effect having to reach in and reset them.
   */
  const [filterState, setFilterState] = useState({
    journey: journeyKey,
    filters: defaultTransferFilters,
  });
  const filters =
    filterState.journey === journeyKey ? filterState.filters : defaultTransferFilters;
  const setFilters = (next: TransferFilterState) =>
    setFilterState({ journey: journeyKey, filters: next });

  const [sort, setSort] = useState<TransferSort>("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const searchable = isSearchable(query);

  /**
   * Stands in for the network round-trip a live build would make. Only the
   * journey triggers it — filtering and sorting happen on results already in
   * hand, and putting a spinner in front of a chip toggle would be theatre.
   */
  const [settledJourney, setSettledJourney] = useState<string | null>(null);
  const loading = searchable && settledJourney !== journeyKey;

  useEffect(() => {
    if (!searchable) return;
    const timer = setTimeout(() => setSettledJourney(journeyKey), MOCK_SEARCH_MS);
    return () => clearTimeout(timer);
  }, [journeyKey, searchable]);

  /** Everything the route can carry, before the traveller narrows it down. */
  const available = useMemo(() => quotesForQuery(query), [query]);

  const priceBounds = useMemo(() => {
    if (available.length === 0) return { min: 0, max: 100 };
    const totals = available.map((quote) => totalFor(quote, query));
    return { min: Math.floor(Math.min(...totals)), max: Math.ceil(Math.max(...totals)) };
  }, [available, query]);

  const results = useMemo(() => {
    const filtered = available.filter(({ offer }) => {
      if (filters.vehicleClasses.length && !filters.vehicleClasses.includes(offer.vehicleClass)) {
        return false;
      }
      if (filters.kinds.length && !filters.kinds.includes(offer.kind)) return false;
      if (filters.minRating > 0 && offer.provider.rating < filters.minRating) return false;
      if (
        filters.features.length &&
        !filters.features.every((feature) => offer.features.includes(feature))
      ) {
        return false;
      }
      if (filters.passengerBands.length) {
        const inBand = filters.passengerBands.some((value) => {
          const band = passengerBands.find((entry) => entry.value === value);
          return band ? offer.maxPassengers >= band.min && offer.maxPassengers <= band.max : false;
        });
        if (!inBand) return false;
      }
      return true;
    });

    const ceiling = filters.maxPrice;
    const priced =
      ceiling === null
        ? filtered
        : filtered.filter((quote) => totalFor(quote, query) <= ceiling);

    const sorted = [...priced];
    if (sort === "recommended") {
      sorted.sort((a, b) => a.offer.recommendedRank - b.offer.recommendedRank);
    }
    if (sort === "price-low") {
      sorted.sort((a, b) => totalFor(a, query) - totalFor(b, query));
    }
    if (sort === "rating") {
      sorted.sort(
        (a, b) =>
          b.offer.provider.rating - a.offer.provider.rating ||
          b.offer.provider.reviewCount - a.offer.provider.reviewCount,
      );
    }
    if (sort === "duration") sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
    return sorted;
  }, [available, filters, sort, query]);

  const activeFilterCount = countActiveFilters(filters);
  const reset = () => setFilters(defaultTransferFilters);

  const detailHref = (quote: TransferQuote) =>
    `${path(`/transfers/${quote.offer.slug}`)}?${serializeTransferQuery(query)}`;

  /* --- No journey to price yet ------------------------------------------- */
  if (!searchable) {
    return (
      <Container className="pt-10 pb-24 lg:pt-14 lg:pb-32">
        <EmptyState
          icon={MapPinned}
          title={t.transfers.results.noJourneyTitle}
          description={t.transfers.results.noJourneyBody}
        />
        <div className="mx-auto mt-10 max-w-4xl">
          <TransferSearch initialQuery={query} />
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container className="pt-8">
        <TransferJourneyBar query={query} />
      </Container>

      <Container className="pt-8 pb-24 lg:pt-10 lg:pb-32">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-28">
              <div className="flex items-baseline justify-between">
                <h2 className="type-h4">{t.actions.filters}</h2>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="type-caption text-brand-text underline-offset-4 hover:underline"
                  >
                    {t.actions.clearAll}
                  </button>
                )}
              </div>
              <div className="mt-6">
                <TransferFilters
                  value={filters}
                  onChange={setFilters}
                  priceBounds={priceBounds}
                />
              </div>
            </div>
          </aside>

          <div className="min-w-0 lg:col-span-9">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
              <p className="type-body-sm text-muted" aria-live="polite">
                {loading ? (
                  t.transfers.results.searching
                ) : (
                  <>
                    <span className="font-medium text-ink">
                      {plural(locale, results.length, t.units.transfer)}
                    </span>{" "}
                    {t.transfers.results.availableFor}
                  </>
                )}
              </p>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal size={15} aria-hidden />
                  {t.actions.filters}
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>

                <label className="flex items-center gap-2">
                  <span className="type-caption hidden text-muted sm:inline">
                    {t.actions.sortBy}
                  </span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as TransferSort)}
                    className="h-10 rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-body focus:border-ink focus:outline-none"
                  >
                    {transferSortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t.transfers.sort[option.key]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 flex flex-col gap-5">
                {Array.from({ length: 4 }, (_, index) => (
                  <TransferCardSkeleton key={index} />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="mt-6 flex flex-col gap-5">
                {results.map((quote) => (
                  <TransferCard
                    key={quote.offer.id}
                    quote={quote}
                    query={query}
                    href={detailHref(quote)}
                    selected={quote.offer.slug === selectedSlug}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  icon={CarFront}
                  title={t.transfers.results.emptyTitle}
                  description={
                    available.length === 0
                      ? t.transfers.results.emptyCapacity
                      : t.transfers.results.emptyFilters
                  }
                  onReset={activeFilterCount > 0 ? reset : undefined}
                  resetLabel={t.actions.clearFilters}
                  action={{
                    label: t.transfers.results.changeSearch,
                    href: path("/transfers"),
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </Container>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t.actions.filters}
        size="md"
      >
        <div className="px-6 pt-4 pb-6">
          <TransferFilters value={filters} onChange={setFilters} priceBounds={priceBounds} />
          <div className="mt-8 flex gap-3">
            <Button variant="outline" fullWidth onClick={reset}>
              {t.actions.clearAll}
            </Button>
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              {fill(t.transfers.results.show, {
                count: plural(locale, results.length, t.units.transfer),
              })}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
