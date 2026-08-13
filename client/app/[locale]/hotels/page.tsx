import type { Metadata } from "next";

import { HotelExplorer } from "@/components/hotels/HotelExplorer";
import { PageHero } from "@/components/ui/PageHero";
import { getI18n } from "@/lib/i18n/server";
import { destinations } from "@/data/destinations";
import { hotels } from "@/data/hotels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.hotels.metaTitle, description: t.hotels.metaDescription };
}

export default async function HotelsPage() {
  const { t } = await getI18n();
  // Only offer destinations that actually have a property in the list.
  const stayDestinations = destinations
    .filter((destination) => hotels.some((hotel) => hotel.destinationSlug === destination.slug))
    .map((destination) => ({ slug: destination.slug, name: destination.name }));

  return (
    <>
      <PageHero
        eyebrow={t.hotels.heroEyebrow}
        title={t.hotels.heroTitle}
        description={t.hotels.heroDescription}
        image="/images/hotels/property-6.jpg"
        imageAlt={t.hotels.heroImageAlt}
      />

      <HotelExplorer hotels={hotels} destinations={stayDestinations} />
    </>
  );
}
