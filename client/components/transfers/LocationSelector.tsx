"use client";

import { Building2, Landmark, MapPin, Plane, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import {
  getTransferLocation,
  locationGroupOrder,
  searchTransferLocations,
} from "@/data/transferLocations";
import { fill } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { TransferLocation, TransferLocationType } from "@/types";

const typeIcons: Record<TransferLocationType, typeof Plane> = {
  airport: Plane,
  city: MapPin,
  hotel: Building2,
  landmark: Landmark,
};

interface LocationSelectorProps {
  id: string;
  label: string;
  value: string;
  onChange: (locationId: string) => void;
  placeholder: string;
  /** The opposite end of the journey — never offered as its own destination. */
  excludeId?: string;
  error?: string;
  className?: string;
}

/**
 * Pick-up / drop-off chooser.
 *
 * A dialog rather than a `<select>`: the list is grouped, searchable and each
 * row carries a second line of context, none of which a native select can do.
 * It runs through the shared `Modal`, so focus trapping, Escape, scroll lock
 * and focus return are the same here as everywhere else in the product — and
 * on a phone it lands as a bottom sheet, which is where a thumb already is.
 */
export function LocationSelector({
  id,
  label,
  value,
  onChange,
  placeholder,
  excludeId,
  error,
  className,
}: LocationSelectorProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = getTransferLocation(value, locale);

  useEffect(() => {
    if (!open) return;
    // The dialog moves focus to its first control; the search field is the one
    // that should have it, so claim it once the panel has mounted.
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  /** Opening always starts from an empty search rather than the last one. */
  const openPicker = () => {
    setQuery("");
    setOpen(true);
  };

  const groups = useMemo(() => {
    const matches = searchTransferLocations(query, locale).filter(
      (location) => location.id !== excludeId,
    );
    return locationGroupOrder
      .map((type) => ({
        type,
        label: t.transfers.locationPicker.groups[type],
        items: matches.filter((location) => location.type === type),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, excludeId, locale, t]);

  const select = (location: TransferLocation) => {
    onChange(location.id);
    setOpen(false);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="type-caption flex items-center gap-1.5 text-muted">
        <MapPin size={13} aria-hidden />
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "mt-1 min-h-6 w-full truncate text-start text-sm transition-colors",
          selected ? "text-ink" : "text-subtle",
        )}
      >
        {selected ? selected.name : placeholder}
      </button>

      {selected && (
        <span className="type-caption truncate text-subtle">{selected.region}</span>
      )}

      {error && (
        <p id={`${id}-error`} role="alert" className="type-caption mt-1 text-error-text">
          {error}
        </p>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={label} size="md">
        <div className="px-6 pb-6">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-subtle"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.transfers.locationPicker.searchPlaceholder}
              aria-label={fill(t.transfers.locationPicker.searchLabel, {
                field: label.toLowerCase(),
              })}
              className="h-12 w-full rounded-sm border border-line bg-surface ps-10 pe-3.5 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          {groups.length > 0 ? (
            <div className="mt-5 space-y-6">
              {groups.map((group) => (
                <section key={group.type}>
                  <h3 className="type-eyebrow text-muted">{group.label}</h3>
                  <ul className="mt-2.5 -mx-2">
                    {group.items.map((location) => {
                      const Icon = typeIcons[location.type];
                      const isSelected = location.id === value;
                      return (
                        <li key={location.id}>
                          <button
                            type="button"
                            onClick={() => select(location)}
                            aria-pressed={isSelected}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-sm px-2 py-2.5 text-start transition-colors",
                              isSelected ? "bg-brand-soft" : "hover:bg-surface-soft",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-full",
                                isSelected
                                  ? "bg-brand text-white"
                                  : "bg-surface-soft text-brand-text",
                              )}
                            >
                              <Icon size={16} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="type-body-sm block truncate font-medium text-ink">
                                {location.name}
                              </span>
                              <span className="type-caption block truncate text-muted">
                                {location.region}
                              </span>
                            </span>
                            {location.code && (
                              <span className="type-caption shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-medium text-muted">
                                {location.code}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="type-body-sm mt-8 text-center text-muted">
              {fill(t.transfers.locationPicker.noResults, { query })}
            </p>
          )}

          <p className="type-caption mt-6 border-t border-line pt-4 text-subtle">
            {t.transfers.locationPicker.note}
          </p>
        </div>
      </Modal>
    </div>
  );
}
