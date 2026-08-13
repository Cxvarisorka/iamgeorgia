import type { GalleryImage } from "./common";

export interface Attraction {
  name: string;
  description: string;
}

export interface TravelInfo {
  bestTime: string;
  gettingThere: string;
  gettingAround: string;
  language: string;
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  region: string;
  /** Short editorial line used on covers and hero overlays. */
  tagline: string;
  /** One-sentence summary for cards and metadata. */
  summary: string;
  description: string[];
  heroImage: string;
  /** Portrait crop used by the magazine-style destination index. */
  coverImage: string;
  gallery: GalleryImage[];
  idealFor: string[];
  attractions: Attraction[];
  travelInfo: TravelInfo;
  featured: boolean;
}
