import { unstable_rethrow } from "next/navigation";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { TourCard } from "@/components/tours/TourCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listPublicTours } from "@/lib/api/tours";
import { getI18n } from "@/lib/i18n/server";
import type { TourSummary } from "@/types/tour";

/**
 * The homepage's tour rail, from the live catalogue.
 *
 * Featured journeys first, topped up from the rest of the programme when
 * fewer than three are flagged. Guarded: the homepage must not fall over
 * because one rail could not load — an empty rail simply renders nothing.
 *
 * `unstable_rethrow` first, because the catch must not swallow Next's own
 * signals: reading the session cookie inside a prerender throws an internal
 * "dynamic usage" error that tells the framework to render on demand, and
 * catching it would leave a static home page with no rail at all.
 */
export async function SignatureTours() {
  const { t, path, locale } = await getI18n();

  let tours: TourSummary[] = [];

  try {
    const { data: featured } = await listPublicTours({ featured: true, locale, pageSize: 3 });
    tours = featured;

    if (tours.length < 3) {
      const { data: rest } = await listPublicTours({ locale, pageSize: 6 });
      const seen = new Set(tours.map((tour) => tour.id));
      tours = [...tours, ...rest.filter((tour) => !seen.has(tour.id))].slice(0, 3);
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("Signature tours failed:", error);
  }

  const [lead, ...rest] = tours;
  if (!lead) return null;

  return (
    <section className="py-24 lg:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t.home.tours.eyebrow}
            title={t.home.tours.title}
            description={t.home.tours.description}
            action={{ label: t.actions.allTours, href: path("/tours") }}
          />
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-7">
            <TourCard tour={lead} variant="feature" />
          </Reveal>

          <RevealGroup className="grid gap-10 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            {rest.slice(0, 2).map((tour) => (
              <RevealItem key={tour.id}>
                <TourCard tour={tour} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </Container>
    </section>
  );
}
