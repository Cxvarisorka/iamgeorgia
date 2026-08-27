"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { defaultFilters, HotelFilters, type HotelFilterState } from "./HotelFilters";
import { HotelListItem } from "./HotelListItem";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { hotelSortOptions, type HotelSort } from "@/data/hotels";
import { fill } from "@/lib/i18n/dictionaries";
import { plural } from "@/lib/i18n/plural";
import { useI18n } from "@/lib/i18n/provider";
import type { UiDictionary } from "@/lib/i18n/ui/en";
import type { Hotel } from "@/types";

/** The sort values are kebab-case in the data and camelCase in the dictionary. */
const SORT_KEYS = {
  recommended: "recommended",
  "price-low": "priceLow",
  "price-high": "priceHigh",
  rating: "rating",
} as const satisfies Record<HotelSort, keyof UiDictionary["hotels"]["sort"]>;

interface HotelExplorerProps {
  hotels: Hotel[];
}

/**
 * Catalogue browsing: what exists, at indicative prices.
 *
 * Dates and destination are deliberately not here. They belong to the search
 * form above, which puts them in the URL and turns the page into a real dated
 * search — a second, cosmetic date picker beside a working one is worse than
 * none, because only one of them affects what is on screen.
 */
export function HotelExplorer({ hotels }: HotelExplorerProps) {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<HotelFilterState>(defaultFilters);
  const [sort, setSort] = useState<HotelSort>("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const filtered = hotels.filter((hotel) => {
      if (filters.propertyTypes.length && !filters.propertyTypes.includes(hotel.propertyType)) {
        return false;
      }
      if (filters.minScore && hotel.guestScore < filters.minScore) return false;
      if (filters.maxPrice < 1500 && hotel.priceFrom > filters.maxPrice) return false;
      if (
        filters.amenities.length &&
        !filters.amenities.every((amenity) => hotel.amenities.includes(amenity))
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sort === "price-low") sorted.sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === "price-high") sorted.sort((a, b) => b.priceFrom - a.priceFrom);
    if (sort === "rating") sorted.sort((a, b) => b.guestScore - a.guestScore);
    return sorted;
  }, [hotels, filters, sort]);

  const reset = () => setFilters(defaultFilters);

  const activeFilterCount =
    filters.propertyTypes.length +
    filters.amenities.length +
    (filters.minScore ? 1 : 0) +
    (filters.maxPrice < 400 ? 1 : 0);

  return (
    <>
      <Container className="pt-12 pb-24 lg:pt-16 lg:pb-32">
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
                <HotelFilters value={filters} onChange={setFilters} />
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
              <p className="type-body-sm text-muted">
                <span className="font-medium text-ink">
                  {plural(locale, results.length, t.units.property)}
                </span>
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
                    onChange={(event) => setSort(event.target.value as HotelSort)}
                    className="h-10 rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-body focus:border-ink focus:outline-none"
                  >
                    {hotelSortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t.hotels.sort[SORT_KEYS[option.value]]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="mt-6 flex flex-col gap-5">
                {results.map((hotel) => (
                  <HotelListItem key={hotel.id} hotel={hotel} />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  title={t.hotels.emptyTitle}
                  description={t.hotels.emptyBody}
                  onReset={reset}
                  action={{ label: t.actions.askUsToFindOne, href: "/contact" }}
                />
              </div>
            )}
          </div>
        </div>
      </Container>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t.actions.filters} size="md">
        <div className="px-6 pt-4 pb-6">
          <HotelFilters value={filters} onChange={setFilters} />
          <div className="mt-8 flex gap-3">
            <Button variant="outline" fullWidth onClick={reset}>
              {t.actions.clearAll}
            </Button>
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              {fill(t.hotels.showProperties, {
                count: plural(locale, results.length, t.units.property),
              })}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
