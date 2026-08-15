import { defaultLocale, type Locale } from "@/lib/i18n/config";

/**
 * Editorial content translation.
 *
 * UI chrome lives in `lib/i18n/ui`. This is the other half: the words that
 * belong to a *thing* — a tour, a hotel, a transfer class, a pick-up point —
 * which cannot sit in a flat dictionary because they multiply with the data.
 *
 * The English record in `data/` stays the source of truth for everything that
 * is not language: ids, slugs, prices, coordinates, images, capacities. A
 * translation supplies only the prose fields, and is merged over the English
 * record at read time. That has two useful consequences: a missing translation
 * degrades to English for that one field rather than breaking the page, and
 * the pricing and filtering logic never has to know a locale exists.
 */

/** The translatable fields of `T`, all optional. */
export type Content<T> = Partial<T>;

/** Translations for a whole collection, keyed by entity id. */
export type ContentMap<T> = Record<string, Content<T>>;

/** Per-locale content. English is absent by definition — it is the base. */
export type LocalisedContent<T> = Partial<Record<Locale, ContentMap<T>>>;

/**
 * Merges the translation for `id` over `base`.
 *
 * Shallow on purpose. Every translatable field on these entities is a string
 * or an array of strings, and a deep merge over arrays would silently splice
 * a translated list into an English one of a different length.
 */
export function localise<T extends { id: string }>(
  base: T,
  locale: Locale,
  content: LocalisedContent<T>,
): T {
  if (locale === defaultLocale) return base;
  const override = content[locale]?.[base.id];
  return override ? { ...base, ...override } : base;
}

/** `localise` across a collection. */
export function localiseAll<T extends { id: string }>(
  items: T[],
  locale: Locale,
  content: LocalisedContent<T>,
): T[] {
  if (locale === defaultLocale) return items;
  return items.map((item) => localise(item, locale, content));
}
