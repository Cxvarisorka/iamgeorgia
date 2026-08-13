import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/Reveal";
import type { Destination } from "@/types";
import { cn } from "@/lib/utils";

interface DestinationFeatureProps {
  destination: Destination;
  /** Alternates the image between sides down the page. */
  flip?: boolean;
  index: number;
}

/**
 * Editorial row for the destinations index — a large photograph opposite a
 * column of type, alternating sides. Deliberately not a card.
 */
export function DestinationFeature({ destination, flip, index }: DestinationFeatureProps) {
  return (
    <article className="group grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
      <Reveal
        variant="fade"
        className={cn("lg:col-span-7", flip && "lg:order-2 lg:col-start-6")}
      >
        <Link
          href={`/destinations/${destination.slug}`}
          tabIndex={-1}
          aria-hidden
          className="relative block aspect-4/3 overflow-hidden rounded-sm bg-line lg:aspect-16/11"
        >
          <Image
            src={destination.heroImage}
            alt=""
            fill
            priority={index === 0}
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.03]"
          />
        </Link>
      </Reveal>

      <Reveal className={cn("lg:col-span-5", flip && "lg:order-1 lg:col-start-1 lg:row-start-1")}>
        <p className="type-caption text-subtle tabular-nums">
          {String(index + 1).padStart(2, "0")} — {destination.region}
        </p>

        <h2 className="type-h1 mt-4">
          <Link href={`/destinations/${destination.slug}`} className="focus-visible:outline-offset-6">
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 ease-(--ease-out-soft) group-hover:bg-[length:100%_1px]">
              {destination.name}
            </span>
          </Link>
        </h2>

        <p className="font-display mt-5 text-xl leading-snug text-body italic">
          {destination.tagline}
        </p>

        <p className="type-body mt-5 text-muted">{destination.summary}</p>

        <ul className="mt-7 flex flex-wrap gap-2">
          {destination.idealFor.map((item) => (
            <li
              key={item}
              className="type-caption rounded-full border border-line px-3 py-1 text-body"
            >
              {item}
            </li>
          ))}
        </ul>

        <Link
          href={`/destinations/${destination.slug}`}
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-brand-text"
        >
          Explore {destination.name}
          <ArrowRight
            size={16}
            className="transition-transform duration-200 ease-(--ease-out-soft) group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      </Reveal>
    </article>
  );
}
