import { amenityIcons } from "./amenityIcons";
import { amenityLabels } from "@/data/amenities";
import type { AmenityId } from "@/types";

interface HotelAmenitiesProps {
  amenities: AmenityId[];
}

export function HotelAmenities({ amenities }: HotelAmenitiesProps) {
  return (
    // One column until there is room for two readable labels (~360px): a
    // 320px phone left each label about 80px, less than one Georgian word.
    <ul className="grid grid-cols-1 gap-x-6 gap-y-4 min-[22.5rem]:grid-cols-2 sm:grid-cols-3">
      {amenities.map((amenity) => {
        const Icon = amenityIcons[amenity];
        return (
          <li key={amenity} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-soft text-brand-text">
              <Icon size={16} aria-hidden />
            </span>
            <span className="type-body-sm min-w-0 text-body">{amenityLabels[amenity]}</span>
          </li>
        );
      })}
    </ul>
  );
}
