import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { Destination } from "@/types";
import { cn } from "@/lib/utils";

interface DestinationCardProps {
  destination: Destination;
  /** `tall` is the magazine-cover proportion; `wide` suits editorial rows. */
  ratio?: "tall" | "wide" | "square";
  /**
   * Fills the grid row instead of holding the aspect ratio, so a lead card can
   * match the height of a taller stack beside it. The ratio still applies below
   * `lg`, where the card is on its own row and has no sibling to match.
   */
  stretch?: boolean;
  className?: string;
  priority?: boolean;
}

const ratios = {
  tall: "aspect-3/4",
  wide: "aspect-16/10",
  square: "aspect-square",
} as const;

/**
 * Photography-led destination cover. Type sits inside the image under a scrim
 * so these read like magazine covers rather than a repeated card grid.
 */
export function DestinationCard({
  destination,
  ratio = "tall",
  stretch,
  className,
  priority,
}: DestinationCardProps) {
  return (
    <article className={cn("group", stretch && "h-full", className)}>
      <Link
        href={`/destinations/${destination.slug}`}
        className={cn("block focus-visible:outline-offset-4", stretch && "h-full")}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-sm bg-ink",
            ratios[ratio],
            stretch && "lg:aspect-auto lg:h-full",
          )}
        >
          <Image
            src={ratio === "tall" ? destination.coverImage : destination.heroImage}
            alt={destination.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 30vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.05]"
          />
          <div className="scrim-bottom absolute inset-0" aria-hidden />

          <div className="absolute inset-x-0 bottom-0 p-6 lg:p-7">
            <p className="type-eyebrow text-on-dark/60">{destination.region}</p>
            <div className="mt-2.5 flex items-start justify-between gap-4">
              <h3 className="type-h3 text-on-dark">{destination.name}</h3>
              <ArrowUpRight
                size={20}
                className="mt-1 shrink-0 text-on-dark/50 transition-all duration-300 ease-(--ease-out-soft) group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-on-dark"
                aria-hidden
              />
            </div>
            <p className="type-body-sm mt-2 text-on-dark/70 line-clamp-2">{destination.tagline}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}
