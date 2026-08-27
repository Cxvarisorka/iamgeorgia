"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * The last line of defence: what renders when the root layout itself throws.
 *
 * Nothing from the app survives to this point — no locale provider, no
 * dictionaries, no fonts — so this file brings its own document, loads the
 * stylesheet itself (Next does not carry the root layout's styles across), and
 * stays in English. It does one thing: offers a way to try again. The site-,
 * panel- and portal-level `error.tsx` files catch everything below the root
 * layout, so a visitor should very rarely see this.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // A live product would report this. Here it is the only place the console
    // hears about a root-layout failure.
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-24 text-center font-sans text-ink antialiased">
        <main className="max-w-lg">
          <h1 className="text-[1.75rem] leading-tight font-semibold">Something went wrong</h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
            The page could not be shown. Nothing has been booked and nothing has been charged.
            Try again, and if it keeps happening, come back in a few minutes.
          </p>
          {error.digest && (
            <p className="mt-4 text-[0.8125rem] text-subtle">Reference: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-8 inline-flex h-11 items-center rounded-sm bg-brand px-6 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
