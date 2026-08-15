import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AdminContainer, AdminPageHeader } from "@/components/admin/AdminPage";
import { InventoryBrowser, type InventoryRow } from "@/components/admin/InventoryBrowser";
import { bookings } from "@/data/admin/bookings";
import { hotels, propertyTypes } from "@/data/hotels";

export const metadata: Metadata = { title: "Hotels" };

export default function AdminHotelsPage() {
  const rows: InventoryRow[] = hotels.map((hotel) => ({
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    image: hotel.image,
    location: hotel.location,
    group: hotel.propertyType,
    price: hotel.priceFrom,
    priceUnit: "per night",
    // The guest score is out of 10 everywhere else in the product; the table
    // shows one rating column for both verticals, so it is halved here.
    rating: hotel.guestScore / 2,
    reviewCount: hotel.reviewCount,
    detailLabel: `${hotel.rooms.length} room ${hotel.rooms.length === 1 ? "type" : "types"}`,
    featured: hotel.featured,
    bookings: bookings.filter((booking) => booking.productSlug === hotel.slug).length,
  }));

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Hotels"
        description="Every property in the catalogue, and how each is performing."
        actions={
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <Plus size={15} aria-hidden />
            Add property
          </button>
        }
      />

      <InventoryBrowser
        rows={rows}
        groups={[...propertyTypes]}
        groupLegend="Property type"
        basePath="/admin/hotels"
        searchPlaceholder="Search properties by name or location"
        emptyMessage="No properties match those filters."
      />
    </AdminContainer>
  );
}
