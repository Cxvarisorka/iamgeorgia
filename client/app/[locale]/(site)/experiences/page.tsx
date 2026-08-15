import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";

import { ExperienceExplorer } from "@/components/experiences/ExperienceExplorer";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/PageHero";
import { getI18n } from "@/lib/i18n/server";
import { Rating } from "@/components/ui/Rating";
import { experiences, featuredExperiences } from "@/data/experiences";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.experiences.metaTitle, description: t.experiences.metaDescription };
}

export default async function ExperiencesPage() {
  const { t } = await getI18n();
  const [spotlight] = featuredExperiences;

  return (
    <>
      <PageHero
        eyebrow={t.experiences.heroEyebrow}
        title={t.experiences.heroTitle}
        description={t.experiences.heroDescription}
        image="/images/experiences/supra.jpg"
        imageAlt={t.experiences.heroImageAlt}
      />

      {/* Editorial spotlight: full-bleed image opposite a column of type. */}
      <section className="border-b border-line">
        <div className="grid lg:grid-cols-2">
          <Reveal variant="fade" className="relative min-h-72 lg:min-h-[38rem]">
            <Image
              src={spotlight.image}
              alt={spotlight.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </Reveal>

          <div className="flex items-center px-5 py-16 sm:px-8 lg:px-16 lg:py-24">
            <Reveal className="max-w-xl">
              <p className="type-eyebrow text-brand-text">Most requested</p>
              <h2 className="type-h1 mt-5 text-balance">{spotlight.title}</h2>
              <p className="type-body-lg mt-6 text-body">{spotlight.summary}</p>

              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                <div>
                  <dt className="type-caption flex items-center gap-1.5 text-muted">
                    <Clock size={13} aria-hidden />
                    Duration
                  </dt>
                  <dd className="type-h4 mt-1.5">{spotlight.duration}</dd>
                </div>
                <div>
                  <dt className="type-caption flex items-center gap-1.5 text-muted">
                    <Users size={13} aria-hidden />
                    Group
                  </dt>
                  <dd className="type-h4 mt-1.5">{spotlight.groupSize}</dd>
                </div>
                <div>
                  <dt className="type-caption text-muted">From</dt>
                  <dd className="type-h4 mt-1.5">{formatPrice(spotlight.price)}</dd>
                </div>
              </dl>

              <div className="mt-8 flex items-center gap-6">
                <Rating value={spotlight.rating} reviewCount={spotlight.reviewCount} size="md" />
              </div>

              <Link
                href={`/experiences/${spotlight.slug}`}
                className="group mt-9 inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-brand-text"
              >
                See this experience
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 ease-(--ease-out-soft) group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <ExperienceExplorer experiences={experiences} />
    </>
  );
}
