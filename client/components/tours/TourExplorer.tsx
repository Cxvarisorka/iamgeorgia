"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { TourCard } from "./TourCard";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { SearchField } from "@/components/ui/SearchField";
import { tourCategories, tourDurations } from "@/data/tours";
import { plural } from "@/lib/i18n/plural";
import { useI18n, useLocalePath } from "@/lib/i18n/provider";
import type { Tour, TourCategory } from "@/types";

interface TourExplorerProps {
  tours: Tour[];
  regions: string[];
}

type Sort = "recommended" | "price-low" | "price-high" | "duration";

/** Values and dictionary keys — the wording comes from `t.tours.sort`. */
const sortOptions = [
  { value: "recommended", key: "recommended" },
  { value: "price-low", key: "priceLow" },
  { value: "price-high", key: "priceHigh" },
  { value: "duration", key: "duration" },
] as const;

/** Matches a tour's day count against the duration filter buckets. */
function matchesDuration(days: number, bucket: string): boolean {
  if (bucket === "1") return days === 1;
  if (bucket === "2-3") return days >= 2 && days <= 3;
  if (bucket === "4-6") return days >= 4 && days <= 6;
  return days >= 7;
}

/**
 * Client-side filtering over the local mock data — enough to show how discovery
 * would feel, deliberately not a real search system.
 */
export function TourExplorer({ tours, regions }: TourExplorerProps) {
  const { t, locale } = useI18n();
  const path = useLocalePath();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TourCategory | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [region, setRegion] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("recommended");

  const hasFilters = query !== "" || category !== null || duration !== null || region !== "all";

  const results = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    const filtered = tours.filter((tour) => {
      if (category && tour.category !== category) return false;
      if (duration && !matchesDuration(tour.durationDays, duration)) return false;
      if (region !== "all" && tour.location !== region) return false;
      if (
        normalisedQuery &&
        !`${tour.title} ${tour.location} ${tour.summary}`.toLowerCase().includes(normalisedQuery)
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sort === "price-low") sorted.sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === "price-high") sorted.sort((a, b) => b.priceFrom - a.priceFrom);
    if (sort === "duration") sorted.sort((a, b) => a.durationDays - b.durationDays);
    return sorted;
  }, [tours, query, category, duration, region, sort]);

  const reset = () => {
    setQuery("");
    setCategory(null);
    setDuration(null);
    setRegion("all");
  };

  return (
    <section className="py-16 lg:py-20">
      <Container>
        <div className="border-b border-line pb-8">
          <SearchField
            value={query}
            onChange={setQuery}
            tone="dark"
            label={t.tours.searchLabel}
            placeholder={t.tours.searchPlaceholder}
            className="max-w-xl"
          />

          <div className="mt-8 flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-caption me-1 w-16 shrink-0 text-muted">
                {t.tours.filterType}
              </span>
              <FilterChip selected={category === null} onClick={() => setCategory(null)}>
                {t.common.all}
              </FilterChip>
              {tourCategories.map((item) => (
                <FilterChip
                  key={item}
                  selected={category === item}
                  onClick={() => setCategory(category === item ? null : item)}
                >
                  {t.tours.categories[item]}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="type-caption me-1 w-16 shrink-0 text-muted">
                {t.tours.filterLength}
              </span>
              <FilterChip selected={duration === null} onClick={() => setDuration(null)}>
                {t.common.any}
              </FilterChip>
              {tourDurations.map((item) => (
                <FilterChip
                  key={item}
                  selected={duration === item}
                  onClick={() => setDuration(duration === item ? null : item)}
                >
                  {t.tours.durations[item]}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <p className="type-body-sm text-muted">
            <span className="font-medium text-ink">
              {plural(locale, results.length, t.units.journey)}
            </span>
            {hasFilters && ` ${t.tours.matchingFilters}`}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="sr-only">{t.a11y.filterByRegion}</span>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="h-10 rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-body focus:border-ink focus:outline-none"
              >
                <option value="all">{t.tours.allRegions}</option>
                {regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-muted" aria-hidden />
              <span className="sr-only">{t.a11y.sortTours}</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="h-10 rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-body focus:border-ink focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t.tours.sort[option.key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t.tours.emptyTitle}
            description={t.tours.emptyBody}
            onReset={reset}
            action={{ label: t.actions.planCustomTrip, href: path("/contact") }}
          />
        )}
      </Container>
    </section>
  );
}
