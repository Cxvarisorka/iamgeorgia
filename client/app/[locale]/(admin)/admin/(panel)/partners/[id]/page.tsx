import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Mail,
  Phone,
  StickyNote,
  X,
} from "lucide-react";

import {
  AdminBreadcrumbs,
  AdminContainer,
  AdminDefinitionList,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/AdminPage";
import { PartnerActions } from "@/components/admin/PartnerActions";
import { BookingStatusBadge } from "@/components/admin/StatusBadge";
import { bookings } from "@/data/admin/bookings";
import { getPartnerById, partnerKindLabels, partners } from "@/data/admin/partners";
import { formatAdminDate } from "@/lib/admin/metrics";
import { getI18n } from "@/lib/i18n/server";
import { formatPrice } from "@/lib/utils";

export function generateStaticParams() {
  return partners.map((partner) => ({ id: partner.id }));
}

export async function generateMetadata(
  props: PageProps<"/[locale]/admin/partners/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const partner = getPartnerById(id);
  return { title: partner ? partner.name : "Partner not found" };
}

export default async function AdminPartnerDetailPage(
  props: PageProps<"/[locale]/admin/partners/[id]">,
) {
  const [{ id }, { path }] = await Promise.all([props.params, getI18n()]);

  const partner = getPartnerById(id);
  if (!partner) notFound();

  const missing = partner.documents.filter((doc) => !doc.received);
  const related = bookings.filter((booking) => booking.partnerId === partner.id);

  return (
    <AdminContainer>
      <AdminBreadcrumbs
        items={[
          { label: "Partners", href: path("/admin/partners") },
          { label: partner.name },
        ]}
      />

      <AdminPageHeader
        title={partner.name}
        description={`${partnerKindLabels[partner.kind]} · ${partner.city} · applied ${formatAdminDate(partner.appliedOn)}`}
        actions={
          <Link
            href={path("/admin/partners")}
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
          >
            <ArrowLeft size={15} className="rtl:-scale-x-100" aria-hidden />
            All partners
          </Link>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <AdminPanel title="Business">
            <AdminDefinitionList
              items={[
                { label: "Trading name", value: partner.name },
                { label: "Legal entity", value: partner.legalName },
                { label: "Partner type", value: partnerKindLabels[partner.kind] },
                { label: "Tax number", value: partner.taxId },
                { label: "Operating city", value: partner.city },
                {
                  label: "Website",
                  value: partner.website ? (
                    <a
                      href={`https://${partner.website}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      {partner.website}
                      <ExternalLink size={13} className="text-subtle" aria-hidden />
                    </a>
                  ) : (
                    "—"
                  ),
                },
                { label: "Commission", value: `${partner.commissionRate}%` },
              ]}
            />
          </AdminPanel>

          <AdminPanel title="Main contact">
            <AdminDefinitionList
              items={[
                { label: "Name", value: partner.contactName },
                {
                  label: "Email",
                  value: (
                    <a
                      href={`mailto:${partner.email}`}
                      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      <Mail size={13} className="text-subtle" aria-hidden />
                      {partner.email}
                    </a>
                  ),
                },
                {
                  label: "Phone",
                  value: (
                    <a
                      href={`tel:${partner.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      <Phone size={13} className="text-subtle" aria-hidden />
                      {partner.phone}
                    </a>
                  ),
                },
              ]}
            />
          </AdminPanel>

          <AdminPanel
            title="Compliance documents"
            description={
              missing.length === 0
                ? "All documents received."
                : `${missing.length} of ${partner.documents.length} still outstanding.`
            }
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-line">
              {partner.documents.map((document) => (
                <li
                  key={document.label}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <span className="text-[0.875rem] text-body">{document.label}</span>
                  {document.received ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-medium text-success">
                      <Check size={15} aria-hidden />
                      Received
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-medium text-warning-text">
                      <X size={15} aria-hidden />
                      Outstanding
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AdminPanel>

          {partner.notes && (
            <AdminPanel title="Internal note">
              <p className="flex gap-3 text-[0.875rem] leading-relaxed text-body">
                <StickyNote size={16} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
                {partner.notes}
              </p>
            </AdminPanel>
          )}

          {related.length > 0 && (
            <AdminPanel
              title="Bookings fulfilled"
              description={`${related.length} in the current ledger.`}
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-line">
                {related.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={path(`/admin/bookings/${booking.id}`)}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-soft/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.875rem] font-medium text-ink">
                          {booking.productName}
                        </span>
                        <span className="block truncate text-[0.75rem] text-muted">
                          {booking.reference} · {booking.customer.name} ·{" "}
                          {formatAdminDate(booking.travelDate)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <BookingStatusBadge status={booking.status} />
                        <span className="text-[0.875rem] font-medium text-ink tabular-nums">
                          {formatPrice(booking.total)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AdminPanel>
          )}
        </div>

        <div className="space-y-6">
          <AdminPanel title="Performance">
            <AdminDefinitionList
              items={[
                { label: "Live listings", value: String(partner.listings) },
                {
                  label: "Lifetime revenue",
                  value: partner.revenue > 0 ? formatPrice(partner.revenue) : "—",
                },
                {
                  label: "Commission earned",
                  value:
                    partner.revenue > 0
                      ? formatPrice(
                          Math.round((partner.revenue * partner.commissionRate) / 100),
                        )
                      : "—",
                },
                { label: "Bookings in ledger", value: String(related.length) },
                { label: "On register since", value: formatAdminDate(partner.appliedOn) },
              ]}
            />
          </AdminPanel>

          <AdminPanel title="Review">
            <PartnerActions
              initialStatus={partner.status}
              missingDocuments={missing.length}
            />
          </AdminPanel>
        </div>
      </div>
    </AdminContainer>
  );
}
