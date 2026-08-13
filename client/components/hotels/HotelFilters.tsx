"use client";

import { FilterChip } from "@/components/ui/FilterChip";
import { amenityFilters, amenityLabels } from "@/data/amenities";
import { propertyTypes } from "@/data/hotels";
import type { AmenityId, PropertyType } from "@/types";
import { formatPrice } from "@/lib/utils";

export interface HotelFilterState {
  propertyTypes: PropertyType[];
  amenities: AmenityId[];
  maxPrice: number;
  minScore: number;
}

export const defaultFilters: HotelFilterState = {
  propertyTypes: [],
  amenities: [],
  maxPrice: 400,
  minScore: 0,
};

const scoreOptions = [
  { value: 0, label: "Any score" },
  { value: 8, label: "Very good · 8+" },
  { value: 9, label: "Exceptional · 9+" },
];

interface HotelFiltersProps {
  value: HotelFilterState;
  onChange: (next: HotelFilterState) => void;
}

/** Presentational filter panel — rendered in the sidebar and the mobile dialog. */
export function HotelFilters({ value, onChange }: HotelFiltersProps) {
  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="type-eyebrow text-muted">Property type</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {propertyTypes.map((type) => (
            <FilterChip
              key={type}
              selected={value.propertyTypes.includes(type)}
              onClick={() => onChange({ ...value, propertyTypes: toggle(value.propertyTypes, type) })}
            >
              {type}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-eyebrow text-muted">Guest score</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {scoreOptions.map((option) => (
            <FilterChip
              key={option.value}
              selected={value.minScore === option.value}
              onClick={() => onChange({ ...value, minScore: option.value })}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-eyebrow text-muted">Nightly budget</legend>
        <label className="mt-4 block">
          <span className="type-body-sm flex items-baseline justify-between text-body">
            Up to
            <span className="type-h4 tabular-nums">
              {value.maxPrice >= 400 ? "Any" : formatPrice(value.maxPrice)}
            </span>
          </span>
          <input
            type="range"
            min={60}
            max={400}
            step={10}
            value={value.maxPrice}
            onChange={(event) => onChange({ ...value, maxPrice: Number(event.target.value) })}
            className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-sand accent-brand"
            aria-label="Maximum nightly price"
          />
          <span className="type-caption mt-2 flex justify-between text-muted tabular-nums">
            <span>{formatPrice(60)}</span>
            <span>{formatPrice(400)}+</span>
          </span>
        </label>
      </fieldset>

      <fieldset>
        <legend className="type-eyebrow text-muted">Facilities</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {amenityFilters.map((amenity) => (
            <FilterChip
              key={amenity}
              selected={value.amenities.includes(amenity)}
              onClick={() => onChange({ ...value, amenities: toggle(value.amenities, amenity) })}
            >
              {amenityLabels[amenity]}
            </FilterChip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
