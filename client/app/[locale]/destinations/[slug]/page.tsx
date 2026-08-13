import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarRange, Car, Languages, Plane } from "lucide-react";

import { DestinationCard } from "@/components/destinations/DestinationCard";
import { ExperienceCard } from "@/components/experiences/ExperienceCard";
import { HotelCard } from "@/components/hotels/HotelCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { TourCard } from "@/components/tours/TourCard";
import { Container } from "@/components/ui/Container";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { destinations, getDestinationBySlug } from "@/data/destinations";
import { getExperiencesByDestination } from "@/data/experiences";
import { getHotelsByDestination } from "@/data/hotels";
import { getToursByDestination } from "@/data/tours";
import { relatedBySlug } from "@/lib/utils";

export function generateStaticParams() {
  return destinations.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[locale]/destinations/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const destination = getDestinationBySlug(slug);
  if (!destination) return { title: "Destination not found" };

  return {
    title: destination.name,
    description: destination.summary,
    openGraph: {
      title: `${destination.name} — ${destination.region}`,
      description: destination.summary,
      images: [{ url: destination.heroImage }],
    },
  };
}

export default async function DestinationDetailPage(props: PageProps<"/[locale]/destinations/[slug]">) {
  const { slug } = await props.params;
  const destination = getDestinationBySlug(slug);
  if (!destination) notFound();

  const tours = getToursByDestination(destination.slug);
  const hotels = getHotelsByDestination(destination.slug);
  const experiences = getExperiencesByDestination(destination.slug);
  const related = relatedBySlug(destinations, destination.slug, 4);

  const travelFacts = [
    { icon: CalendarRange, label: "Best time to visit", value: destination.travelInfo.bestTime },
    { icon: Plane, label: "Getting there", value: destination.travelInfo.gettingThere },
    { icon: Car, label: "Getting around", value: destination.travelInfo.gettingAround },
    { icon: Languages, label: "Language", value: destination.travelInfo.language },
  ];

  return (
    <>
      <PageHero
        size="tall"
        eyebrow={destination.region}
        title={destination.name}
        description={destination.tagline}
        image={destination.heroImage}
        imageAlt={`${destination.name}, Georgia`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Destinations", href: "/destinations" },
          { label: destination.name },
        ]}
      />

      <section className="py-20 lg:py-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-7">
              <h2 className="type-h2 text-balance">About {destination.name}</h2>
              <div className="mt-7 space-y-5">
                {destination.description.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="type-body-lg text-body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal className="lg:col-span-5">
              <div className="border border-line bg-surface p-7 lg:p-8">
                <h3 className="type-eyebrow text-brand-text">Travel information</h3>
                <dl className="mt-6 space-y-6">
                  {travelFacts.map((fact) => (
                    <div key={fact.label}>
                      <dt className="type-caption flex items-center gap-2 text-muted">
                        <fact.icon size={14} aria-hidden />
                        {fact.label}
                      </dt>
                      <dd className="type-body-sm mt-1.5 text-body">{fact.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-7 border-t border-line pt-6">
                  <h3 className="type-caption text-muted">Ideal for</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {destination.idealFor.map((item) => (
                      <li
                        key={item}
                        className="type-caption rounded-full bg-surface-soft px-3 py-1 text-body"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="bg-surface-earth py-20 lg:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="What to see"
              title={`Attractions in ${destination.name}`}
            />
          </Reveal>

          <RevealGroup className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {destination.attractions.map((attraction, index) => (
              <RevealItem key={attraction.name}>
                <div className="flex gap-6 border-t border-line pt-6">
                  <span className="type-caption pt-1 text-muted tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="type-h4">{attraction.name}</h3>
                    <p className="type-body-sm mt-2.5 text-muted">{attraction.description}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>

      <section className="py-20 lg:py-24">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Gallery" title={`${destination.name} in pictures`} />
          </Reveal>
          <Reveal className="mt-12">
            <MediaGallery images={destination.gallery} label={destination.name} />
          </Reveal>
        </Container>
      </section>

      {tours.length > 0 && (
        <section className="border-t border-line py-20 lg:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Journeys"
                title={`Tours in ${destination.name}`}
                action={{ label: "All tours", href: "/tours" }}
              />
            </Reveal>
            <RevealGroup className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {tours.slice(0, 3).map((tour) => (
                <RevealItem key={tour.id}>
                  <TourCard tour={tour} />
                </RevealItem>
              ))}
            </RevealGroup>
          </Container>
        </section>
      )}

      {hotels.length > 0 && (
        <section className="bg-surface-earth py-20 lg:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Where to stay"
                title={`Hotels in ${destination.name}`}
                action={{ label: "All hotels", href: "/hotels" }}
              />
            </Reveal>
            <RevealGroup className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {hotels.slice(0, 3).map((hotel) => (
                <RevealItem key={hotel.id}>
                  <HotelCard hotel={hotel} />
                </RevealItem>
              ))}
            </RevealGroup>
          </Container>
        </section>
      )}

      {experiences.length > 0 && (
        <section className="py-20 lg:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Things to do"
                title={`Experiences in ${destination.name}`}
                action={{ label: "All experiences", href: "/experiences" }}
              />
            </Reveal>
            <RevealGroup className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {experiences.slice(0, 3).map((experience) => (
                <RevealItem key={experience.id}>
                  <ExperienceCard experience={experience} />
                </RevealItem>
              ))}
            </RevealGroup>
          </Container>
        </section>
      )}

      <section className="border-t border-line py-20 lg:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Keep exploring"
              title="Other regions of Georgia"
              action={{ label: "All destinations", href: "/destinations" }}
            />
          </Reveal>
          <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {related.map((item) => (
              <RevealItem key={item.id}>
                <DestinationCard destination={item} ratio="tall" />
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>
    </>
  );
}
