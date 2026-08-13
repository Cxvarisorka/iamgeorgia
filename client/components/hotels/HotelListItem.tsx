import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { amenityIcons } from "./amenityIcons";
import { Button } from "@/components/ui/Button";
import { ScoreBadge, Stars } from "@/components/ui/Rating";
import { amenityLabels } from "@/data/amenities";
import type { Hotel } from "@/types";
import { cn, formatPrice } from "@/lib/utils";

interface HotelListItemProps {
  hotel: Hotel;
  className?: string;
  priority?: boolean;
}

/**
 * Horizontal property row — the layout travellers expect when comparing hotels.
 * Shared by the hotels index and the homepage feature so the two stay identical.
 */
export function HotelListItem({ hotel, className, priority }: HotelListItemProps) {
  return (
    <article
      className={cn(
        "group border border-line bg-surface transition-[border-color,box-shadow] duration-300 ease-(--ease-out-soft) hover:border-subtle hover:shadow-card",
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-6 sm:p-5">
        <Link
          href={`/hotels/${hotel.slug}`}
          tabIndex={-1}
          aria-hidden
          className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-sm bg-line sm:aspect-square sm:w-56 lg:w-64"
        >
          <Image
            src={hotel.image}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, 16rem"
            className="object-cover transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.04]"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <Stars count={hotel.starRating} />
            <span className="type-caption text-subtle">·</span>
            <span className="type-caption text-muted">{hotel.propertyType}</span>
          </div>

          <h3 className="type-h3 mt-2">
            <Link href={`/hotels/${hotel.slug}`} className="focus-visible:outline-offset-4">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-400 ease-(--ease-out-soft) group-hover:bg-[length:100%_1px]">
                {hotel.name}
              </span>
            </Link>
          </h3>

          <p className="type-caption mt-2 flex items-center gap-1.5 text-muted">
            <MapPin size={13} aria-hidden />
            {hotel.address}
          </p>

          <p className="type-body-sm mt-3 text-body line-clamp-2">{hotel.summary}</p>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {hotel.amenities.slice(0, 4).map((amenity) => {
              const Icon = amenityIcons[amenity];
              return (
                <li key={amenity} className="type-caption flex items-center gap-1.5 text-muted">
                  <Icon size={13} aria-hidden />
                  {amenityLabels[amenity]}
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4 sm:mt-auto">
            <ScoreBadge score={hotel.guestScore} reviewCount={hotel.reviewCount} size="sm" />
            <div className="flex items-end gap-5">
              <p className="text-right">
                <span className="type-caption block text-muted">From</span>
                <span className="type-h4 text-ink">{formatPrice(hotel.priceFrom)}</span>
                <span className="type-caption block text-muted">per night</span>
              </p>
              <Button href={`/hotels/${hotel.slug}`} size="sm">
                View property
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
