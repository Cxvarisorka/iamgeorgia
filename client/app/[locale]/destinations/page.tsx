import type { Metadata } from "next";

import { DestinationCard } from "@/components/destinations/DestinationCard";
import { DestinationFeature } from "@/components/destinations/DestinationFeature";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { getI18n } from "@/lib/i18n/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { destinations } from "@/data/destinations";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.destinations.metaTitle, description: t.destinations.metaDescription };
}

export default async function DestinationsPage() {
  const { t } = await getI18n();
  const featured = destinations.filter((destination) => destination.featured);
  const rest = destinations.filter((destination) => !destination.featured);

  return (
    <>
      <PageHero
        eyebrow={t.destinations.heroEyebrow}
        title={t.destinations.heroTitle}
        description={t.destinations.heroDescription}
        image="/images/destinations/svaneti-1.jpg"
        imageAlt={t.destinations.heroImageAlt}
      />

      <section className="py-20 lg:py-28">
        <Container>
          <div className="flex flex-col gap-24 lg:gap-36">
            {featured.map((destination, index) => (
              <DestinationFeature
                key={destination.id}
                destination={destination}
                index={index}
                flip={index % 2 === 1}
              />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-20 lg:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Also worth your time"
              title="Four more places to build a trip around"
              description="Shorter stops, and the regions that reward a second visit to Georgia."
            />
          </Reveal>

          <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {rest.map((destination) => (
              <RevealItem key={destination.id}>
                <DestinationCard destination={destination} ratio="tall" />
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>
    </>
  );
}
