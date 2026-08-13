"use client";

import { createContext, useContext } from "react";

import { defaultLocale, localeMeta, localePath, type Locale } from "./config";
import type { UiDictionary } from "./ui/en";

/**
 * Locale access for Client Components.
 *
 * Server Components read the locale straight from `next/root-params`, which is
 * unavailable on the client — so the layout resolves it once on the server and
 * hands it down through this provider. The dictionary is already part of the
 * server-rendered payload, so this adds no extra fetch.
 */

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: UiDictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: UiDictionary;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider
      value={{ locale, dir: localeMeta[locale].dir, t: dictionary }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useI18n must be used inside <LocaleProvider>");
  }
  return value;
}

/**
 * Prefixes a canonical path with the active locale.
 *
 * Every client-side `Link` must use this. A raw `href="/tours"` would drop a
 * Georgian reader back into English mid-journey, which is the single easiest
 * way to break a localised site.
 */
export function useLocalePath(): (path: string) => string {
  const { locale } = useI18n();
  return (path: string) => localePath(locale, path);
}

export { defaultLocale, localePath };
