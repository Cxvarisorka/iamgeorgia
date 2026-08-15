import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Mail, Phone, StickyNote } from "lucide-react";

import {
  AdminBreadcrumbs,
  AdminContainer,
  AdminDefinitionList,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/AdminPage";
import { BookingActions } from "@/components/admin/BookingActions";
import { PaymentStatusBadge, PartnerStatusBadge } from "@/components/admin/StatusBadge";
import { getBookingById, productKindLabels } from "@/data/admin/bookings";
import { getPartnerById, partnerKindLabels } from "@/data/admin/partners";
import { formatAdminDate } from "@/lib/admin/metrics";
import { getI18n } from "@/lib/i18n/server";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata(
  props: PageProps<"/[locale]/admin/bookings/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const booking = getBookingById(id);
  return { title: booking ? `Booking ${booking.reference}` : "Booking not found" };
}

/** Where a booking's product lives on the public site. */
const productPath: Record<string, string> = {
  hotel: "/hotels",
  tour: "/tours",
  transfer: "/transfers",
};

export default async function AdminBookingDetailPage(
  props: PageProps<"/[locale]/admin/bookings/[id]">,
) {
  const [{ id }, { path }] = await Promise.all([props.params, getI18n()]);

  const booking = getBookingById(id);
  if (!booking) notFound();

  const partner = getPartnerById(booking.partnerId);
  const nightsLabel =
    booking.kind === "hotel"
      ? `${booking.nights} ${booking.nights === 1 ? "night" : "nights"}`
      : booking.kind === "tour"
        ? `${booking.nights} ${booking.nights === 1 ? "day" : "days"}`
        : "Single journey";

  return (
    <AdminContainer>
      <AdminBreadcrumbs
        items={[
          { label: "Bookings", href: path("/admin/bookings") },
          { label: booking.reference },
        ]}
      />

      <AdminPageHeader
        title={booking.reference}
        description={`${productKindLabels[booking.kind]} booking placed on ${formatAdminDate(booking.placedOn)}.`}
        actions={
          <Link
            href={path("/admin/bookings")}
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
          >
            <ArrowLeft size={15} className="rtl:-scale-x-100" aria-hidden />
            Back to bookings
          </Link>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <AdminPanel title="Reservation">
            <AdminDefinitionList
              items={[
                {
                  label: "Product",
                  value: (
                    <Link
                      href={path(`${productPath[booking.kind]}/${booking.productSlug}`)}
                      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      {booking.productName}
                      <ExternalLink size={13} className="text-subtle" aria-hidden />
                    </Link>
                  ),
                },
                { label: "Type", value: productKindLabels[booking.kind] },
                { label: "Travel date", value: formatAdminDate(booking.travelDate) },
                { label: "Duration", value: nightsLabel },
                {
                  label: "Guests",
                  value: `${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}`,
                },
                { label: "Placed on", value: formatAdminDate(booking.placedOn) },
              ]}
            />
          </AdminPanel>

          <AdminPanel title="Customer">
            <AdminDefinitionList
              items={[
                { label: "Name", value: booking.customer.name },
                {
                  label: "Email",
                  value: (
                    <a
                      href={`mailto:${booking.customer.email}`}
                      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      <Mail size={13} className="text-subtle" aria-hidden />
                      {booking.customer.email}
                    </a>
                  ),
                },
                {
                  label: "Phone",
                  value: (
                    <a
                      href={`tel:${booking.customer.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      <Phone size={13} className="text-subtle" aria-hidden />
                      {booking.customer.phone}
                    </a>
                  ),
                },
                { label: "Country", value: booking.customer.country },
              ]}
            />
          </AdminPanel>

          {booking.notes && (
            <AdminPanel title="Internal note">
              <p className="flex gap-3 text-[0.875rem] leading-relaxed text-body">
                <StickyNote size={16} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
                {booking.notes}
              </p>
            </AdminPanel>
          )}

          {partner && (
            <AdminPanel
              title="Fulfilled by"
              action={
                <Link
                  href={path(`/admin/partners/${partner.id}`)}
                  className="text-[0.8125rem] font-medium text-brand-text underline-offset-4 hover:underline"
                >
                  Open partner
                </Link>
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.9375rem] font-medium text-ink">{partner.name}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-muted">
                    {partnerKindLabels[partner.kind]} · {partner.city} ·{" "}
                    {partner.commissionRate}% commission
                  </p>
                </div>
                <PartnerStatusBadge status={partner.status} />
              </div>
            </AdminPanel>
          )}
        </div>

        <div className="space-y-6">
          <AdminPanel title="Payment">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[0.8125rem] text-muted">Total</span>
              <span className="font-display text-2xl text-ink tabular-nums">
                {formatPrice(booking.total)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-[0.8125rem] text-muted">Status</span>
              <PaymentStatusBadge status={booking.payment} />
            </div>
            <p className="mt-4 text-[0.75rem] text-subtle">
              Indicative only. This prototype processes no payments.
            </p>
          </AdminPanel>

          <AdminPanel title="Actions">
            <BookingActions initialStatus={booking.status} />
          </AdminPanel>
        </div>
      </div>
    </AdminContainer>
  );
}
