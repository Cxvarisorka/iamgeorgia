import type { Metadata } from "next";
import Image from "next/image";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { credentials, site } from "@/constants/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "I'am Georgia is a travel studio in Tbilisi designing private journeys across the Caucasus, run by Georgian guides, drivers and winemakers.",
};

const values = [
  {
    title: "Local first, always",
    description:
      "Every guide, driver and cook we work with is Georgian and lives in the region they take you through. It is the only way the stories are first-hand.",
  },
  {
    title: "We say no",
    description:
      "If a place is wrong for you, we will tell you — even when it is the thing everyone else is selling. Twelve people on a Tusheti road is not a holiday.",
  },
  {
    title: "Nothing is commissioned",
    description:
      "No hotel or winery pays to be in an itinerary. Our recommendations are worth exactly as much as our independence.",
  },
  {
    title: "Leave it as we found it",
    description:
      "Small groups, local guesthouses, and money that stays in the valleys we visit. Mountains do not recover quickly from being popular.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        size="tall"
        eyebrow={`Since ${site.founded}`}
        title="We are the people who kept telling you to visit"
        description="A travel studio in Tbilisi, run by Georgians, for travellers who want more than the highlights."
        image="/images/about/heritage.jpg"
        imageAlt="A Georgian church standing on mountain pasture"
      />

      <section className="py-24 lg:py-32">
        <Container>
          <Reveal className="max-w-4xl">
            <p className="type-eyebrow text-brand-text">How it started</p>
            <p className="type-h1 mt-8 text-balance">
              It began because a friend from Berlin asked what there was to do in Georgia, and
              the honest answer took four hours.
            </p>
            <div className="mt-10 max-w-2xl space-y-5">
              <p className="type-body-lg text-body">
                In 2014 there were two of us: a mountain guide from Kazbegi and a former
                journalist who could not stop writing itineraries for visiting friends. We had no
                office, one second-hand Delica, and a conviction that the country was being
                undersold by everyone trying to sell it.
              </p>
              <p className="type-body-lg text-body">
                Eleven years later there are thirty-eight of us. We still argue about routes. We
                still take people to the same family in Kakheti, who now expect us in September
                and are offended if we are late.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-ink text-on-dark">
        <div className="grid lg:grid-cols-2">
          <div className="flex items-center px-5 py-20 sm:px-8 lg:px-16 lg:py-28">
            <Reveal className="max-w-xl">
              <p className="type-eyebrow text-on-dark/50">Why Georgia</p>
              <h2 className="type-h2 mt-6 text-on-dark text-balance">
                Three climate zones, five hours apart
              </h2>
              <div className="mt-8 space-y-5 text-on-dark/70">
                <p className="type-body">
                  You can start the day on a Black Sea beach in Batumi and finish it at 2,200
                  metres in a village of stone towers where the language split from Georgian four
                  thousand years ago. Very few countries this size can do that.
                </p>
                <p className="type-body">
                  Then there is the wine — eight thousand years of it, fermented in clay buried
                  in the ground, a method UNESCO protects and Georgians simply call Tuesday.
                </p>
                <p className="type-body">
                  And there is the table. Georgian hospitality is not a service standard. It is a
                  structural feature of the culture, and it will exhaust you in the best way.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal variant="fade" className="relative min-h-80 lg:min-h-[40rem]">
            <Image
              src="/images/about/landscape.jpg"
              alt="Fog lying across the hills of the Khada gorge"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </Reveal>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            {/* Same pinned-intro treatment as the home page's "Why travel with
                us": identical two-column layout, so it should behave identically. */}
            <div className="lg:col-span-5 lg:sticky lg:top-32 lg:self-start">
              <Reveal>
                <p className="type-eyebrow text-brand-text">What we hold to</p>
                <h2 className="type-h2 mt-6 text-balance">Four things we do not compromise on</h2>
              </Reveal>
            </div>

            <RevealGroup className="lg:col-span-7">
              <ol className="divide-y divide-line border-t border-line">
                {values.map((value, index) => (
                  <RevealItem key={value.title}>
                    <li className="flex gap-6 py-7 lg:gap-10">
                      <span className="type-caption pt-1 text-subtle tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="type-h4">{value.title}</h3>
                        <p className="type-body mt-2.5 max-w-xl text-muted">{value.description}</p>
                      </div>
                    </li>
                  </RevealItem>
                ))}
              </ol>
            </RevealGroup>
          </div>
        </Container>
      </section>

      <section className="bg-surface-earth py-24 lg:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The people"
              title="Thirty-eight guides, drivers, cooks and one very patient office"
              description="Our guides are climbers, sommeliers, archaeologists and shepherds' children. Several are all four."
            />
          </Reveal>

          <Reveal className="mt-14 grid gap-4 sm:grid-cols-3">
            {[
              { src: "/images/about/team.jpg", alt: "Guides walking a mountain trail" },
              { src: "/images/culture/shepherd.jpg", alt: "A shepherd moving a flock in the highlands" },
              { src: "/images/experiences/polyphony.jpg", alt: "A Georgian polyphonic ensemble" },
            ].map((image) => (
              <div key={image.src} className="relative aspect-4/5 overflow-hidden rounded-sm">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 640px) 90vw, 30vw"
                  className="object-cover"
                />
              </div>
            ))}
          </Reveal>

          <Reveal className="mt-16">
            <dl className="grid grid-cols-2 gap-y-10 border-t border-line pt-12 lg:grid-cols-4">
              {credentials.map((item) => (
                <div key={item.label}>
                  <dt className="type-h2 tabular-nums">{item.value}</dt>
                  <dd className="type-body-sm mt-2 text-muted">{item.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </Container>
      </section>

      <section className="py-24 lg:py-28">
        <Container>
          <Reveal className="max-w-2xl">
            <h2 className="type-h2 text-balance">
              Come and argue with us about where you should go.
            </h2>
            <p className="type-body-lg mt-6 text-body">
              Tell us how long you have, what you like eating and whether you would rather walk
              or be driven. We will send back a route.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="/contact" size="lg">
                Plan your trip
              </Button>
              <Button href="/tours" size="lg" variant="outline">
                Browse our tours
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
