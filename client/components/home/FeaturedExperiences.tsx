import { ExperienceCard } from "@/components/experiences/ExperienceCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { featuredExperiences } from "@/data/experiences";
import { getI18n } from "@/lib/i18n/server";

/** Tall covers on a staggered baseline — a different shape to the tour grid. */
export async function FeaturedExperiences() {
  const { t, path } = await getI18n();
  return (
    <section className="py-24 lg:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t.home.experiences.eyebrow}
            title={t.home.experiences.title}
            description={t.home.experiences.description}
            action={{ label: t.actions.allExperiences, href: path("/experiences") }}
          />
        </Reveal>

        <RevealGroup className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {featuredExperiences.slice(0, 3).map((experience, index) => (
            <RevealItem
              key={experience.id}
              className={index === 1 ? "lg:mt-16" : index === 2 ? "lg:mt-8" : undefined}
            >
              <ExperienceCard experience={experience} />
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </section>
  );
}
