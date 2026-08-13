import Image from "next/image";
import Link from "next/link";
import { Clock, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import type { Tour } from "@/types";
import { cn, formatPrice } from "@/lib/utils";

interface TourCardProps {
  tour: Tour;
  /** `feature` gives the card a wider image and larger type. */
  variant?: "default" | "feature";
  className?: string;
  priority?: boolean;
}

export function TourCard({ tour, variant = "default", className, priority }: TourCardProps) {
  const isFeature = variant === "feature";

  return (
    <article className={cn("group", className)}>
      <Link href={`/tours/${tour.slug}`} className="block focus-visible:outline-offset-8">
        <div
          className={cn(
            "relative overflow-hidden rounded-sm bg-line",
            isFeature ? "aspect-4/3 lg:aspect-16/10" : "aspect-4/3",
          )}
        >
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            priority={priority}
            sizes={isFeature ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className="object-cover transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.04]"
          />
          <div className="absolute top-4 left-4">
            <Badge tone="light">{tour.category}</Badge>
          </div>
        </div>

        <div className={cn("pt-5", isFeature && "lg:pt-7")}>
          <p className="type-eyebrow text-muted">{tour.location}</p>
          <h3 className={cn("mt-3", isFeature ? "type-h2" : "type-h3")}>
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-400 ease-(--ease-out-soft) group-hover:bg-[length:100%_1px]">
              {tour.title}
            </span>
          </h3>
          <p className={cn("mt-3 text-muted line-clamp-2", isFeature ? "type-body-lg" : "type-body-sm")}>
            {tour.summary}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted">
            <span className="flex items-center gap-1.5 type-caption">
              <Clock size={14} aria-hidden />
              {tour.durationLabel}
            </span>
            <span className="flex items-center gap-1.5 type-caption">
              <Users size={14} aria-hidden />
              {tour.groupSize}
            </span>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
            <Rating value={tour.rating} reviewCount={tour.reviewCount} />
            <p className="text-right">
              <span className="type-caption block text-muted">From</span>
              <span className="type-h4 text-ink">{formatPrice(tour.priceFrom)}</span>
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
