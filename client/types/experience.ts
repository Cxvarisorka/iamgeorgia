import type { GalleryImage } from "./common";

export type ExperienceCategory =
  | "wine"
  | "food"
  | "adventure"
  | "culture"
  | "wellness"
  | "craft";

export interface ExpectationStep {
  title: string;
  description: string;
}

export interface Experience {
  id: string;
  slug: string;
  title: string;
  location: string;
  destinationSlug: string;
  category: ExperienceCategory;
  summary: string;
  description: string[];
  image: string;
  gallery: GalleryImage[];
  duration: string;
  groupSize: string;
  /** Per-person price in USD. */
  price: number;
  rating: number;
  reviewCount: number;
  highlights: string[];
  whatToExpect: ExpectationStep[];
  included: string[];
  featured: boolean;
}
