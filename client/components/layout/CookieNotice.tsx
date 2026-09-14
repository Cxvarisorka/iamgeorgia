"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import { useI18n, useLocalePath } from "@/lib/i18n/provider";

const STORAGE_KEY = "iag_cookie_notice";

/*
 * A one-key store over `localStorage`, so the notice can read "dismissed"
 * through `useSyncExternalStore`. That hook is what makes the first client
 * render agree with the server: the server snapshot says "dismissed" (render
 * nothing), the browser then reads the real answer and re-renders once. No
 * state set inside an effect, and no hydration mismatch on the visit where
 * the notice actually shows.
 *
 * Every storage access is guarded — private windows and blocked site data
 * throw, and in that case the notice simply returns next visit.
 */
const listeners = new Set<() => void>();

const readDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const dismiss = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage unavailable — the notice will return next visit, which is fine.
  }
  listeners.forEach((listener) => listener());
};

/**
 * A one-line notice that the site sets only strictly necessary cookies.
 *
 * Informational rather than a consent gate: nothing here needs consent, since
 * no analytics or advertising cookie is ever set. It asks for one
 * acknowledgement and then stays away.
 */
export function CookieNotice() {
  const { t } = useI18n();
  const path = useLocalePath();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label={t.cookieNotice.label}
      className="fixed inset-x-0 bottom-0 z-100 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-sm border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
        <p className="type-body-sm text-body">
          {t.cookieNotice.body}{" "}
          <Link
            href={path("/cookies")}
            className="text-brand-text underline underline-offset-4 hover:text-brand-hover"
          >
            {t.cookieNotice.link}
          </Link>
        </p>
        <Button
          onClick={dismiss}
          size="sm"
          variant="secondary"
          className="shrink-0 self-start sm:self-auto"
        >
          {t.cookieNotice.dismiss}
        </Button>
      </div>
    </div>
  );
}
