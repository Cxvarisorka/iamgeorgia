import type { AmenityId } from "@/types";

/** Human labels for amenity keys. Icons are mapped in components/hotels/amenityIcons.tsx. */
export const amenityLabels: Record<AmenityId, string> = {
  wifi: "Free Wi-Fi",
  breakfast: "Breakfast included",
  pool: "Swimming pool",
  parking: "Free parking",
  restaurant: "Restaurant",
  spa: "Spa & wellness",
  airConditioning: "Air conditioning",
  gym: "Fitness centre",
  bar: "Bar & lounge",
  petFriendly: "Pet friendly",
  familyRooms: "Family rooms",
  airportShuttle: "Airport shuttle",
  terrace: "Terrace",
  roomService: "Room service",
};

/** Filter chips on the hotels index. */
export const amenityFilters: AmenityId[] = [
  "breakfast",
  "pool",
  "spa",
  "parking",
  "restaurant",
  "petFriendly",
  "gym",
  "airportShuttle",
];
