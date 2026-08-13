import { defaultLocale, isLocale, type Locale } from "./config";
import { en, type UiDictionary } from "./ui/en";
import { he } from "./ui/he";
import { ka } from "./ui/ka";
import { ru } from "./ui/ru";

/**
 * UI dictionary lookup.
 *
 * Imported statically rather than lazily: the whole set is a few kilobytes of
 * strings, every page needs one of them, and static imports keep this usable
 * from `generateMetadata` and Client Components alike without an await.
 */
const dictionaries: Record<Locale, UiDictionary> = { en, ka, ru, he };

export function getDictionary(locale: string): UiDictionary {
  return dictionaries[isLocale(locale) ? locale : defaultLocale];
}

/**
 * Fills `{placeholder}` slots in a dictionary string.
 *
 *   t("{count} reviews", { count: 128 }) → "128 reviews"
 *
 * Deliberately tiny — the alternative is pulling in an ICU message formatter
 * for a handful of single-value substitutions.
 */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type { UiDictionary };
