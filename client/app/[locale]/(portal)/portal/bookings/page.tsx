import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PortalBookingsBrowser } from "@/components/partners/PortalBookingsBrowser";
import { Container } from "@/components/ui/Container";
import { bookingQueryFromParams } from "@/lib/admin/bookings";
import { listPartnerBookings } from "@/lib/api/bookings";
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

  const list = await listPartnerBookings(bookingQueryFromParams(await searchParams));

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-[2.5rem]">Bookings</h1>
      <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted">
        Every stay you have booked, newest first. Open one to correct the guest details or to
        cancel it.
      </p>

      <div className="mt-10">
        <PortalBookingsBrowser
          data={list.data}
          total={list.total}
          page={list.page}
          totalPages={list.totalPages}
        />
      </div>
    </Container>
  );
}
