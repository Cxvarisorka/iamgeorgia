"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { defaultFilters, HotelFilters, type HotelFilterState } from "./HotelFilters";
import { HotelListItem } from "./HotelListItem";
import { HotelSearchPanel, type StayQuery } from "./HotelSearchPanel";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { hotelSortOptions, type HotelSort } from "@/data/hotels";
import type { Hotel } from "@/types";
import { pluralize } from "@/lib/utils";

interface HotelExplorerProps {
  hotels: Hotel[];
  destinations: { slug: string; name: string }[];
}

export function HotelExplorer({ hotels, destinations }: HotelExplorerProps) {
  const [stay, setStay] = useState<StayQuery>({
    destination: "all",
    checkIn: "",
    checkOut: "",
    guests: 2,
    rooms: 1,
  });
  const [filters, setFilters] = useState<HotelFilterState>(defaultFilters);
  const [sort, setSort] = useState<HotelSort>("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const filtered = hotels.filter((hotel) => {
      if (stay.destination !== "all" && hotel.destinationSlug !== stay.destination) return false;
      if (filters.propertyTypes.length && !filters.propertyTypes.includes(hotel.propertyType)) {
        return false;
      }
      if (filters.minScore && hotel.guestScore < filters.minScore) return false;
      if (filters.maxPrice < 400 && hotel.priceFrom > filters.maxPrice) return false;
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
  }, [hotels, stay.destination, filters, sort]);

  const reset = () => {
    setFilters(defaultFilters);
    setStay((current) => ({ ...current, destination: "all" }));
  };

  const activeFilterCount =
    filters.propertyTypes.length +
    filters.amenities.length +
    (filters.minScore ? 1 : 0) +
    (filters.maxPrice < 400 ? 1 : 0);

  return (
    <>
      <Container className="relative z-20 -mt-10 lg:-mt-14">
        <HotelSearchPanel value={stay} onChange={setStay} destinations={destinations} />
      </Container>

      <Container className="pt-12 pb-24 lg:pt-16 lg:pb-32">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-28">
              <div className="flex items-baseline justify-between">
                <h2 className="type-h4">Filters</h2>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="type-caption text-brand-text underline-offset-4 hover:underline"
                  >
                    Clear all
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
                <span className="font-medium text-ink">{pluralize(results.length, "property")}</span>
                {stay.destination !== "all" &&
                  ` in ${destinations.find((d) => d.slug === stay.destination)?.name}`}
              </p>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal size={15} aria-hidden />
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>

                <label className="flex items-center gap-2">
                  <span className="type-caption hidden text-muted sm:inline">Sort by</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as HotelSort)}
                    className="h-10 rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-body focus:border-ink focus:outline-none"
                  >
                    {hotelSortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="mt-6 flex flex-col gap-5">
                {results.map((hotel, index) => (
                  <HotelListItem key={hotel.id} hotel={hotel} priority={index < 2} />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  title="No properties match those filters"
                  description="Try widening the budget or removing a facility — we only list nine properties, and every one of them is worth a look."
                  onReset={reset}
                  action={{ label: "Ask us to find one", href: "/contact" }}
                />
              </div>
            )}
          </div>
        </div>
      </Container>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="md"
      >
        <div className="px-6 pt-4 pb-6">
          <HotelFilters value={filters} onChange={setFilters} />
          <div className="mt-8 flex gap-3">
            <Button variant="outline" fullWidth onClick={reset}>
              Clear all
            </Button>
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              Show {pluralize(results.length, "property", "properties")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
