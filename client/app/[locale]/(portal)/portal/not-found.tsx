import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { getI18n } from "@/lib/i18n/server";

/**
 * Rendered when a booking reference in the URL matches nothing the signed-in
 * partner may see — a mistyped reference, a booking that belongs to another
 * company, a stale link. Kept inside the portal shell so the partner keeps
 * their navigation, rather than falling through to the marketing site's 404
 * with its holiday photography and "ask us where to go".
 *
 * The wording deliberately does not distinguish "does not exist" from "is not
 * yours": the server answers both with a 404 so references cannot be probed,
 * and this page keeps that promise.
 */
export default async function PortalNotFound() {
  const { path } = await getI18n();

  return (
    <Container className="py-12 sm:py-16">
      <section className="flex flex-col items-center rounded-sm border border-line bg-surface p-6 text-center sm:p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface-soft text-brand-text">
          <FileQuestion size={24} aria-hidden />
        </span>

        <h1 className="mt-6 font-display text-[1.75rem] leading-tight text-ink">
          Nothing matches that address
        </h1>
        <p className="mt-4 max-w-md text-[1rem] leading-relaxed text-muted">
          There is no booking or page at this link for your account. Check the reference, or
          find the booking from your list.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={path("/portal/bookings")}
            className="inline-flex h-11 items-center rounded-sm bg-brand px-5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            All bookings
          </Link>
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
