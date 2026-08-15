import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import {
  AdminBreadcrumbs,
  AdminContainer,
  AdminDefinitionList,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/AdminPage";
import { ListingEditor, type EditorField } from "@/components/admin/ListingEditor";
import { bookings } from "@/data/admin/bookings";
import { getTourBySlug, tours } from "@/data/tours";
import { formatAdminDate } from "@/lib/admin/metrics";
import { getI18n } from "@/lib/i18n/server";
import { formatPrice } from "@/lib/utils";

export function generateStaticParams() {
  return tours.map((tour) => ({ slug: tour.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[locale]/admin/tours/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const tour = getTourBySlug(slug);
  return { title: tour ? tour.title : "Tour not found" };
}

export default async function AdminTourEditPage(
  props: PageProps<"/[locale]/admin/tours/[slug]">,
) {
  const [{ slug }, { path }] = await Promise.all([props.params, getI18n()]);

  const tour = getTourBySlug(slug);
  if (!tour) notFound();

  const related = bookings.filter((booking) => booking.productSlug === tour.slug);
  const revenue = related
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + booking.total, 0);

  const sections: { title: string; description?: string; fields: EditorField[] }[] = [
    {
      title: "Listing",
      description: "How the journey appears across the public site.",
      fields: [
        { name: "title", label: "Tour title", type: "text", value: tour.title },
        {
          name: "category",
          label: "Category",
          type: "select",
          value: tour.category,
          options: ["adventure", "culture", "wine", "nature", "city"],
          half: true,
        },
        {
          name: "difficulty",
          label: "Difficulty",
          type: "select",
          value: tour.difficulty,
          options: ["Easy", "Moderate", "Challenging"],
          half: true,
        },
        { name: "location", label: "Region", type: "text", value: tour.location, half: true },
        {
          name: "groupSize",
          label: "Group size",
          type: "text",
          value: tour.groupSize,
          half: true,
        },
        {
          name: "summary",
          label: "Summary",
          type: "area",
          value: tour.summary,
          hint: "One or two sentences. Shown on cards and search results.",
        },
      ],
    },
    {
      title: "Duration and price",
      fields: [
        {
          name: "durationDays",
          label: "Duration in days",
          type: "number",
          value: String(tour.durationDays),
          half: true,
        },
        {
          name: "durationLabel",
          label: "Duration label",
          type: "text",
          value: tour.durationLabel,
          half: true,
          hint: "What a traveller reads, e.g. “3 days, 2 nights”.",
        },
        {
          name: "priceFrom",
          label: "Price from",
          type: "number",
          value: String(tour.priceFrom),
          prefix: "$",
          half: true,
          hint: "Per person.",
        },
        {
          name: "meetingPoint",
          label: "Meeting point",
          type: "text",
          value: tour.meetingPoint,
          half: true,
        },
      ],
    },
  ];

  return (
    <AdminContainer>
      <AdminBreadcrumbs
        items={[{ label: "Tours", href: path("/admin/tours") }, { label: tour.title }]}
      />

      <AdminPageHeader
        title={tour.title}
        description={`${tour.durationLabel} · ${tour.location} · ${tour.difficulty}`}
        actions={
          <>
            <Link
              href={path(`/tours/${tour.slug}`)}
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
            >
              <ExternalLink size={15} aria-hidden />
              View live page
            </Link>
            <Link
              href={path("/admin/tours")}
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
            >
              <ArrowLeft size={15} className="rtl:-scale-x-100" aria-hidden />
              All tours
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ListingEditor sections={sections} featured={tour.featured} />
        </div>

        <div className="space-y-6">
          <AdminPanel title="Cover image" bodyClassName="p-0">
            <div className="relative aspect-4/3 w-full overflow-hidden bg-line">
              <Image
                src={tour.image}
                alt={`Cover image for ${tour.title}`}
                fill
                sizes="(max-width: 1024px) 100vw, 22rem"
                className="object-cover"
              />
            </div>
            <p className="px-5 py-4 text-[0.75rem] text-subtle">
              {tour.gallery.length} images in the gallery. Image management is not part of
              this prototype.
            </p>
          </AdminPanel>

          <AdminPanel title="Performance">
            <AdminDefinitionList
              items={[
                { label: "Bookings in ledger", value: String(related.length) },
                { label: "Gross value", value: formatPrice(revenue) },
                { label: "Itinerary days", value: String(tour.itinerary.length) },
                { label: "Rating", value: `${tour.rating.toFixed(1)} / 5` },
                { label: "Reviews", value: tour.reviewCount.toLocaleString("en-GB") },
              ]}
            />
          </AdminPanel>

          {related.length > 0 && (
            <AdminPanel title="Recent bookings" bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {related.slice(0, 4).map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={path(`/admin/bookings/${booking.id}`)}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-soft/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.875rem] font-medium text-ink">
                          {booking.customer.name}
                        </span>
                        <span className="block text-[0.75rem] text-muted">
                          {formatAdminDate(booking.travelDate)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.875rem] font-medium text-ink tabular-nums">
                        {formatPrice(booking.total)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminContainer>
  );
}
