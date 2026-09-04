import type { Metadata } from "next";
import { redirect } from "next/navigation";

import Link from "next/link";

import { TourBookingsBrowser } from "@/components/admin/TourBookingsBrowser";
import { PortalBookingsBrowser } from "@/components/partners/PortalBookingsBrowser";
import { Container } from "@/components/ui/Container";
import { bookingQueryFromParams } from "@/lib/admin/bookings";
import { tourBookingQueryFromParams } from "@/lib/admin/tours";
import { listPartnerBookings } from "@/lib/api/bookings";
import { listPartnerTourBookings } from "@/lib/api/tours";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";
import { localePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { ADMIN_ROLES } from "@/types/auth";

export const metadata: Metadata = { title: "Bookings" };

/**
 * Everything this partner has booked.
 *
 * `/api/partner/bookings` scopes the query to the caller's own company in the
 * `where` clause rather than filtering a wider result afterwards, so there is
 * no path by which one partner's list contains another's booking — the guard
 * is the query, not this page.
 *
 * Filtering is read out of the URL and applied on the server, which is why the
 * list survives a reload, can be shared with a colleague, and costs the same
 * for a partner with four thousand bookings as for one with four.
 */
export default async function PortalBookingsPage({
  searchParams,
}: PageProps<"/[locale]/portal/bookings">) {
  const session = await getSession();
  const locale = await getLocale();

  if (!session) redirect(localePath(locale, "/portal/sign-in"));

  if (!session.partner) {
    redirect(localePath(locale, ADMIN_ROLES.includes(session.user.role) ? "/admin" : "/"));
  }

  // Unapproved partners are sent back to the page that explains where they
  // stand, exactly as the settings screen does.
  if (session.partner.status !== "APPROVED") {
    redirect(localePath(locale, "/portal"));
  }

  const { path } = await getI18n();
  const params = await searchParams;
  // Two registers behind one page, because a BKG reference is not a TUR one:
  // separate endpoints, separate shapes, separate detail screens.
  const product = params.product === "tours" ? "tours" : "hotels";

  const tabs = [
    { key: "hotels", label: "Hotels", href: "/portal/bookings" },
    { key: "tours", label: "Tours", href: "/portal/bookings?product=tours" },
  ] as const;

  const list =
    product === "tours"
      ? await listPartnerTourBookings(tourBookingQueryFromParams(params))
      : await listPartnerBookings(bookingQueryFromParams(params));

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-[2.5rem]">Bookings</h1>
      <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted">
        {product === "tours"
          ? "Every departure you have booked, newest first. Open one to correct the traveller details or to cancel it."
          : "Every stay you have booked, newest first. Open one to correct the guest details or to cancel it."}
      </p>

      <nav aria-label="Product" className="mt-8 flex gap-1 border-b border-line">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={path(tab.href)}
            aria-current={product === tab.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-[0.8125rem] font-medium transition-colors",
              product === tab.key ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {product === "tours" ? (
          <TourBookingsBrowser
            {...(list as Awaited<ReturnType<typeof listPartnerTourBookings>>)}
            basePath="/portal/bookings"
            caption="Your tour bookings"
          />
        ) : (
          <PortalBookingsBrowser
            {...(list as Awaited<ReturnType<typeof listPartnerBookings>>)}
          />
        )}
      </div>
    </Container>
  );
}
