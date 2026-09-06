import { HotelCard } from "@/components/hotels/HotelCard";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listPublicHotels } from "@/lib/api/search";
import { getI18n } from "@/lib/i18n/server";
import { adaptHotelSummary } from "@/lib/site/hotelAdapter";

interface RelatedHotelsProps {
  /** Same place first; omitted for a property with no destination. */
  destinationSlug?: string;
  /** The property being viewed, which must not appear in its own rail. */
  excludeSlug: string;
}

/**
 * Other properties the viewer may actually buy. The API applies the channel,
 * so a B2B-only neighbour never appears here either.
 *
 * Its own component, and its own fetch, because the query depends on the
 * destination of a hotel that is not known until the page's own call has
 * returned — a second round-trip that cannot be parallelised away. Awaited
 * inline it held the entire document, gallery and all, behind a rail at the
 * very bottom of the page; behind a Suspense boundary the property ships
 * first and this arrives when it arrives.
 *
 * Guarded, because the rail is a suggestion and not the page: a visitor must
 * not lose the property because a second query fell over. An empty list simply
 * renders no rail.
 */
export async function RelatedHotels({ destinationSlug, excludeSlug }: RelatedHotelsProps) {
  const { t, path } = await getI18n();

  let related: ReturnType<typeof adaptHotelSummary>[] = [];

  try {
    const { data: others } = await listPublicHotels({ destinationSlug, pageSize: 4 });
    related = others
      .filter((candidate) => candidate.slug !== excludeSlug)
      .slice(0, 3)
      .map(adaptHotelSummary);
  } catch (error) {
    console.error("Related properties failed:", error);
  }

  if (related.length === 0) return null;

  return (
    <section className="border-t border-line bg-surface-earth/50 py-20 pb-32 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t.hotels.relatedEyebrow}
            title={t.hotels.relatedTitle}
            action={{ label: t.actions.allHotels, href: path("/hotels") }}
          />
        </Reveal>
        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <HotelCard key={item.id} hotel={item} />
          ))}
        </div>
      </Container>
    </section>
  );
}
