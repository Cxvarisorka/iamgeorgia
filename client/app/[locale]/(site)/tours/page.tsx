import type { Metadata } from "next";

import { Reveal } from "@/components/motion/Reveal";
import { TourCard } from "@/components/tours/TourCard";
import { TourExplorer } from "@/components/tours/TourExplorer";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { getI18n } from "@/lib/i18n/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { featuredTours, isB2C, localisedTours } from "@/data/tours";
import { getSession } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.tours.metaTitle, description: t.tours.metaDescription };
}

export default async function ToursPage() {
  const { t, locale } = await getI18n();
  // The channel: partners and staff see the whole programme, anonymous
  // visitors only what has been switched on for B2C.
  const trade = Boolean(await getSession());
  const tours = localisedTours(locale).filter((tour) => trade || isB2C(tour.slug));
  // Regions come off the translated records, so the filter reads in the same
  // language as the cards it filters.
  const regions = [...new Set(tours.map((tour) => tour.location))].sort();
  const [spotlight] = featuredTours(locale).filter((tour) => trade || isB2C(tour.slug));

  return (
    <>
      <PageHero
        eyebrow={t.tours.heroEyebrow}
        title={t.tours.heroTitle}
        description={t.tours.heroDescription}
        image="/images/tours/chaukhi.jpg"
        imageAlt={t.tours.heroImageAlt}
      />

      <section className="border-b border-line py-16 lg:py-20">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t.tours.spotlightEyebrow}
              title={t.tours.spotlightTitle}
              description={t.tours.spotlightDescription}
            />
          </Reveal>
          <Reveal className="mt-12">
            <TourCard tour={spotlight} variant="feature" />
          </Reveal>
        </Container>
      </section>

      <TourExplorer tours={tours} regions={regions} />
    </>
  );
}
