/**
 * Persists the reader's language choice for `proxy.ts`.
 *
 * Lives outside the component because assigning to `document.cookie` inside
 * one trips the immutability lint — and a browser-storage write is not
 * component logic anyway.
 */
import type { Locale } from "./config";

export const LOCALE_COOKIE = "iag_locale";

export function rememberLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  // One year, site-wide.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
