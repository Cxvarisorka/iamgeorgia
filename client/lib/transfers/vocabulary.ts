import type { TransferFeature, TransferVehicleBody, TransferVehicleClass } from "@/types/transfer";

/**
 * The closed vocabularies the transfer UI filters and sorts on.
 *
 * These used to sit at the top of `data/transfers.ts` beside the nine fixture
 * offers. The offers have gone to the database; this has not, because it is not
 * data — it is the set of choices the interface offers, and it belongs next to
 * the interface rather than next to the catalogue.
 *
 * Nothing here holds a label. Every one of these is a key into
 * `t.transfers.*`, so the wording moves with the reader's language while the
 * values stay the same in every locale.
 */

/** Body types, in the order the fleet section shows them. */
export const vehicleBodies: TransferVehicleBody[] = ["sedan", "suv", "minivan", "van", "bus"];

/** The commercial classes, cheapest-feeling first. */
export const vehicleClasses: TransferVehicleClass[] = [
  "ECONOMY",
  "COMFORT",
  "MINIVAN",
  "VAN",
  "GROUP",
  "JEEP_4X4",
  "VIP",
];

/** The subset offered as filter chips — the ones travellers actually choose on. */
export const featureFilters: TransferFeature[] = [
  "airConditioning",
  "wifi",
  "childSeat",
  "englishDriver",
  "meetGreet",
  "freeWaiting",
];

/** Numerals and an en dash — the one label that reads the same in every language. */
export const passengerBands = [
  { value: "1-3", label: "1–3", min: 1, max: 3 },
  { value: "4-6", label: "4–6", min: 4, max: 6 },
  { value: "7-12", label: "7–12", min: 7, max: 12 },
  { value: "13+", label: "13+", min: 13, max: Infinity },
] as const;

export type PassengerBand = (typeof passengerBands)[number]["value"];

/** Wording comes from `t.transfers.filters.outstanding` / `.veryGood`. */
export const ratingFilters = [
  { value: 4.5, key: "outstanding" },
  { value: 4.0, key: "veryGood" },
] as const;

/** Mirrors `hotelSortOptions` so both verticals sort the same way. */
export const transferSortOptions = [
  { value: "recommended", key: "recommended" },
  { value: "price-low", key: "priceLow" },
  { value: "rating", key: "rating" },
  { value: "duration", key: "duration" },
] as const;

export type TransferSort = (typeof transferSortOptions)[number]["value"];

/**
 * The order the picker groups pick-up points in.
 *
 * Airports first because most journeys start at one, then the places people
 * name when they are not flying.
 */
export const pointKindOrder = ["AIRPORT", "CITY", "RESORT", "LANDMARK", "STATION", "HOTEL"] as const;
