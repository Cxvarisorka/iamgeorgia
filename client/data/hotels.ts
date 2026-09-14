import type { PropertyType } from "@/types";

export const propertyTypes: PropertyType[] = ["Hotel", "Boutique", "Resort", "Guesthouse", "Lodge"];

export const hotelSortOptions = [
  { value: "recommended", label: "Our recommendations" },
  { value: "price-low", label: "Price (lowest first)" },
  { value: "price-high", label: "Price (highest first)" },
  { value: "rating", label: "Guest rating" },
] as const;

export type HotelSort = (typeof hotelSortOptions)[number]["value"];
