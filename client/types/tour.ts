import type { GalleryImage } from "./common";

export type TourCategory = "adventure" | "culture" | "wine" | "nature" | "city";

export type Difficulty = "Easy" | "Moderate" | "Challenging";

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  meals: string[];
  accommodation: string;
}

export interface Tour {
  id: string;
  slug: string;
  title: string;
  location: string;
  /** Links a tour to its destination page. */
  destinationSlug: string;
  category: TourCategory;
  summary: string;
  description: string[];
  image: string;
  gallery: GalleryImage[];
  durationDays: number;
  durationLabel: string;
  groupSize: string;
  difficulty: Difficulty;
  /** Indicative "from" price per person, in USD. */
  priceFrom: number;
  rating: number;
  reviewCount: number;
  highlights: string[];
  included: string[];
  excluded: string[];
  itinerary: ItineraryDay[];
  meetingPoint: string;
  importantInfo: string[];
  featured: boolean;
}
