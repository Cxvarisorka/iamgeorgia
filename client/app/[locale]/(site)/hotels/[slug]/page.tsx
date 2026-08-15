import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MapPin, Navigation } from "lucide-react";

import { BookingSummary } from "@/components/hotels/BookingSummary";
import { HotelAmenities } from "@/components/hotels/HotelAmenities";
import { HotelCard } from "@/components/hotels/HotelCard";
import { HotelPolicies } from "@/components/hotels/HotelPolicies";
import { HotelReviews } from "@/components/hotels/HotelReviews";
import { HotelRoomCard } from "@/components/hotels/HotelRoomCard";
import { HotelSectionNav } from "@/components/hotels/HotelSectionNav";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { ScoreBadge, Stars } from "@/components/ui/Rating";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ShareSave } from "@/components/ui/ShareSave";
import { getDestinationBySlug } from "@/data/destinations";
import { getHotelBySlug, hotels } from "@/data/hotels";
import { formatPrice, relatedBySlug } from "@/lib/utils";

export function generateStaticParams() {
  return hotels.map((hotel) => ({ slug: hotel.slug }));
}

export async function generateMetadata(props: PageProps<"/[locale]/hotels/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const hotel = getHotelBySlug(slug);
  if (!hotel) return { title: "Property not found" };

  return {
    title: hotel.name,
    description: hotel.summary,
    openGraph: {
      title: `${hotel.name} — ${hotel.location}`,
      description: hotel.summary,
      images: [{ url: hotel.image }],
    },
  };
}

export default async function HotelDetailPage(props: PageProps<"/[locale]/hotels/[slug]">) {
  const { slug } = await props.params;
  console.log(slug);
  const hotel = getHotelBySlug(slug);
  if (!hotel) notFound();

  const destination = getDestinationBySlug(hotel.destinationSlug);
  const related = relatedBySlug(hotels, hotel.slug, 3);

  return (
    <>
      <Container className="pt-8 pb-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Hotels", href: "/hotels" },
            ...(destination
              ? [{ label: destination.name, href: `/destinations/${destination.slug}` }]
              : []),
            { label: hotel.name },
          ]}
        />

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="outline">{hotel.propertyType}</Badge>
              <Stars count={hotel.starRating} />
            </div>
            <h1 className="type-h1 mt-4 text-balance">{hotel.name}</h1>
            <p className="type-body-sm mt-3 flex items-center gap-2 text-muted">
              <MapPin size={15} aria-hidden />
              {hotel.address}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-6">
            <ScoreBadge score={hotel.guestScore} reviewCount={hotel.reviewCount} />
            <ShareSave title={hotel.name} />
          </div>
        </div>
      </Container>

      <Container>
        <MediaGallery images={hotel.gallery} label={hotel.name} priority />
      </Container>

      <Container>
        <HotelSectionNav />
      </Container>

      <Container className="pt-12 pb-28 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="min-w-0 lg:col-span-8">
            <section id="overview" className="scroll-mt-36">
              <h2 className="type-h2">About this property</h2>
              <p className="type-body-lg mt-5 text-body">{hotel.summary}</p>
              <div className="mt-5 space-y-5">
                {hotel.description.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="type-body text-body">
                    {paragraph}
                  </p>
                ))}
              </div>

              <ul className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {hotel.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <Check size={17} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
                    <span className="type-body-sm text-body">{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="amenities" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">Facilities</h2>
              <div className="mt-8">
                <HotelAmenities amenities={hotel.amenities} />
              </div>
            </section>

            <section id="location" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">Location</h2>
              <p className="type-body mt-4 flex items-center gap-2 text-body">
                <MapPin size={16} className="shrink-0 text-brand-text" aria-hidden />
                {hotel.address}
              </p>

              {/* Deliberately not a live map — this prototype integrates no map service. */}
              <div className="mt-6 flex items-center justify-center rounded-sm border border-dashed border-line bg-surface-earth/50 px-6 py-14 text-center">
                <div>
                  <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-background text-brand-text">
                    <Navigation size={18} aria-hidden />
                  </span>
                  <p className="type-body-sm mt-4 text-muted">
                    Interactive map not included in this prototype.
                  </p>
                </div>
              </div>

              <h3 className="type-h4 mt-10">What&apos;s nearby</h3>
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {hotel.nearby.map((place) => (
                  <div key={place.name} className="flex items-baseline justify-between gap-6 py-3.5">
                    <dt className="type-body-sm text-body">
                      {place.name}
                      <span className="type-caption ml-2 text-subtle">{place.type}</span>
                    </dt>
                    <dd className="type-body-sm shrink-0 font-medium tabular-nums">
                      {place.distance}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="rooms" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">Rooms</h2>
              <p className="type-body mt-3 text-muted">
                {hotel.rooms.length} room types available. Rates are indicative and include taxes.
              </p>
              <div className="mt-8 flex flex-col gap-5">
                {hotel.rooms.map((room) => (
                  <HotelRoomCard key={room.id} room={room} hotelName={hotel.name} />
                ))}
              </div>
            </section>

            <section id="reviews" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">Guest reviews</h2>
              <div className="mt-8">
                <HotelReviews
                  guestScore={hotel.guestScore}
                  reviewCount={hotel.reviewCount}
                  categoryScores={hotel.categoryScores}
                  reviews={hotel.reviews}
                />
              </div>
            </section>

            <section id="policies" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">Policies</h2>
              <div className="mt-8">
                <HotelPolicies policies={hotel.policies} />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-36">
              <BookingSummary hotel={hotel} />
            </div>
          </aside>
        </div>
      </Container>

      {/* Mobile booking bar — the pattern travellers expect on a phone. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <p>
            <span className="type-caption block text-muted">From</span>
            <span className="type-h4">
              {formatPrice(hotel.priceFrom)}
              <span className="type-caption font-normal text-muted"> / night</span>
            </span>
          </p>
          <Link
            href="#rooms"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-brand px-6 text-[0.9375rem] font-medium text-on-dark transition-colors hover:bg-brand-hover"
          >
            See rooms
          </Link>
        </div>
      </div>

      <section className="border-t border-line bg-surface-earth/50 py-20 pb-32 lg:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Other properties"
              title="You might also consider"
              action={{ label: "All hotels", href: "/hotels" }}
            />
          </Reveal>
          <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <HotelCard key={item.id} hotel={item} />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
