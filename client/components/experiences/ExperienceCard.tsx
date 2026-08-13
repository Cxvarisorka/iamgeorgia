import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { Rating } from "@/components/ui/Rating";
import type { Experience } from "@/types";
import { cn, formatPrice } from "@/lib/utils";

interface ExperienceCardProps {
  experience: Experience;
  className?: string;
  priority?: boolean;
}

export function ExperienceCard({ experience, className, priority }: ExperienceCardProps) {
  return (
    <article className={cn("group", className)}>
      <Link href={`/experiences/${experience.slug}`} className="block focus-visible:outline-offset-8">
        <div className="relative aspect-5/6 overflow-hidden rounded-sm bg-line">
          <Image
            src={experience.image}
            alt={experience.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.04]"
          />
          <div className="scrim-bottom absolute inset-0 opacity-90" aria-hidden />

          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="type-eyebrow text-on-dark/60">{experience.category}</p>
            <h3 className="type-h3 mt-2.5 text-on-dark">{experience.title}</h3>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-on-dark/70">
              <span className="type-caption flex items-center gap-1.5">
                <Clock size={13} aria-hidden />
                {experience.duration}
              </span>
              <span className="type-caption flex items-center gap-1.5">
                <MapPin size={13} aria-hidden />
                {experience.location}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <Rating value={experience.rating} reviewCount={experience.reviewCount} />
          <p className="type-body-sm font-medium text-ink">
            {formatPrice(experience.price)}
            <span className="text-muted"> / person</span>
          </p>
        </div>
      </Link>
    </article>
  );
}
