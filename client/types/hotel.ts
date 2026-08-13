import type { AmenityId, GalleryImage, Review, ReviewCategoryScore } from "./common";

export type PropertyType = "Hotel" | "Boutique" | "Resort" | "Guesthouse" | "Lodge";

export interface Room {
  id: string;
  name: string;
  image: string;
  bedConfiguration: string;
  maxGuests: number;
  sizeSqm: number;
  amenities: string[];
  cancellation: string;
  breakfastIncluded: boolean;
  pricePerNight: number;
  /** Prototype scarcity cue, e.g. "Only 2 left at this price". */
  availabilityNote?: string;
}

export interface HotelPolicies {
  checkIn: string;
  checkOut: string;
  cancellation: string;
  children: string;
  pets: string;
  payment: string;
  rules: string[];
}

export interface NearbyPlace {
  name: string;
  type: string;
  distance: string;
}

export interface Hotel {
  id: string;
  slug: string;
  name: string;
  propertyType: PropertyType;
  location: string;
  destinationSlug: string;
  address: string;
  /** Official star classification, 1–5. */
  starRating: number;
  /** Guest score out of 10, as travellers expect from booking platforms. */
  guestScore: number;
  reviewCount: number;
  summary: string;
  description: string[];
  image: string;
  gallery: GalleryImage[];
  amenities: AmenityId[];
  highlights: string[];
  rooms: Room[];
  categoryScores: ReviewCategoryScore[];
  reviews: Review[];
  policies: HotelPolicies;
  nearby: NearbyPlace[];
  /** Lowest nightly rate across room types, in USD. */
  priceFrom: number;
  featured: boolean;
}
