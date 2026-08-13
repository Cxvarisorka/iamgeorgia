"use client";

import Image from "next/image";
import { BedDouble, Check, Maximize, Users, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { RequestModal } from "@/components/ui/RequestModal";
import type { Room } from "@/types";
import { formatPrice } from "@/lib/utils";

interface HotelRoomCardProps {
  room: Room;
  hotelName: string;
}

/**
 * Room row. "Reserve" opens a prototype request dialog — it never creates a
 * booking, checks availability or takes payment.
 */
export function HotelRoomCard({ room, hotelName }: HotelRoomCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <article className="grid gap-5 border border-line bg-surface p-4 sm:grid-cols-[13rem_1fr] sm:p-5 lg:grid-cols-[15rem_1fr_13rem]">
        <div className="relative aspect-4/3 overflow-hidden rounded-sm bg-line">
          <Image
            src={room.image}
            alt={room.name}
            fill
            sizes="(max-width: 640px) 90vw, 15rem"
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <h3 className="type-h4">{room.name}</h3>

          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <li className="type-caption flex items-center gap-1.5 text-muted">
              <Users size={13} aria-hidden />
              {room.maxGuests} guests
            </li>
            <li className="type-caption flex items-center gap-1.5 text-muted">
              <BedDouble size={13} aria-hidden />
              {room.bedConfiguration}
            </li>
            <li className="type-caption flex items-center gap-1.5 text-muted">
              <Maximize size={13} aria-hidden />
              {room.sizeSqm} m²
            </li>
          </ul>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {room.amenities.map((amenity) => (
              <li key={amenity} className="type-caption text-body">
                · {amenity}
              </li>
            ))}
          </ul>

          <ul className="mt-4 space-y-1.5">
            <li className="type-body-sm flex items-center gap-2 text-success">
              <Check size={15} aria-hidden />
              {room.cancellation}
            </li>
            <li className="type-body-sm flex items-center gap-2 text-body">
              {room.breakfastIncluded ? (
                <>
                  <Check size={15} className="text-success" aria-hidden />
                  Breakfast included
                </>
              ) : (
                <>
                  <XCircle size={15} className="text-subtle" aria-hidden />
                  Breakfast available for a supplement
                </>
              )}
            </li>
          </ul>
        </div>

        <div className="flex flex-col justify-between gap-4 border-t border-line pt-4 sm:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="text-right">
            <p className="type-h3">{formatPrice(room.pricePerNight)}</p>
            <p className="type-caption text-muted">per night, incl. taxes</p>
            {room.availabilityNote && (
              <p className="type-caption mt-2 font-medium text-warning-text">
                {room.availabilityNote}
              </p>
            )}
          </div>
          <Button onClick={() => setModalOpen(true)} fullWidth>
            Reserve
          </Button>
        </div>
      </article>

      <RequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Reserve this room"
        subtitle={`${room.name} at ${hotelName}`}
        rows={[
          { label: "Property", value: hotelName },
          { label: "Room", value: room.name },
          { label: "Beds", value: room.bedConfiguration },
          { label: "Maximum guests", value: String(room.maxGuests) },
          { label: "Cancellation", value: room.cancellation },
        ]}
        total={{ label: "Per night", value: formatPrice(room.pricePerNight) }}
        confirmLabel="Request this room"
      />
    </>
  );
}
