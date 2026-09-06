import { unstable_rethrow } from "next/navigation";

import { Reveal } from "@/components/motion/Reveal";
import { TourCard } from "@/components/tours/TourCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listPublicTours } from "@/lib/api/tours";
import { getI18n } from "@/lib/i18n/server";
import type { TourCategory, TourSummary } from "@/types/tour";

interface RelatedToursProps {
  /** Same place first; omitted for a journey with no destination. */
  destinationSlug?: string;
  /** Fallen back to when the destination turns up nothing else to sell. */
  category: TourCategory;
  /** The journey being viewed, which must not appear in its own rail. */
  excludeSlug: string;
}

/**
 * Other journeys the viewer may actually buy, same place first.
 *
 * Its own component, and its own fetch, because the query depends on the
 * destination of a tour that is not known until the page's own call has
 * returned — a second round-trip that cannot be parallelised away, and
 * sometimes a third when the destination has nothing else on offer. Awaited
 * inline those held the entire document, gallery and all, behind a rail at the
 * very bottom of the page; behind a Suspense boundary the tour ships first.
 *
 * Guarded, because the rail is a suggestion and not the page. `unstable_rethrow`
 * first, so the catch does not swallow Next's own control-flow signals.
 */
export async function RelatedTours({
  destinationSlug,
  category,
  excludeSlug,
}: RelatedToursProps) {
  const { t, path, locale } = await getI18n();

  let related: TourSummary[] = [];

  try {
    const { data: others } = await listPublicTours({ destinationSlug, locale, pageSize: 4 });
    related = others.filter((candidate) => candidate.slug !== excludeSlug).slice(0, 3);

    if (related.length === 0) {
      const { data: byCategory } = await listPublicTours({ category, locale, pageSize: 4 });
      related = byCategory.filter((candidate) => candidate.slug !== excludeSlug).slice(0, 3);
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("Related tours failed:", error);
  }

  if (related.length === 0) return null;

  return (
    <section className="border-t border-line bg-surface-earth/60 py-20 pb-32 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t.tours.relatedEyebrow}
            title={t.tours.relatedTitle}
            action={{ label: t.actions.allTours, href: path("/tours") }}
          />
        </Reveal>
        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <TourCard key={item.id} tour={item} />
          ))}
        </div>
      </Container>
    </section>
  );
}
