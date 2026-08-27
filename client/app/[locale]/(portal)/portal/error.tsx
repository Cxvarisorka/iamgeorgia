"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Container } from "@/components/ui/Container";
import { useLocalePath } from "@/lib/i18n/provider";

/**
 * The partner platform's error boundary. Sits inside the portal shell, so a
 * dashboard or booking page that fails to render is replaced by this while the
 * navigation and the sign-out button stay where they were. A failure in the
 * shell itself is rarer and falls through to the root-level `global-error`.
 *
 * `retry` rather than `reset`: the pages here are server-rendered from the
 * API, and re-rendering the same failed payload would only fail the same way.
 */
export default function PortalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const path = useLocalePath();

  useEffect(() => {
    // A live product would report this. Here it is the only place the console
    // should ever hear from the portal.
    console.error("Portal error:", error);
  }, [error]);

  return (
    <Container className="py-12 sm:py-16">
      <section className="flex flex-col items-center rounded-sm border border-line bg-surface p-6 text-center sm:p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-error/12 text-error-text">
          <TriangleAlert size={24} aria-hidden />
        </span>

        <h1 className="mt-6 font-display text-[1.75rem] leading-tight text-ink">
          This page could not load
        </h1>
        <p className="mt-4 max-w-md text-[1rem] leading-relaxed text-muted">
          The records behind it did not come back. Nothing has been changed on any booking —
          try again, or go back to the dashboard.
        </p>

        {error.digest && (
          <p className="mt-3 text-[0.8125rem] text-subtle">Reference: {error.digest}</p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-11 items-center rounded-sm bg-brand px-5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Try again
          </button>
          <Link
            href={path("/portal/dashboard")}
            className="inline-flex h-11 items-center rounded-sm border border-ink/20 px-5 text-[0.875rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
          >
            Dashboard
          </Link>
        </div>
      </section>
    </Container>
  );
}
