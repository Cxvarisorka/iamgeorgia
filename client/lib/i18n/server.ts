import { locale as rootLocale } from "next/root-params";

import { defaultLocale, isLocale, localePath, localeMeta, type Locale } from "./config";
import { fill, getDictionary, type UiDictionary } from "./dictionaries";

/**
 * Locale access for Server Components.
 *
 * `locale` is a root parameter (the `[locale]` segment sits above the root
 * layout), so any server component can read it without the value being passed
 * down as a prop. That is what keeps this from turning into prop-drilling
 * through every card, section and detail page.
 *
 * Client Components cannot call this — they use `useI18n()` from ./provider,
 * which the root layout seeds with the same values.
 */

export async function getLocale(): Promise<Locale> {
  const value = await rootLocale();
  return value && isLocale(value) ? value : defaultLocale;
}

export interface ServerI18n {
  locale: Locale;
  /** UI strings for the active locale. */
  t: UiDictionary;
  /** Prefixes a canonical path with the active locale. */
  path: (href: string) => string;
  /** Fills `{placeholder}` slots. */
  fill: typeof fill;
  dir: "ltr" | "rtl";
  /** For `Intl.NumberFormat` / `Intl.DateTimeFormat`. */
  intlLocale: string;
}

export async function getI18n(): Promise<ServerI18n> {
  const locale = await getLocale();
  const meta = localeMeta[locale];

  return {
    locale,
    t: getDictionary(locale),
    path: (href: string) => localePath(locale, href),
    fill,
    dir: meta.dir,
    intlLocale: meta.intlLocale,
  };
}
