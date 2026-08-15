import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { TourCard } from "@/components/tours/TourCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { featuredTours } from "@/data/tours";
import { getI18n } from "@/lib/i18n/server";

export async function SignatureTours() {
  const { t, path, locale } = await getI18n();
  const [lead, ...rest] = featuredTours(locale);

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
