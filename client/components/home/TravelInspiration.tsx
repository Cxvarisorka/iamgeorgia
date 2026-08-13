import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getI18n } from "@/lib/i18n/server";

/**
 * Only the non-translatable half of each card lives here — the image and the
 * link target. Tag, title, excerpt and alt text come from the dictionary and
 * are matched by position, so the three entries must stay in the same order
 * as `home.journal.items`.
 */
const articles = [
  { image: "/images/home/inspiration-1.jpg", href: "/destinations" },
  { image: "/images/home/inspiration-2.jpg", href: "/destinations/svaneti" },
  { image: "/images/home/inspiration-3.jpg", href: "/experiences/georgian-wine-tasting" },
];

/** Editorial mosaic — no prices, no ratings, just reading. */
export async function TravelInspiration() {
  const { t, path } = await getI18n();
  const items = t.home.journal.items;

  return (
    <section className="pb-24 lg:pb-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={t.home.journal.eyebrow}
            title={t.home.journal.title}
            description={t.home.journal.description}
          />
        </Reveal>

        <RevealGroup className="mt-14 grid gap-10 md:grid-cols-3 lg:gap-12">
          {articles.map((article, index) => {
            const copy = items[index];
            return (
              <RevealItem key={article.href}>
                <article className="group">
                  <Link href={path(article.href)} className="block focus-visible:outline-offset-8">
                    <div className="relative aspect-16/11 overflow-hidden rounded-sm bg-line">
                      <Image
                        src={article.image}
                        alt={copy.alt}
                        fill
                        sizes="(max-width: 768px) 90vw, 30vw"
                        className="object-cover transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.04]"
                      />
                    </div>
                    <p className="type-eyebrow mt-5 text-brand-text">{copy.tag}</p>
                    <h3 className="type-h3 mt-3 flex items-start justify-between gap-3">
                      {copy.title}
                      <ArrowUpRight
                        size={18}
                        className="mt-1.5 shrink-0 text-subtle transition-all duration-300 ease-(--ease-out-soft) group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-text rtl:-scale-x-100"
                        aria-hidden
                      />
                    </h3>
                    <p className="type-body-sm mt-3 text-muted">{copy.excerpt}</p>
                  </Link>
                </article>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </Container>
    </section>
  );
}
