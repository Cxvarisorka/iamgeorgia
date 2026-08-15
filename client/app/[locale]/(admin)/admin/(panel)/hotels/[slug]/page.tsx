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
import { getHotelBySlug, hotels, propertyTypes } from "@/data/hotels";
import { formatAdminDate } from "@/lib/admin/metrics";
import { getI18n } from "@/lib/i18n/server";
import { formatPrice } from "@/lib/utils";

export function generateStaticParams() {
  return hotels.map((hotel) => ({ slug: hotel.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[locale]/admin/hotels/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const hotel = getHotelBySlug(slug);
  return { title: hotel ? hotel.name : "Property not found" };
}

export default async function AdminHotelEditPage(
  props: PageProps<"/[locale]/admin/hotels/[slug]">,
) {
  const [{ slug }, { path }] = await Promise.all([props.params, getI18n()]);

  const hotel = getHotelBySlug(slug);
  if (!hotel) notFound();

  const related = bookings.filter((booking) => booking.productSlug === hotel.slug);
  const revenue = related
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + booking.total, 0);

  const sections: { title: string; description?: string; fields: EditorField[] }[] = [
    {
      title: "Listing",
      description: "How the property appears across the public site.",
      fields: [
        { name: "name", label: "Property name", type: "text", value: hotel.name },
        {
          name: "propertyType",
          label: "Property type",
          type: "select",
          value: hotel.propertyType,
          options: [...propertyTypes],
          half: true,
        },
        {
          name: "starRating",
          label: "Star classification",
          type: "number",
          value: String(hotel.starRating),
          half: true,
          hint: "Official classification, 1–5.",
        },
        { name: "location", label: "Location", type: "text", value: hotel.location, half: true },
        { name: "address", label: "Address", type: "text", value: hotel.address, half: true },
        {
          name: "summary",
          label: "Summary",
          type: "area",
          value: hotel.summary,
          hint: "One or two sentences. Shown on cards and search results.",
        },
      ],
    },
    {
      title: "Rates",
      description: "Indicative pricing shown before a room is selected.",
      fields: [
        {
          name: "priceFrom",
          label: "Lowest nightly rate",
          type: "number",
          value: String(hotel.priceFrom),
          prefix: "$",
          half: true,
          hint: "Derived from the cheapest room type in a live product.",
        },
        {
          name: "guestScore",
          label: "Guest score",
          type: "number",
          value: String(hotel.guestScore),
          half: true,
          hint: "Out of 10.",
        },
      ],
    },
  ];

  return (
    <AdminContainer>
      <AdminBreadcrumbs
        items={[{ label: "Hotels", href: path("/admin/hotels") }, { label: hotel.name }]}
      />

      <AdminPageHeader
        title={hotel.name}
        description={`${hotel.propertyType} · ${hotel.location}`}
        actions={
          <>
            <Link
              href={path(`/hotels/${hotel.slug}`)}
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
            >
              <ExternalLink size={15} aria-hidden />
              View live page
            </Link>
            <Link
              href={path("/admin/hotels")}
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
            >
              <ArrowLeft size={15} className="rtl:-scale-x-100" aria-hidden />
              All hotels
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ListingEditor sections={sections} featured={hotel.featured} />
        </div>

        <div className="space-y-6">
          <AdminPanel title="Cover image" bodyClassName="p-0">
            <div className="relative aspect-4/3 w-full overflow-hidden bg-line">
              <Image
                src={hotel.image}
                alt={`Cover image for ${hotel.name}`}
                fill
                sizes="(max-width: 1024px) 100vw, 22rem"
                className="object-cover"
              />
            </div>
            <p className="px-5 py-4 text-[0.75rem] text-subtle">
              {hotel.gallery.length} images in the gallery. Image management is not part
              of this prototype.
            </p>
          </AdminPanel>

          <AdminPanel title="Performance">
            <AdminDefinitionList
              items={[
                { label: "Bookings in ledger", value: String(related.length) },
                { label: "Gross value", value: formatPrice(revenue) },
                { label: "Room types", value: String(hotel.rooms.length) },
                { label: "Guest score", value: `${hotel.guestScore.toFixed(1)} / 10` },
                { label: "Reviews", value: hotel.reviewCount.toLocaleString("en-GB") },
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
