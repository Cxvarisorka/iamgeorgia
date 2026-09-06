"use client";

import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Field, hintClass } from "./FormControls";
import { describeError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Choosing a product, rather than typing its id.
 *
 * Every screen that points one record at another was asking for a cuid in a
 * monospace box. That is fine for whoever seeded the database and unusable for
 * anybody else: an operator building a package has no way to know which of
 * four Tbilisi properties `cm3x…` is, and a typo is not refused until save.
 *
 * Two shapes, because the lists are two different sizes:
 *
 * - `EntityPicker` searches an open-ended catalogue — hotels, tours, services,
 *   routes, points — server-side, as the operator types.
 * - `OptionChecklist` toggles a bounded list that hangs off something already
 *   chosen: the room types of one hotel, the options of one tour. Those are
 *   small enough to load whole, so they render as the same chips the board
 *   codes and vehicle classes already use.
 *
 * Both keep an id they cannot resolve rather than dropping it. A room type
 * that was archived after the package was built is still a real constraint on
 * that slot, and silently discarding it on the next save would change what the
 * package sells without anybody asking for it.
 */

export interface PickerOption {
  id: string;
  label: string;
  /** A second line under the label: a region, a destination, a parent room. */
  meta?: string | null;
  /** A short code at the end of the row: an IATA code, a category, a basis. */
  badge?: string | null;
}

const SEARCH_DEBOUNCE_MS = 200;

const rowBase =
  "flex w-full items-center gap-3 px-3 py-2 text-start text-[0.8125rem] transition-colors";

/** The trigger, styled to sit in a row with `TextInput` and `SelectInput`. */
const triggerBase =
  "flex h-10 w-full items-center gap-2 rounded-sm border bg-surface px-3 text-start text-[0.875rem] transition-colors focus:outline-none disabled:opacity-60";

interface EntityPickerProps {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  /** The chosen id, or `""` for none. */
  value: string;
  /**
   * What that id is called, where the caller already knows — the package
   * detail names the hotel it points at, so re-opening the builder shows the
   * name without a round trip.
   */
  valueLabel?: string | null;
  onChange: (choice: PickerOption | null) => void;
  /** Matches for what has been typed. Called with `""` when the list opens. */
  search: (term: string) => Promise<PickerOption[]>;
  placeholder?: string;
  /** The clear row's wording. Omit it and the choice cannot be undone. */
  clearLabel?: string;
  /** Why this cannot be chosen yet — e.g. no hotel picked. Disables it. */
  disabledReason?: string | null;
  id?: string;
}

export function EntityPicker({
  label,
  hint,
  error,
  className,
  value,
  valueLabel,
  onChange,
  search,
  placeholder = "Search…",
  clearLabel,
  disabledReason,
  id,
}: EntityPickerProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listId = `${controlId}-list`;

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  /**
   * The row that was clicked, kept so the trigger can name it.
   *
   * There is no local catalogue to resolve an id against, and asking the
   * server on every render to redraw one line of text would be absurd.
   */
  const [chosen, setChosen] = useState<PickerOption | null>(null);
  const selectedLabel =
    (chosen?.id === value ? chosen.label : null) ?? (value ? (valueLabel ?? null) : null);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setTerm("");
    setActive(0);
  }, []);

  // Dismissed by a click anywhere else on the page. `pointerdown` rather than
  // `click` so the panel is gone before the thing underneath reacts.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  /**
   * Debounced, and guarded against replies landing out of order.
   *
   * Two keystrokes make two requests and the second can answer first, which
   * would leave the list showing matches for a prefix of what was typed. The
   * `stale` flag is what prevents that; the debounce only saves requests.
   */
  useEffect(() => {
    if (!open) return;

    let stale = false;
    const wait = term.trim().length === 0 ? 0 : SEARCH_DEBOUNCE_MS;

    const timer = setTimeout(async () => {
      setLoading(true);
      setFailure(null);

      try {
        const found = await search(term.trim());
        if (stale) return;
        setOptions(found);
        setActive(0);
      } catch (caught) {
        if (stale) return;
        setOptions([]);
        setFailure(describeError(caught));
      } finally {
        if (!stale) setLoading(false);
      }
    }, wait);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // `search` is a closure the caller rebuilds every render; keying the effect
    // on it would re-request on every keystroke of an unrelated field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, term]);

  const select = (option: PickerOption) => {
    setChosen(option);
    onChange(option);
    close();
  };

  const clear = () => {
    setChosen(null);
    onChange(null);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length === 0) return;
      setActive((current) => {
        const next = current + (event.key === "ArrowDown" ? 1 : -1);
        return (next + options.length) % options.length;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = options[active];
      if (option) select(option);
    }
  };

  const disabled = Boolean(disabledReason);

  return (
    <Field
      label={label}
      hint={disabledReason ?? hint}
      error={error}
      className={cn("relative", className)}
      htmlFor={controlId}
    >
      <div ref={rootRef}>
        <button
          id={controlId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onClick={() => (open ? close() : setOpen(true))}
          className={cn(
            triggerBase,
            error ? "border-error" : open ? "border-ink" : "border-line hover:border-ink",
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {value ? (
              <span className="text-ink">
                {selectedLabel ?? <span className="font-mono text-[0.8125rem]">{value}</span>}
              </span>
            ) : (
              <span className="text-subtle">{placeholder}</span>
            )}
          </span>
          <ChevronDown size={14} className="shrink-0 text-muted" aria-hidden />
        </button>

        {open && (
          <div
            className="absolute z-30 mt-1 w-full min-w-64 overflow-hidden rounded-sm border border-line bg-surface shadow-lg"
            onKeyDown={onKeyDown}
          >
            <div className="relative border-b border-line">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-subtle"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={placeholder}
                aria-label={`Search ${label.toLowerCase()}`}
                aria-autocomplete="list"
                aria-controls={listId}
                className="h-10 w-full bg-transparent ps-9 pe-3 text-[0.875rem] text-ink focus:outline-none"
              />
              {loading && (
                <Loader2
                  size={14}
                  className="absolute top-1/2 end-3 -translate-y-1/2 animate-spin text-muted"
                  aria-hidden
                />
              )}
            </div>

            <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {clearLabel && value && (
                <li>
                  <button
                    type="button"
                    onClick={clear}
                    className={cn(rowBase, "text-muted hover:bg-surface-soft hover:text-ink")}
                  >
                    <X size={14} className="shrink-0" aria-hidden />
                    {clearLabel}
                  </button>
                </li>
              )}

              {options.map((option, index) => {
                const isSelected = option.id === value;

                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onPointerEnter={() => setActive(index)}
                      onClick={() => select(option)}
                      className={cn(
                        rowBase,
                        index === active ? "bg-surface-soft" : "bg-transparent",
                        isSelected ? "text-brand-text" : "text-ink",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{option.label}</span>
                        {option.meta && (
                          <span className="block truncate text-[0.75rem] text-muted">
                            {option.meta}
                          </span>
                        )}
                      </span>
                      {option.badge && (
                        <span className="shrink-0 rounded-xs border border-line px-1.5 py-px text-[0.6875rem] font-medium text-muted">
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} className="shrink-0" aria-hidden />}
                    </button>
                  </li>
                );
              })}

              {options.length === 0 && (
                <li
                  className="px-3 py-4 text-center text-[0.75rem] text-muted"
                  aria-live="polite"
                  role="status"
                >
                  {loading
                    ? "Searching…"
                    : (failure ??
                      (term.trim() ? `Nothing matches “${term.trim()}”.` : "Nothing to choose."))}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Field>
  );
}

interface OptionChecklistProps {
  label: string;
  hint?: React.ReactNode;
  className?: string;
  value: string[];
  onChange: (next: string[]) => void;
  /**
   * Loads the whole list. Null while the thing it hangs off is unchosen —
   * there is no such thing as "the room types" without a hotel.
   */
  load: (() => Promise<PickerOption[]>) | null;
  /** The parent id. Changing it reloads, and is how the effect is keyed. */
  dependency: string;
  /** Shown in place of the list when `load` is null. */
  disabledReason: string;
  /** Shown when the parent exists but has nothing to offer. */
  emptyLabel: string;
}

/**
 * A bounded list, toggled as chips.
 *
 * Loaded once per parent rather than searched: a hotel's room types and a
 * tour's options are a handful each, and a search box over five rows is
 * ceremony. Ids the list does not explain — an archived room type, a plan
 * retired since — still render, marked, and stay in the value.
 */
export function OptionChecklist({
  label,
  hint,
  className,
  value,
  onChange,
  load,
  dependency,
  disabledReason,
  emptyLabel,
}: OptionChecklistProps) {
  /**
   * The last answer, tagged with the parent it answered for.
   *
   * One piece of state rather than three, and written only from the promise:
   * "still loading" is then `the tag does not match the parent we are showing`
   * rather than a flag an effect has to set on the way in. A reply for the
   * hotel that was chosen a moment ago cannot be shown under the new one.
   */
  const [loaded, setLoaded] = useState<{
    key: string;
    options: PickerOption[];
    failure: string | null;
  } | null>(null);

  useEffect(() => {
    if (!load) return;

    let stale = false;

    load()
      .then((found) => {
        if (!stale) setLoaded({ key: dependency, options: found, failure: null });
      })
      .catch((caught: unknown) => {
        if (!stale) setLoaded({ key: dependency, options: [], failure: describeError(caught) });
      });

    return () => {
      stale = true;
    };
    // Keyed on the parent id: `load` is a fresh closure on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency, Boolean(load)]);

  const answer = loaded?.key === dependency ? loaded : null;
  const options = answer?.options ?? [];
  const failure = answer?.failure ?? null;
  const loading = Boolean(load) && !answer;

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((entry) => entry !== id) : [...value, id]);

  /** Chosen ids the loaded list does not account for, kept and marked. */
  const unresolved = value.filter((id) => !options.some((option) => option.id === id));

  return (
    <fieldset className={className}>
      <legend className="block text-[0.75rem] font-semibold text-muted">{label}</legend>

      {!load ? (
        <p className="mt-1.5 text-[0.75rem] text-subtle">{disabledReason}</p>
      ) : loading ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-subtle">
          <Loader2 size={12} className="animate-spin" aria-hidden />
          Loading…
        </p>
      ) : failure ? (
        <p role="alert" className="mt-1.5 text-[0.75rem] text-error-text">
          {failure}
        </p>
      ) : options.length === 0 && unresolved.length === 0 ? (
        <p className="mt-1.5 text-[0.75rem] text-subtle">{emptyLabel}</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {options.map((option) => {
            const on = value.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={on}
                title={option.meta ?? undefined}
                onClick={() => toggle(option.id)}
                className={cn(
                  "h-8 rounded-sm border px-2.5 text-[0.75rem] font-medium transition-colors",
                  on
                    ? "border-brand bg-brand-soft text-brand-text"
                    : "border-line text-muted hover:border-ink hover:text-ink",
                )}
              >
                {option.label}
                {option.meta && <span className="ms-1.5 font-normal opacity-70">{option.meta}</span>}
              </button>
            );
          })}

          {unresolved.map((id) => (
            <button
              key={id}
              type="button"
              title="No longer in the catalogue. Kept until you remove it."
              onClick={() => toggle(id)}
              className="h-8 rounded-sm border border-error/50 px-2.5 font-mono text-[0.6875rem] text-error-text transition-colors hover:border-error"
            >
              {id}
              <X size={11} className="ms-1.5 inline" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {hint && <span className={hintClass}>{hint}</span>}
    </fieldset>
  );
}
