import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock, MapPin, Users } from "lucide-react";

import { ExperienceBookingCard } from "@/components/experiences/ExperienceBookingCard";
import { ExperienceCard } from "@/components/experiences/ExperienceCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { PageHero } from "@/components/ui/PageHero";
import { Rating } from "@/components/ui/Rating";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { experiences, getExperienceBySlug } from "@/data/experiences";
import { formatPrice, relatedBySlug } from "@/lib/utils";

export function generateStaticParams() {
  return experiences.map((experience) => ({ slug: experience.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[locale]/experiences/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const experience = getExperienceBySlug(slug);
  if (!experience) return { title: "Experience not found" };

  return {
    title: experience.title,
    description: experience.summary,
    openGraph: {
      title: experience.title,
      description: experience.summary,
      images: [{ url: experience.image }],
    },
  };
}

export default async function ExperienceDetailPage(props: PageProps<"/[locale]/experiences/[slug]">) {
  const { slug } = await props.params;
  const experience = getExperienceBySlug(slug);
  if (!experience) notFound();

  const related = relatedBySlug(experiences, experience.slug, 3);

  const facts = [
    { icon: Clock, label: "Duration", value: experience.duration },
    { icon: Users, label: "Group size", value: experience.groupSize },
    { icon: MapPin, label: "Location", value: experience.location },
    { icon: null, label: "From", value: `${formatPrice(experience.price)} pp` },
  ];

  return (
    <>
      <PageHero
        size="tall"
        eyebrow={experience.category}
        title={experience.title}
        description={experience.summary}
        image={experience.image}
        imageAlt={experience.title}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Experiences", href: "/experiences" },
          { label: experience.title },
        ]}
      />

      <Container className="pt-16 pb-24 lg:pt-20 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-7 xl:col-span-8">
            <div className="flex items-center gap-4">
              <Rating value={experience.rating} reviewCount={experience.reviewCount} size="md" />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-6 border-y border-line py-7 sm:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="type-caption flex items-center gap-1.5 text-muted">
                    {fact.icon && <fact.icon size={14} aria-hidden />}
                    {fact.label}
                  </dt>
                  <dd className="type-h4 mt-2">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <section className="pt-12">
              <h2 className="type-h2">The experience</h2>
              <div className="mt-6 space-y-5">
                {experience.description.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="type-body-lg text-body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <section className="pt-14">
              <MediaGallery images={experience.gallery} label={experience.title} />
            </section>

            <section className="pt-14">
              <h2 className="type-h3">Highlights</h2>
              <ul className="mt-6 grid gap-3.5 sm:grid-cols-2">
                {experience.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <Check size={17} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
                    <span className="type-body-sm text-body">{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pt-14">
              <h2 className="type-h3">What to expect</h2>
              <ol className="mt-8 space-y-8">
                {experience.whatToExpect.map((step, index) => (
                  <li key={step.title} className="flex gap-6">
                    <span className="type-caption shrink-0 pt-1 text-subtle tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="type-h4">{step.title}</h3>
                      <p className="type-body mt-2.5 text-muted">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-14 rounded-sm bg-surface-soft/70 p-7 lg:p-8">
              <h2 className="type-h3">What&apos;s included</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {experience.included.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
                    <span className="type-body-sm text-body">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-28">
              <ExperienceBookingCard experience={experience} />
            </div>
          </aside>
        </div>
      </Container>

      {related.length > 0 && (
        <section className="border-t border-line bg-surface-earth/60 py-20 lg:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="More to do"
                title="Other experiences"
                action={{ label: "All experiences", href: "/experiences" }}
              />
            </Reveal>
            <RevealGroup className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <RevealItem key={item.id}>
                  <ExperienceCard experience={item} />
                </RevealItem>
              ))}
            </RevealGroup>
          </Container>
        </section>
      )}
    </>
  );
}
