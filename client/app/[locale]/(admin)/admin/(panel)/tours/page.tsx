import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AdminContainer, AdminPageHeader } from "@/components/admin/AdminPage";
import { InventoryBrowser, type InventoryRow } from "@/components/admin/InventoryBrowser";
import { bookings } from "@/data/admin/bookings";
import { tours } from "@/data/tours";

export const metadata: Metadata = { title: "Tours" };

/** Sentence case for the table, from the lowercase category keys in the data. */
function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function AdminToursPage() {
  const rows: InventoryRow[] = tours.map((tour) => ({
    id: tour.id,
    slug: tour.slug,
    name: tour.title,
    image: tour.image,
    location: tour.location,
    group: categoryLabel(tour.category),
    price: tour.priceFrom,
    priceUnit: "per person",
    rating: tour.rating,
    reviewCount: tour.reviewCount,
    detailLabel: `${tour.durationLabel} · ${tour.difficulty}`,
    featured: tour.featured,
    bookings: bookings.filter((booking) => booking.productSlug === tour.slug).length,
  }));

  const groups = Array.from(new Set(tours.map((tour) => categoryLabel(tour.category))));

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Tours"
        description="Multi-day journeys and day trips, with live booking counts."
        actions={
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <Plus size={15} aria-hidden />
            Add tour
          </button>
        }
      />

      <InventoryBrowser
        rows={rows}
        groups={groups}
        groupLegend="Category"
        basePath="/admin/tours"
        searchPlaceholder="Search tours by name or region"
        emptyMessage="No tours match those filters."
      />
    </AdminContainer>
  );
}
