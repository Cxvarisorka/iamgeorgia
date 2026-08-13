import { DestinationCard } from "@/components/destinations/DestinationCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { destinations } from "@/data/destinations";
import { getI18n } from "@/lib/i18n/server";

/**
 * Editorial composition rather than a uniform grid: a tall lead cover beside a
 * stacked pair, so the section reads like a magazine spread.
 */
export async function PopularDestinations() {
  const { t, path } = await getI18n();
  const [lead, ...rest] = destinations.filter((destination) => destination.featured);
  const stacked = rest.slice(0, 2);

  // Everything the editorial trio does not use closes the section as a rail.
  // Deriving it by exclusion means no destination is silently dropped when the
  // featured flags change — previously a fourth featured entry appeared nowhere.
  const shown = new Set([lead, ...stacked].map((destination) => destination.id));
  const rail = destinations.filter((destination) => !shown.has(destination.id));

  return (
    <section className="bg-surface-earth py-24 lg:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t.home.destinations.eyebrow}
            title={t.home.destinations.title}
            description={t.home.destinations.description}
            action={{ label: t.actions.allDestinations, href: path("/destinations") }}
          />
        </Reveal>

        {/* The lead stretches to the row height rather than holding 16:10, so it
            ends flush with the stacked pair instead of leaving a gap beneath. */}
        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-7">
            <DestinationCard destination={lead} ratio="wide" stretch />
          </Reveal>

          <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-8">
            {stacked.map((destination) => (
              <RevealItem key={destination.id}>
                <DestinationCard destination={destination} ratio="wide" />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* Remaining destinations as a horizontal rail — a different rhythm again.
            `grid-flow-col` + `auto-cols-fr` gives one equal column per card, so the
            row always spans the full width whatever the destination count. */}
        <RevealGroup className="scrollbar-none mt-6 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 lg:mt-8 lg:grid lg:auto-cols-fr lg:grid-flow-col lg:gap-8 lg:overflow-visible lg:pb-0">
          {rail.map((destination) => (
            <RevealItem
              key={destination.id}
              className="w-64 shrink-0 snap-start lg:w-auto lg:shrink"
            >
              <DestinationCard destination={destination} ratio="tall" />
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </section>
  );
}
