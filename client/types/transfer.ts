/**
 * Transfers — private and shared point-to-point ground transport.
 *
 * The shape here is deliberately close to what a real supplier API returns, so
 * `data/transfers.ts` can be swapped for a fetch without the UI changing: an
 * offer describes a *vehicle class from a provider*, and the price for a given
 * journey is derived from the route rather than stored on the offer.
 */

export type VehicleClass = "sedan" | "suv" | "minivan" | "van" | "bus";

/** Private hires the whole vehicle; shared sells a seat on a scheduled run. */
export type TransferKind = "private" | "shared";

/**
 * Closed set so every surface renders the same icon and wording for the same
 * feature. Labels live in `data/transfers.ts`, icons in `components/transfers`.
 */
export type TransferFeature =
  | "airConditioning"
  | "wifi"
  | "childSeat"
  | "englishDriver"
  | "meetGreet"
  | "flightTracking"
  | "bottledWater"
  | "freeWaiting";

/** Where a journey can start or end. */
export type TransferLocationType = "airport" | "city" | "hotel" | "landmark";

export interface TransferLocation {
  id: string;
  name: string;
  /** Region or city the point sits in — the second line of every option row. */
  region: string;
  type: TransferLocationType;
  /** IATA code for airports, shown as a chip. */
  code?: string;
  /**
   * Approximate real coordinates. Distances and durations are derived from
   * these rather than hardcoded, so any pair of points produces a sensible
   * journey without a lookup table.
   */
  lat: number;
  lng: number;
  /** Surfaced first in the picker before the traveller types anything. */
  popular?: boolean;
  /** Photograph of the place, used to illustrate a route. */
  image?: string;
}

export interface TransferProvider {
  id: string;
  name: string;
  /** Out of 5. */
  rating: number;
  reviewCount: number;
  /** Identity and licence checked by our team — a prototype trust signal. */
  verified: boolean;
  yearsActive: number;
}

export interface TransferOffer {
  id: string;
  slug: string;
  /** Commercial name of the class, e.g. "Comfort Sedan". */
  name: string;
  provider: TransferProvider;
  vehicleClass: VehicleClass;
  /** "Toyota Camry or similar" — never a promise of a specific car. */
  vehicleExample: string;
  kind: TransferKind;
  maxPassengers: number;
  /** Large checked bags. */
  maxLuggage: number;
  /** Cabin bags carried in addition to the checked allowance. */
  maxCabinBags: number;
  features: TransferFeature[];
  summary: string;
  description: string[];
  included: string[];
  excluded: string[];
  cancellation: string;
  pickupProcedure: string;
  /**
   * Fare model. The quote is `max(minimumFare, distanceKm * perKm)` plus any
   * airport fee, so long routes stay proportionate and short hops stay viable.
   */
  pricing: {
    perKm: number;
    minimumFare: number;
    airportFee: number;
  };
  /**
   * Multiplies the baseline road time. A bus is slower than a sedan over the
   * same mountain road, and travellers notice when that is ignored.
   */
  paceFactor: number;
  /** Editorial ordering for the "Recommended" sort. Lower sorts first. */
  recommendedRank: number;
}

/** A costed offer for one specific journey — what a result card renders. */
export interface TransferQuote {
  offer: TransferOffer;
  price: number;
  /** Journey time in minutes. */
  durationMinutes: number;
  distanceKm: number;
}
