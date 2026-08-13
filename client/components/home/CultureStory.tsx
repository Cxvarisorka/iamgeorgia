import Image from "next/image";

import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { getI18n } from "@/lib/i18n/server";

/**
 * The image-heavy beat of the page. Dark, full-bleed and quiet, sitting between
 * two card sections so the rhythm does not flatten out.
 */
export async function CultureStory() {
  const { t, path } = await getI18n();
  const c = t.home.culture;

  return (
    <section className="bg-ink text-on-dark">
      <div className="grid lg:grid-cols-2">
        <Reveal variant="fade" className="relative min-h-80 lg:min-h-[42rem]">
          <Image
            src="/images/home/story.jpg"
            alt={c.storyImageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </Reveal>

        <div className="flex items-center px-5 py-20 sm:px-8 lg:px-16 lg:py-28">
          <Reveal className="max-w-xl">
            <p className="type-eyebrow text-on-dark/50">{c.eyebrow}</p>
            <h2 className="type-h2 mt-6 text-on-dark text-balance">{c.title}</h2>
            <div className="mt-8 space-y-5 text-on-dark/70">
              <p className="type-body">{c.body1}</p>
              <p className="type-body">{c.body2}</p>
            </div>

            <blockquote className="mt-10 border-s-2 border-brand ps-6">
              <p className="font-display text-xl leading-snug text-on-dark/90 italic">
                &ldquo;{c.quote}&rdquo;
              </p>
              <footer className="type-caption mt-3 text-on-dark/45">{c.quoteAttribution}</footer>
            </blockquote>

            <div className="mt-10">
              <Button href={path("/experiences")} variant="outlineLight">
                {t.actions.exploreExperiences}
              </Button>
            </div>
          </Reveal>
        </div>
      </div>

      {/* A thin strip of food and craft imagery to close the section. Near
          full-bleed rather than inset in a container, so it spans the viewport
          instead of leaving dead margin either side.

          Uniform padding all round rather than only a top margin: it separates
          the strip from the story image above, and keeps the first and last
          frames off the viewport edge where they were being clipped.

          3:2 matches the source photography (1800x1200) — the square crop this
          replaced threw away a third of the width of every landscape shot. */}
      <Reveal className="grid grid-cols-2 gap-2 p-2 lg:grid-cols-4 lg:gap-3 lg:p-3">
        {[
            { src: "/images/culture/khachapuri.jpg", alt: c.strip.khachapuri },
            { src: "/images/culture/wine.jpg", alt: c.strip.wine },
            { src: "/images/culture/dance.jpg", alt: c.strip.dance },
          { src: "/images/culture/craft.jpg", alt: c.strip.craft },
        ].map((image) => (
          <div key={image.src} className="relative aspect-3/2 overflow-hidden">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
        ))}
      </Reveal>
    </section>
  );
}
