import { HotelListItem } from "@/components/hotels/HotelListItem";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { featuredHotels } from "@/data/hotels";
import { getI18n } from "@/lib/i18n/server";

/** Full-width comparison rows, previewing how the hotels index behaves. */
export async function FeaturedHotels() {
  const { t, path } = await getI18n();
  return (
    <section className="bg-surface-earth py-24 lg:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t.home.hotels.eyebrow}
            title={t.home.hotels.title}
            description={t.home.hotels.description}
            action={{ label: t.actions.allHotels, href: path("/hotels") }}
          />
        </Reveal>

        <RevealGroup className="mt-14 flex flex-col gap-5">
          {featuredHotels.map((hotel) => (
            <RevealItem key={hotel.id}>
              <HotelListItem hotel={hotel} />
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </section>
  );
}
