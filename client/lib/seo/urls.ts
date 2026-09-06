import { site } from "@/constants/site";
import { defaultLocale, localeMeta, localePath, locales, type Locale } from "@/lib/i18n/config";

/**
 * Absolute URLs and the hreflang set.
 *
 * Deliberately free of `next/headers` and `next/root-params` so the sitemap,
 * which runs without a request in scope, can share the same builders as
 * `generateMetadata`. There is exactly one place a public URL is spelled, and
 * this is it.
 */

/**
 * The public address of a path.
 *
 * `new URL` rather than string concatenation so the root comes back as
 * `https://…/` while every other path stays unslashed — which is what the
 * proxy actually serves, and what the canonical must therefore say.
 *
 * An already-absolute URL passes through untouched: catalogue images are
 * serialized by the API as full media-bucket URLs, and structured data hands
 * them to this same helper as everything else.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  return new URL(path.startsWith("/") ? path : `/${path}`, site.url).toString();
}

/** The absolute URL of `path` in one locale. `/tours` in ka → `…/ka/tours`. */
export function localeUrl(locale: Locale, path: string): string {
  return absoluteUrl(localePath(locale, path));
}

/** Every locale's URL for one canonical path, keyed by BCP 47 tag. */
export function languageUrls(path: string): Record<string, string> {
  return Object.fromEntries(
    locales.map((code) => [localeMeta[code].htmlLang, localeUrl(code, path)]),
  );
}

/**
 * The `alternates` block for a localisable page.
 *
 * `path` is the canonical, unprefixed route — the same value every locale
 * passes. That is what makes the set reciprocal: /ka/tours lists /tours and
 * /tours lists /ka/tours because both were built from `/tours`. A one-way set
 * is ignored by search engines entirely, so this must never be hand-written
 * per page.
 *
 * `canonical` is self-referencing and carries no query string: a filtered or
 * dated listing points at the clean page rather than at itself.
 */
export function localeAlternates(locale: Locale, path: string) {
  return {
    canonical: localeUrl(locale, path),
    languages: {
      ...languageUrls(path),
      /** English is the version to serve when no listed language fits. */
      "x-default": localeUrl(defaultLocale, path),
    },
  };
}
