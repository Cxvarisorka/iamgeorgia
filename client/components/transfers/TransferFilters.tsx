"use client";

import { FilterChip } from "@/components/ui/FilterChip";
import {
  featureFilters,
  passengerBands,
  ratingFilters,
  vehicleClasses,
  type PassengerBand,
} from "@/data/transfers";
import { useI18n } from "@/lib/i18n/provider";
import { formatPrice } from "@/lib/utils";
import type { TransferFeature, TransferKind, VehicleClass } from "@/types";

export interface TransferFilterState {
  vehicleClasses: VehicleClass[];
  passengerBands: PassengerBand[];
  kinds: TransferKind[];
  features: TransferFeature[];
  /** 0 means "any". */
  minRating: number;
  /** `null` means "any" — the ceiling depends on the route, so it cannot be a constant. */
  maxPrice: number | null;
}

export const defaultTransferFilters: TransferFilterState = {
  vehicleClasses: [],
  passengerBands: [],
  kinds: [],
  features: [],
  minRating: 0,
  maxPrice: null,
};

export function countActiveFilters(filters: TransferFilterState): number {
  return (
    filters.vehicleClasses.length +
    filters.passengerBands.length +
    filters.kinds.length +
    filters.features.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.maxPrice === null ? 0 : 1)
  );
}

interface TransferFiltersProps {
  value: TransferFilterState;
  onChange: (next: TransferFilterState) => void;
  /** Cheapest and dearest quote on this route — the slider's real range. */
  priceBounds: { min: number; max: number };
}

/** Presentational filter panel — rendered in the sidebar and the mobile dialog. */
export function TransferFilters({ value, onChange, priceBounds }: TransferFiltersProps) {
  const { t, intlLocale } = useI18n();

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

  const sliderMax = Math.max(priceBounds.max, priceBounds.min + 1);
  const current = value.maxPrice ?? sliderMax;

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="type-eyebrow text-muted">{t.transfers.filters.vehicleType}</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {vehicleClasses.map((vehicleClass) => (
            <FilterChip
              key={vehicleClass}
              selected={value.vehicleClasses.includes(vehicleClass)}
              onClick={() =>
                onChange({
                  ...value,
                  vehicleClasses: toggle(value.vehicleClasses, vehicleClass),
                })
              }
            >
              {t.transfers.vehicleClasses[vehicleClass]}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-eyebrow text-muted">{t.transfers.filters.passengerCapacity}</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {passengerBands.map((band) => (
            <FilterChip
              key={band.value}
              selected={value.passengerBands.includes(band.value)}
              onClick={() =>
                onChange({
                  ...value,
                  passengerBands: toggle(value.passengerBands, band.value),
                })
              }
            >
              {band.label}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-eyebrow text-muted">{t.transfers.filters.transferType}</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { value: "private" as const, label: t.transfers.kinds.private },
              { value: "shared" as const, label: t.transfers.kinds.shared },
            ]
          ).map((option) => (
            <FilterChip
              key={option.value}
              selected={value.kinds.includes(option.value)}
              onClick={() => onChange({ ...value, kinds: toggle(value.kinds, option.value) })}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-eyebrow text-muted">{t.transfers.filters.price}</legend>
        <label className="mt-4 block">
          <span className="type-body-sm flex items-baseline justify-between text-body">
            {t.transfers.filters.upTo}
            <span className="type-h4 tabular-nums">
              {value.maxPrice === null ? t.common.any : formatPrice(value.maxPrice, intlLocale)}
            </span>
          </span>
          <input
            type="range"
            min={priceBounds.min}
            max={sliderMax}
            step={5}
            value={current}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange({ ...value, maxPrice: next >= sliderMax ? null : next });
            }}
            className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-sand accent-brand"
            aria-label={t.a11y.maximumPrice}
          />
          <span className="type-caption mt-2 flex justify-between text-muted tabular-nums">
            <span>{formatPrice(priceBounds.min, intlLocale)}</span>
            <span>{formatPrice(sliderMax, intlLocale)}+</span>
          </span>
        </label>
      </fieldset>

      <fieldset>
        <legend className="type-eyebrow text-muted">{t.transfers.filters.features}</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {featureFilters.map((feature) => (
            <FilterChip
              key={feature}
              selected={value.features.includes(feature)}
              onClick={() => onChange({ ...value, features: toggle(value.features, feature) })}
            >
              {t.transfers.features[feature]}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-eyebrow text-muted">{t.transfers.filters.providerRating}</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            selected={value.minRating === 0}
            onClick={() => onChange({ ...value, minRating: 0 })}
          >
            {t.transfers.filters.anyRating}
          </FilterChip>
          {ratingFilters.map((option) => (
            <FilterChip
              key={option.value}
              selected={value.minRating === option.value}
              onClick={() => onChange({ ...value, minRating: option.value })}
            >
              {t.transfers.filters[option.key]}
            </FilterChip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
