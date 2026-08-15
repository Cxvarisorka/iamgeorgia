"use client";

import Image from "next/image";
import { useState } from "react";

import { VehicleIllustration } from "./VehicleIllustration";
import { fill } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { TransferLocation, TransferOffer } from "@/types";

interface TransferGalleryProps {
  offer: TransferOffer;
  from?: TransferLocation;
  to?: TransferLocation;
  className?: string;
}

type Frame =
  | { kind: "vehicle"; id: string; label: string }
  | { kind: "photo"; id: string; label: string; src: string };

/**
 * Vehicle first, then the route.
 *
 * The lead frame is the drawn vehicle class rather than a photograph, for the
 * reason set out in `VehicleIllustration` — the class is guaranteed, the
 * particular car is not. The supporting frames are the two ends of the
 * journey, which is the thing a traveller is actually buying.
 */
export function TransferGallery({ offer, from, to, className }: TransferGalleryProps) {
  const { t } = useI18n();

  const frames: Frame[] = [
    {
      kind: "vehicle",
      id: "vehicle",
      label: `${t.transfers.vehicleClasses[offer.vehicleClass]} — ${offer.vehicleExample}`,
    },
    ...(from?.image
      ? [
          {
            kind: "photo" as const,
            id: from.id,
            label: fill(t.transfers.gallery.pickUp, { name: from.name }),
            src: from.image,
          },
        ]
      : []),
    ...(to?.image
      ? [
          {
            kind: "photo" as const,
            id: to.id,
            label: fill(t.transfers.gallery.destination, { name: to.name }),
            src: to.image,
          },
        ]
      : []),
  ];

  const [activeId, setActiveId] = useState(frames[0].id);
  const active = frames.find((frame) => frame.id === activeId) ?? frames[0];

  return (
    <div className={className}>
      <div className="relative aspect-16/9 w-full overflow-hidden rounded-sm bg-surface-earth sm:aspect-2/1">
        {active.kind === "vehicle" ? (
          <div className="flex h-full w-full items-center justify-center p-8 text-ink">
            <VehicleIllustration
              vehicleClass={offer.vehicleClass}
              className="max-h-full max-w-lg"
            />
          </div>
        ) : (
          <Image
            src={active.src}
            alt={active.label}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
          />
        )}

        <p className="type-caption absolute bottom-3 start-3 rounded-sm bg-background/92 px-3 py-1.5 text-ink backdrop-blur-sm">
          {active.label}
        </p>
      </div>

      {frames.length > 1 && (
        <ul className="mt-3 flex gap-3">
          {frames.map((frame) => {
            const isActive = frame.id === active.id;
            return (
              <li key={frame.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(frame.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "relative block h-16 w-24 overflow-hidden rounded-sm border-2 transition-colors sm:h-20 sm:w-30",
                    isActive ? "border-brand" : "border-transparent hover:border-subtle",
                  )}
                >
                  {frame.kind === "vehicle" ? (
                    <span className="flex h-full w-full items-center justify-center bg-surface-earth px-2 text-ink">
                      <VehicleIllustration vehicleClass={offer.vehicleClass} />
                    </span>
                  ) : (
                    <Image
                      src={frame.src}
                      alt=""
                      fill
                      sizes="8rem"
                      className="object-cover"
                    />
                  )}
                  <span className="sr-only">{frame.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
