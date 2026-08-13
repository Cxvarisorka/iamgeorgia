/**
 * Locale configuration — the single source of truth for which languages exist,
 * how they are written, and how they appear in URLs.
 *
 * Safe to import from both Server and Client Components: it holds no
 * translations and touches no server-only APIs.
 */

export const locales = ["en", "ka", "ru", "he"] as const;

export type Locale = (typeof locales)[number];

/**
 * English is the default and carries no URL prefix — `/tours`, not `/en/tours`.
 * `proxy.ts` rewrites unprefixed paths onto the `[locale]` segment internally,
 * so the route tree stays uniform while the public URL stays clean.
 */
export const defaultLocale: Locale = "en";

export interface LocaleMeta {
  code: Locale;
  /** Endonym — a language is always listed in its own script. */
  label: string;
  /** English name, for `aria-label`s and anything a screen reader announces. */
  english: string;
  dir: "ltr" | "rtl";
  /** BCP 47 tag for the `lang` attribute and `hreflang`. */
  htmlLang: string;
  /** Locale tag for Intl number and date formatting. */
  intlLocale: string;
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  en: {
    code: "en",
    label: "English",
    english: "English",
    dir: "ltr",
    htmlLang: "en",
    intlLocale: "en-GB",
  },
  ka: {
    code: "ka",
    label: "ქართული",
    english: "Georgian",
    dir: "ltr",
    htmlLang: "ka",
    intlLocale: "ka-GE",
  },
  ru: {
    code: "ru",
    label: "Русский",
    english: "Russian",
    dir: "ltr",
    htmlLang: "ru",
    intlLocale: "ru-RU",
  },
  he: {
    code: "he",
    label: "עברית",
    english: "Hebrew",
    dir: "rtl",
    htmlLang: "he",
    /** Hebrew with Latin digits — prices read as 1,240 rather than in Hebrew numerals. */
    intlLocale: "he-IL",
  },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function isRtl(locale: Locale): boolean {
  return localeMeta[locale].dir === "rtl";
}

/**
 * Builds a public href for a path in a given locale.
 *
 * `path` is always the canonical, unprefixed route (`/tours`, `/hotels/x`).
 * Every `Link` in the app must run its href through this, or navigating would
 * silently drop the reader back into English.
 */
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean === "" ? "/" : clean;
  return `/${locale}${clean}`;
}

/**
 * Inverse of `localePath` — strips any locale prefix to recover the canonical
 * path. Used by the language switcher to stay on the current page when the
 * reader changes language.
 */
export function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}
