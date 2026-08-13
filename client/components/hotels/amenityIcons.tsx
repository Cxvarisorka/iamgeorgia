import {
  AirVent,
  Bath,
  Car,
  Coffee,
  Croissant,
  Dog,
  Dumbbell,
  Plane,
  Sun,
  UtensilsCrossed,
  Users,
  Waves,
  Wifi,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AmenityId } from "@/types";

/** One icon per amenity key, so the same facility always looks the same. */
export const amenityIcons: Record<AmenityId, LucideIcon> = {
  wifi: Wifi,
  breakfast: Croissant,
  pool: Waves,
  parking: Car,
  restaurant: UtensilsCrossed,
  spa: Bath,
  airConditioning: AirVent,
  gym: Dumbbell,
  bar: Wine,
  petFriendly: Dog,
  familyRooms: Users,
  airportShuttle: Plane,
  terrace: Sun,
  roomService: Coffee,
};
