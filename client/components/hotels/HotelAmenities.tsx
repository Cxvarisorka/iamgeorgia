import { amenityIcons } from "./amenityIcons";
import { amenityLabels } from "@/data/amenities";
import type { AmenityId } from "@/types";

interface HotelAmenitiesProps {
  amenities: AmenityId[];
}

export function HotelAmenities({ amenities }: HotelAmenitiesProps) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {amenities.map((amenity) => {
        const Icon = amenityIcons[amenity];
        return (
          <li key={amenity} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-soft text-brand-text">
              <Icon size={16} aria-hidden />
            </span>
            <span className="type-body-sm text-body">{amenityLabels[amenity]}</span>
          </li>
        );
      })}
    </ul>
  );
}
