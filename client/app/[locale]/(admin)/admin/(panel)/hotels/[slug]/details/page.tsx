import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminBreadcrumbs, AdminContainer, AdminPageHeader } from "@/components/admin/AdminPage";
import { HotelDetailsEditor } from "@/components/admin/HotelDetailsEditor";
import { getHotel, listAmenities } from "@/lib/api/hotels";
import { ApiError } from "@/lib/api/client";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Details" };

/**
 * Words, times and amenities — the screen behind most of the publish
 * checklist. What is *not* here is deliberate: rooms, rates and images have
 * their own screens, and location has the map.
 */
export default async function HotelDetailsPage({
  params,
}: PageProps<"/[locale]/admin/hotels/[slug]/details">) {
  const { slug } = await params;
  const { path } = await getI18n();

  let hotel;

  try {
    hotel = await getHotel(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  // The whole vocabulary: HOTEL-scoped and BOTH-scoped amenities. Room-only
  // ones (a kitchenette, a workspace) belong on the rooms screen instead.
  const { data: vocabulary } = await listAmenities({ scope: "HOTEL" });

  return (
    <AdminContainer>
      <AdminBreadcrumbs
        items={[
          { label: "Hotels", href: path("/admin/hotels") },
          { label: hotel.name, href: path(`/admin/hotels/${hotel.id}`) },
          { label: "Details" },
        ]}
      />
      <AdminPageHeader
        title="Details & policies"
        description="Descriptions, check-in and check-out times, guest-facing policies and the amenity checklist."
      />

      <div className="mt-8">
        <HotelDetailsEditor hotel={hotel} vocabulary={vocabulary} />
      </div>
    </AdminContainer>
  );
}
