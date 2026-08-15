import { localise, localiseAll } from "./i18n/merge";
import { transferOfferContent } from "./i18n/transfers";
import type { Locale } from "@/lib/i18n/config";
import type {
  TransferFeature,
  TransferOffer,
  TransferProvider,
  VehicleClass,
} from "@/types";

/**
 * Prototype transfer inventory.
 *
 * Nothing here is fetched, and no availability is ever checked. The file is
 * organised the way a supplier response would be — providers, then the vehicle
 * classes they operate — so it can be replaced by an API call without the
 * components or the pricing helpers changing shape.
 */

/* ==========================================================================
   Vocabulary
   ========================================================================== */

/**
 * Vehicle classes and features are *vocabulary*, not content: the same five
 * words appear on every offer. Their labels therefore live in the UI
 * dictionary (`t.transfers.vehicleClasses`, `t.transfers.features`) rather
 * than here, and this file ships only the keys and the order to render them in.
 */
export const vehicleClasses: VehicleClass[] = ["sedan", "suv", "minivan", "van", "bus"];

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

/* ==========================================================================
   Providers
   ========================================================================== */

const providers = {
  georgianTransfer: {
    id: "georgian-transfer",
    name: "Georgian Transfer",
    rating: 4.8,
    reviewCount: 1264,
    verified: true,
    yearsActive: 9,
  },
  caucasus: {
    id: "caucasus-travel-transport",
    name: "Caucasus Travel Transport",
    rating: 4.7,
    reviewCount: 842,
    verified: true,
    yearsActive: 12,
  },
  tbilisiPremium: {
    id: "tbilisi-premium-transfers",
    name: "Tbilisi Premium Transfers",
    rating: 4.9,
    reviewCount: 486,
    verified: true,
    yearsActive: 6,
  },
  kartliRoad: {
    id: "kartli-road-transfers",
    name: "Kartli Road Transfers",
    rating: 4.3,
    reviewCount: 1938,
    verified: true,
    yearsActive: 14,
  },
  iberiaCoach: {
    id: "iberia-coach",
    name: "Iberia Coach Company",
    rating: 4.4,
    reviewCount: 317,
    verified: true,
    yearsActive: 21,
  },
} satisfies Record<string, TransferProvider>;

/* ==========================================================================
   Shared editorial boilerplate
   ========================================================================== */

const privateCancellation =
  "Free cancellation up to 24 hours before pick-up. Inside 24 hours, 50% of the fare is retained.";

const sharedCancellation =
  "Free cancellation up to 12 hours before departure. Seats are non-refundable after that.";

const airportPickup =
  "Your driver waits in the arrivals hall with a name board from the moment your flight lands. Flights are tracked, so a delay does not cost you the transfer — waiting time is included free for the first 60 minutes after an airport arrival.";

const commonExcluded = [
  "Gratuities for the driver",
  "Extra stops not agreed at the time of booking",
  "Waiting time beyond the included allowance",
  "Meals, entrance fees and overnight accommodation",
];

/* ==========================================================================
   Offers
   ========================================================================== */

export const transferOffers: TransferOffer[] = [
  {
    id: "transfer-1",
    slug: "comfort-sedan-private-transfer",
    name: "Comfort Sedan",
    provider: providers.georgianTransfer,
    vehicleClass: "sedan",
    vehicleExample: "Toyota Camry, Skoda Superb or similar",
    kind: "private",
    maxPassengers: 3,
    maxLuggage: 2,
    maxCabinBags: 2,
    features: [
      "airConditioning",
      "englishDriver",
      "meetGreet",
      "flightTracking",
      "bottledWater",
      "freeWaiting",
    ],
    summary:
      "The everyday choice for couples and solo travellers — a clean, quiet saloon with a driver who knows the road.",
    description: [
      "A comfortable four-door saloon, no more than five years old, driven by a licensed professional who works this route regularly. Boot space takes two large cases with room for cabin bags on the back seat.",
      "The class most travellers book for an airport run: enough space for two people and their luggage, without paying for seats nobody sits in.",
    ],
    included: [
      "Private vehicle for your party alone",
      "Professional licensed driver",
      "Meet & greet at the arrivals hall",
      "Flight tracking and 60 minutes' free waiting",
      "Air conditioning and bottled water",
      "All road tolls and parking charges",
    ],
    excluded: commonExcluded,
    cancellation: privateCancellation,
    pickupProcedure: airportPickup,
    pricing: { perKm: 0.45, minimumFare: 25, airportFee: 5 },
    paceFactor: 1,
    recommendedRank: 2,
  },
  {
    id: "transfer-2",
    slug: "economy-sedan-private-transfer",
    name: "Economy Sedan",
    provider: providers.kartliRoad,
    vehicleClass: "sedan",
    vehicleExample: "Toyota Prius, Hyundai Elantra or similar",
    kind: "private",
    maxPassengers: 3,
    maxLuggage: 2,
    maxCabinBags: 1,
    features: ["airConditioning", "freeWaiting"],
    summary:
      "The lowest private fare on the route. Same door-to-door service, fewer extras.",
    description: [
      "A private saloon at the keenest price we list. The vehicle is older than the Comfort class and the driver may speak limited English, but the journey is direct and the car is yours alone.",
      "Worth choosing when you are travelling light and would rather put the difference towards the trip itself.",
    ],
    included: [
      "Private vehicle for your party alone",
      "Licensed driver",
      "Air conditioning",
      "30 minutes' free waiting after an airport arrival",
      "All road tolls",
    ],
    excluded: ["Meet & greet with a name board", ...commonExcluded],
    cancellation: privateCancellation,
    pickupProcedure:
      "Your driver meets you at the short-stay car park directly opposite the terminal exit — the pick-up point is sent to you by message an hour before landing. Thirty minutes of waiting time is included.",
    pricing: { perKm: 0.34, minimumFare: 18, airportFee: 4 },
    paceFactor: 1.02,
    recommendedRank: 5,
  },
  {
    id: "transfer-3",
    slug: "executive-sedan-private-transfer",
    name: "Executive Sedan",
    provider: providers.tbilisiPremium,
    vehicleClass: "sedan",
    vehicleExample: "Mercedes-Benz E-Class, BMW 5 Series or similar",
    kind: "private",
    maxPassengers: 3,
    maxLuggage: 3,
    maxCabinBags: 2,
    features: [
      "airConditioning",
      "wifi",
      "englishDriver",
      "meetGreet",
      "flightTracking",
      "bottledWater",
      "freeWaiting",
      "childSeat",
    ],
    summary:
      "An executive saloon with a suited driver, on-board Wi-Fi and a quiet cabin for long road days.",
    description: [
      "The class we book for guests arriving on a long-haul connection or heading straight into a meeting. Leather interior, on-board Wi-Fi, phone charging and a driver briefed on your itinerary.",
      "Over the four- and five-hour routes to Batumi or Svaneti, the difference in ride quality is the difference between arriving rested and arriving.",
    ],
    included: [
      "Executive vehicle for your party alone",
      "Suited, English-speaking professional driver",
      "Meet & greet at the arrivals hall with a name board",
      "On-board Wi-Fi and phone charging",
      "Flight tracking and 90 minutes' free waiting",
      "Bottled water, and a child seat on request",
    ],
    excluded: commonExcluded,
    cancellation:
      "Free cancellation up to 24 hours before pick-up. Inside 24 hours, 50% of the fare is retained.",
    pickupProcedure: airportPickup,
    pricing: { perKm: 0.78, minimumFare: 55, airportFee: 8 },
    paceFactor: 0.98,
    recommendedRank: 4,
  },
  {
    id: "transfer-4",
    slug: "premium-suv-private-transfer",
    name: "Premium SUV",
    provider: providers.tbilisiPremium,
    vehicleClass: "suv",
    vehicleExample: "Toyota Land Cruiser, Mitsubishi Pajero or similar",
    kind: "private",
    maxPassengers: 4,
    maxLuggage: 4,
    maxCabinBags: 3,
    features: [
      "airConditioning",
      "englishDriver",
      "meetGreet",
      "flightTracking",
      "childSeat",
      "bottledWater",
      "freeWaiting",
    ],
    summary:
      "Four-wheel drive with real ground clearance — the sensible choice for Gudauri, Kazbegi and Svaneti.",
    description: [
      "A high-clearance 4×4 with winter tyres from November to April. On the Georgian Military Road above Gudauri, and on the road behind the ridge into Mestia, this is not an upgrade so much as the right tool.",
      "Four passengers travel comfortably with full-size luggage, and the raised seating position makes the mountain sections considerably more pleasant.",
    ],
    included: [
      "Private 4×4 for your party alone",
      "Mountain-experienced English-speaking driver",
      "Winter tyres and snow chains in season",
      "Meet & greet and flight tracking",
      "60 minutes' free waiting after an airport arrival",
      "Child seat on request at no charge",
    ],
    excluded: commonExcluded,
    cancellation: privateCancellation,
    pickupProcedure: airportPickup,
    pricing: { perKm: 0.75, minimumFare: 45, airportFee: 8 },
    paceFactor: 1.02,
    recommendedRank: 3,
  },
  {
    id: "transfer-5",
    slug: "comfort-minivan-private-transfer",
    name: "Comfort Minivan",
    provider: providers.caucasus,
    vehicleClass: "minivan",
    vehicleExample: "Mercedes-Benz V-Class, Toyota Alphard or similar",
    kind: "private",
    maxPassengers: 6,
    maxLuggage: 6,
    maxCabinBags: 4,
    features: [
      "airConditioning",
      "wifi",
      "englishDriver",
      "meetGreet",
      "flightTracking",
      "childSeat",
      "bottledWater",
      "freeWaiting",
    ],
    summary:
      "Six seats and six large cases without anyone holding a bag on their lap. The family and small-group default.",
    description: [
      "A proper minivan rather than a stretched estate: individual seats, a separate luggage compartment and sliding doors that make loading at a kerbside straightforward.",
      "This is the vehicle our own guides use for families and groups of four to six, and it is the class we recommend most often for the long coastal and wine-country routes.",
    ],
    included: [
      "Private minivan for your party alone",
      "English-speaking professional driver",
      "Meet & greet at the arrivals hall",
      "On-board Wi-Fi and bottled water",
      "Up to two child seats at no charge",
      "60 minutes' free waiting after an airport arrival",
    ],
    excluded: commonExcluded,
    cancellation: privateCancellation,
    pickupProcedure: airportPickup,
    pricing: { perKm: 0.62, minimumFare: 40, airportFee: 7 },
    paceFactor: 1.06,
    recommendedRank: 1,
  },
  {
    id: "transfer-6",
    slug: "group-van-private-transfer",
    name: "Group Van",
    provider: providers.caucasus,
    vehicleClass: "van",
    vehicleExample: "Mercedes-Benz Sprinter, Ford Transit or similar",
    kind: "private",
    maxPassengers: 12,
    maxLuggage: 12,
    maxCabinBags: 8,
    features: [
      "airConditioning",
      "wifi",
      "englishDriver",
      "meetGreet",
      "flightTracking",
      "freeWaiting",
    ],
    summary:
      "Twelve seats, a full luggage bay and a driver used to moving groups through a terminal quickly.",
    description: [
      "A high-roof van with proper coach seating, overhead storage and a rear luggage bay that swallows twelve large cases. You can stand up in it, which matters more than you would think on a five-hour drive.",
      "Booked as a single private vehicle, so the price is the same whether eight or twelve of you travel.",
    ],
    included: [
      "Private 12-seat van for your group alone",
      "English-speaking professional driver",
      "Meet & greet in the arrivals hall",
      "Full luggage bay and on-board Wi-Fi",
      "90 minutes' free waiting after an airport arrival",
      "All road tolls and parking charges",
    ],
    excluded: commonExcluded,
    cancellation: privateCancellation,
    pickupProcedure: airportPickup,
    pricing: { perKm: 0.85, minimumFare: 60, airportFee: 8 },
    paceFactor: 1.12,
    recommendedRank: 6,
  },
  {
    id: "transfer-7",
    slug: "private-coach-transfer",
    name: "Private Coach",
    provider: providers.iberiaCoach,
    vehicleClass: "bus",
    vehicleExample: "Setra or Neoplan 30–49 seat coach",
    kind: "private",
    maxPassengers: 30,
    maxLuggage: 30,
    maxCabinBags: 30,
    features: ["airConditioning", "wifi", "englishDriver", "freeWaiting"],
    summary:
      "A full coach for conferences, weddings and tour groups, with a hold that takes everyone's luggage.",
    description: [
      "A modern touring coach with reclining seats, air conditioning throughout and an underfloor hold. Operated by a company that has been moving groups around Georgia since 2004.",
      "Larger coaches up to 49 seats are available on request — tell us the group size in the booking notes and we will confirm the right vehicle.",
    ],
    included: [
      "Private coach for your group alone",
      "Professional coach driver and on-board courier",
      "Underfloor luggage hold",
      "Air conditioning and on-board Wi-Fi",
      "120 minutes' free waiting after an airport arrival",
      "All road tolls and coach parking charges",
    ],
    excluded: commonExcluded,
    cancellation:
      "Free cancellation up to 72 hours before departure. Inside 72 hours, 50% of the fare is retained.",
    pickupProcedure:
      "Coaches cannot enter the terminal forecourt. Your courier meets the group in the arrivals hall and walks you to the coach bay, which is a three-minute walk. Two hours of waiting time is included.",
    pricing: { perKm: 1.25, minimumFare: 120, airportFee: 12 },
    paceFactor: 1.25,
    recommendedRank: 8,
  },
  {
    id: "transfer-8",
    slug: "shared-shuttle-transfer",
    name: "Shared Shuttle",
    provider: providers.georgianTransfer,
    vehicleClass: "minivan",
    vehicleExample: "Mercedes-Benz Sprinter, 8 seats",
    kind: "shared",
    maxPassengers: 8,
    maxLuggage: 8,
    maxCabinBags: 8,
    features: ["airConditioning", "englishDriver", "wifi"],
    summary:
      "A seat on a scheduled shuttle. The cheapest way to travel with someone else doing the driving.",
    description: [
      "You book seats rather than the vehicle, and travel with up to seven other passengers. The shuttle runs to a timetable and may make one or two stops to collect others, so allow a little longer than a private car.",
      "One large case and one cabin bag per passenger are included in the fare.",
    ],
    included: [
      "One reserved seat per passenger",
      "One large case and one cabin bag per person",
      "Air conditioning and on-board Wi-Fi",
      "English-speaking driver",
      "Set departure time, confirmed the day before",
    ],
    excluded: [
      "Door-to-door pick-up — the shuttle uses fixed stops",
      "Meet & greet with a name board",
      ...commonExcluded,
    ],
    cancellation: sharedCancellation,
    pickupProcedure:
      "The shuttle departs from the marked transfer desk in the arrivals hall. Be at the desk 20 minutes before the departure time on your confirmation — the shuttle cannot wait for late passengers, though we will move you to the next departure at no charge.",
    pricing: { perKm: 0.14, minimumFare: 12, airportFee: 2 },
    paceFactor: 1.35,
    recommendedRank: 7,
  },
  {
    id: "transfer-9",
    slug: "shared-coach-seat-transfer",
    name: "Shared Coach Seat",
    provider: providers.iberiaCoach,
    vehicleClass: "bus",
    vehicleExample: "Setra 49-seat coach",
    kind: "shared",
    maxPassengers: 30,
    maxLuggage: 30,
    maxCabinBags: 30,
    features: ["airConditioning", "wifi"],
    summary:
      "The lowest fare we list. A numbered seat on the scheduled intercity coach.",
    description: [
      "A reserved seat on the scheduled coach between major cities, with a hold for luggage and a comfort stop roughly every two hours. Departures are fixed and the coach serves several stops along the route.",
      "Slower than everything else on this page, and considerably cheaper.",
    ],
    included: [
      "One numbered seat per passenger",
      "One item of hold luggage per person",
      "Air conditioning and on-board Wi-Fi",
      "Scheduled comfort stops",
    ],
    excluded: [
      "Door-to-door pick-up — the coach uses fixed stations",
      "English-speaking staff on board",
      ...commonExcluded,
    ],
    cancellation: sharedCancellation,
    pickupProcedure:
      "Board at the coach station stand printed on your confirmation, 15 minutes before departure. The coach departs on time and does not wait.",
    pricing: { perKm: 0.09, minimumFare: 8, airportFee: 2 },
    paceFactor: 1.5,
    recommendedRank: 9,
  },
];

/**
 * Every offer in one language.
 *
 * Prices, capacities, features and the recommended order are language-
 * independent and stay on the English record; only the prose is merged over
 * it. That is why `quotesForQuery` can localise its results at the very end
 * without the fare it computed ever depending on who is reading.
 */
export function localisedTransferOffers(locale: Locale): TransferOffer[] {
  return localiseAll(transferOffers, locale, transferOfferContent);
}

export function getTransferOfferBySlug(
  slug: string,
  locale?: Locale,
): TransferOffer | undefined {
  const base = transferOffers.find((offer) => offer.slug === slug);
  if (!base || !locale) return base;
  return localise(base, locale, transferOfferContent);
}
