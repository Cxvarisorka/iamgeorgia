/** Shared building blocks used across tours, hotels, destinations and experiences. */

export interface GalleryImage {
  src: string;
  alt: string;
}

/**
 * Amenity keys are a closed set so every surface renders the same icon and
 * label for the same facility. Icon mapping lives in components/hotels/amenityIcons.
 */
export type AmenityId =
  | "wifi"
  | "breakfast"
  | "pool"
  | "parking"
  | "restaurant"
  | "spa"
  | "airConditioning"
  | "gym"
  | "bar"
  | "petFriendly"
  | "familyRooms"
  | "airportShuttle"
  | "terrace"
  | "roomService";

export interface Amenity {
  id: AmenityId;
  label: string;
}

/**
 * Guest reviews. Hotels use a 10-point score (the convention travellers expect
 * from booking platforms); tours and experiences use a 5-point star rating.
 */
export interface Review {
  id: string;
  author: string;
  country: string;
  date: string;
  score: number;
  title: string;
  body: string;
  tripType: string;
}

export interface ReviewCategoryScore {
  label: string;
  score: number;
}
