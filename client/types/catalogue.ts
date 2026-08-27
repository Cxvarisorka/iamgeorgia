/**
 * The live hotel catalogue, mirroring `server/serializers/*`.
 *
 * Spelled exactly as the server sends it, so nothing has to be translated at
 * the boundary. Two conventions carried over from the API and worth stating
 * because they are easy to get wrong in a component:
 *
 *   * **Money is integer minor units** and always arrives with its currency.
 *     Never do arithmetic that assumes whole units.
 *   * **Dates are `YYYY-MM-DD` strings**, not `Date`. Check-out is exclusive:
 *     1–4 June is three nights.
 *
 * Fields marked "staff only" are *absent* rather than null for anyone who may
 * not see them, so `in` and `?.` distinguish "no value" from "not permitted".
 */

export type PropertyType =
  | "Hotel"
  | "Boutique"
  | "Resort"
  | "Guesthouse"
  | "Lodge"
  | "Apartment"
  | "Chalet"
  | "Hostel"
  | "Villa";

export type HotelStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ARCHIVED";
export type CatalogueStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type InventorySource = "MANUAL" | "CHANNEL_MANAGER" | "SUPPLIER_API";

export type MealPlanCode = "RO" | "BB" | "HB" | "HB_PLUS" | "FB" | "FB_PLUS" | "AI" | "UAI";
export type CancellationKind = "FLEXIBLE" | "NON_REFUNDABLE" | "TIERED";
export type ChargeBasis =
  | "PERCENT_OF_TOTAL"
  | "PERCENT_OF_FIRST_NIGHT"
  | "FIXED_AMOUNT"
  | "NIGHTS";
export type PaymentTiming =
  | "PAY_NOW"
  | "PAY_LATER"
  | "DEPOSIT"
  | "PAY_AT_HOTEL"
  | "CREDIT_ACCOUNT";
export type BedTypeCode = "SINGLE" | "TWIN" | "DOUBLE" | "QUEEN" | "KING" | "SOFA" | "BUNK" | "FUTON";
export type BathroomType = "PRIVATE" | "ENSUITE" | "SHARED";
export type ChildChargeMode = "FREE" | "PERCENT_OF_ADULT" | "FIXED_PER_NIGHT" | "FULL_ADULT";
export type TaxFeeBasis = "PERCENT" | "PER_NIGHT_PER_PERSON" | "PER_NIGHT_PER_ROOM" | "PER_STAY";
export type ImageCategory =
  | "Exterior"
  | "Lobby"
  | "Restaurant"
  | "Pool"
  | "Spa"
  | "Room"
  | "Bathroom"
  | "View"
  | "Facilities";
export type AmenityCategory =
  | "General"
  | "FoodDrink"
  | "Wellness"
  | "Parking"
  | "Business"
  | "Family"
  | "Ski"
  | "Accessibility"
  | "Transportation";
export type AmenityScope = "HOTEL" | "ROOM" | "BOTH";
export type DestinationType = "COUNTRY" | "REGION" | "CITY" | "RESORT";

/** An amount, always with the currency it is denominated in. */
export interface Money {
  amountCents: number;
  currency: string;
}

// --- media ------------------------------------------------------------------

export interface ImageVariant {
  variant: "thumb" | "card" | "gallery" | "original";
  format: "webp" | "avif" | "jpeg";
  url: string;
  width: number;
  height: number;
}

/**
 * A public image. `url` is the original; pick a variant for anything smaller.
 * The server composes these from an object key at serialization time, so they
 * are safe to render but not to store.
 */
export interface ImageAsset {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  mimeType: string;
  variants: ImageVariant[];
}

export interface HotelImage extends ImageAsset {
  hotelImageId: string;
  category: ImageCategory;
  caption: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface RoomImage extends ImageAsset {
  roomImageId: string;
  caption: string | null;
  sortOrder: number;
  isCover: boolean;
}

/** A private file. Deliberately has no URL — fetch a signed one when needed. */
export interface PrivateFile {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  uploadedAt: string;
}

// --- destinations -----------------------------------------------------------

export interface DestinationSummary {
  id: string;
  slug: string;
  name: string;
  type: DestinationType;
  parentId: string | null;
  /** Materialised ancestry, e.g. `/georgia/samtskhe-javakheti/bakuriani`. */
  path: string;
  countryCode: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  coverImage: string | null;
  featured: boolean;
  hotelCount?: number;
  childCount?: number;
}

export interface DestinationNode extends DestinationSummary {
  children: DestinationNode[];
}

export interface Destination extends DestinationSummary {
  tagline: string | null;
  summary: string | null;
  description: string[];
  heroImage: string | null;
  gallery: { src: string; alt: string }[];
  idealFor: string[];
  attractions: { name: string; description: string }[];
  travelInfo: Record<string, string> | null;
  parent: DestinationSummary | null;
  children: DestinationSummary[];
  createdAt: string;
  updatedAt: string;
}

// --- amenities --------------------------------------------------------------

export interface CatalogueAmenity {
  id: string;
  /** Stable machine key. Prefer this over `id` for icons and saved filters. */
  code: string;
  name: string;
  category: AmenityCategory;
  scope: AmenityScope;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  hotelCount?: number;
  /** Set when the amenity hangs off a hotel or room. */
  note?: string | null;
}

// --- rooms ------------------------------------------------------------------

export interface BedGroup {
  groupIndex: number;
  /** How many the group sleeps in total. Groups are alternatives, not additions. */
  sleeps: number;
  beds: { code: BedTypeCode; name: string; quantity: number; sleeps: number }[];
}

export interface OccupancyLimits {
  max: number;
  maxAdults: number;
  maxChildren: number;
  minAdults: number;
  standard: number;
  extraBedCapacity: number;
}

/** Present only when the request said who was travelling. */
export interface OccupancyVerdict {
  fits: boolean;
  reasons: { code: string; message: string }[];
  extraBedsNeeded: number;
  extraGuests: number;
}

export interface RoomTypeSummary {
  id: string;
  hotelId: string;
  /**
   * Indicative nightly "from" on the public detail: the cheapest rate over the
   * coming months, marked up for the viewer. Not an offer — only dated search
   * quotes something bookable.
   */
  priceFrom?: Money | null;
  code: string;
  name: string;
  status: CatalogueStatus;
  sortOrder: number;
  roomSizeSqm: number | null;
  occupancy: OccupancyLimits;
  bedGroups: BedGroup[];
  coverImage: ImageAsset | null;
  availability?: OccupancyVerdict;
}

export interface RoomType extends RoomTypeSummary {
  description: string | null;
  bathroomType: BathroomType;
  smokingAllowed: boolean;
  accessible: boolean;
  amenities: CatalogueAmenity[];
  ratePlans: RatePlan[];
  images: RoomImage[];
  createdAt: string;
  updatedAt: string;
}

// --- commercial model -------------------------------------------------------

export interface MealPlan {
  code: MealPlanCode;
  name: string;
  description: string | null;
}

export interface HotelMealPlan extends MealPlan {
  hotelDescription: string | null;
  inclusions: string[];
  serviceTimes: Record<string, string>;
}

export interface CancellationRule {
  hoursBeforeCheckIn: number;
  chargeBasis: ChargeBasis;
  /** Basis points for the percentage bases, minor units for a fixed amount. */
  chargeValue: number;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  kind: CancellationKind;
  description: string | null;
  isActive: boolean;
  /** A shared platform template. Usable by any hotel, editable by none. */
  isTemplate: boolean;
  rules: CancellationRule[];
}

export interface PaymentPolicy {
  id: string;
  name: string;
  timing: PaymentTiming;
  depositBps: number | null;
  balanceDueDaysBeforeCheckIn: number | null;
  description: string | null;
  isActive: boolean;
  isTemplate: boolean;
}

export interface RatePlanRestriction {
  id: string;
  startDate: string;
  endDate: string;
  minStay: number | null;
  maxStay: number | null;
  minAdvanceDays: number | null;
  maxAdvanceDays: number | null;
  /** The stay may span this date but may not begin or end on it. */
  closedToArrival: boolean;
  closedToDeparture: boolean;
  stopSell: boolean;
}

/** The sellable offer: a room, a board, cancellation terms, payment terms. */
export interface RatePlan {
  id: string;
  roomTypeId: string;
  code: string;
  name: string;
  status: CatalogueStatus;
  visibility: "PUBLIC" | "PARTNER_ONLY";
  sortOrder: number;
  currency: string;
  mealPlan: MealPlan | null;
  cancellation: CancellationPolicy | null;
  payment: PaymentPolicy | null;
  occupancy: {
    base: number;
    minAdults: number | null;
    maxAdults: number | null;
    maxChildren: number | null;
  };
  sellableFrom: string | null;
  sellableUntil: string | null;
  restrictions: RatePlanRestriction[];
  createdAt: string;
  updatedAt: string;
}

export interface ChildPolicyBand {
  minAge: number;
  maxAge: number;
  label: string;
  chargeMode: ChildChargeMode;
  chargeValue: number;
  requiresExtraBed: boolean;
}

export interface ChildPolicy {
  infantMaxAge: number;
  childMaxAge: number;
  childrenCountTowardOccupancy: boolean;
  maxChildrenFreePerRoom: number | null;
  bands: ChildPolicyBand[];
  updatedAt: string;
}

export interface TaxFee {
  id: string;
  name: string;
  basis: TaxFeeBasis;
  value: number;
  currency: string;
  /** Already paid, versus payable at the desk. Never present these the same way. */
  includedInRate: boolean;
  appliesToChildren: boolean;
  startDate: string | null;
  endDate: string | null;
}

// --- hotels -----------------------------------------------------------------

export interface HotelPolicies {
  checkIn?: string;
  checkOut?: string;
  cancellation?: string;
  children?: string;
  pets?: string;
  payment?: string;
  rules?: string[];
}

export interface HotelSummary {
  id: string;
  slug: string;
  name: string;
  propertyType: PropertyType;
  starRating: number;
  guestScore: number;
  reviewCount: number;
  shortDescription: string | null;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  currency: string;
  featured: boolean;
  coverImage: ImageAsset | null;
  destination: DestinationSummary | null;
  /** An un-dated "from" price. Not an offer — never quote or book from it. */
  priceFrom: Money | null;
  /** Amenity codes for card icons, present when the list query loaded them. */
  amenityCodes?: string[];

  // staff only
  status?: HotelStatus;
  /** Whether the property is sold to the public at all; everything is B2B by default. */
  b2cEnabled?: boolean;
  sourceType?: InventorySource;
  supplier?: { id: string; reference: string; name: string } | null;
  counts?: { amenities: number; images: number };
}

export interface Hotel extends HotelSummary {
  summary: string | null;
  description: string[];
  address: string | null;
  postalCode: string | null;
  timezone: string;
  checkIn: { from: string | null; until: string | null };
  checkOut: { from: string | null; until: string | null };
  phone: string | null;
  email: string | null;
  website: string | null;
  languages: string[];
  policies: HotelPolicies;
  nearby: { name: string; type: string; distance: string }[];
  categoryScores: { label: string; score: number }[];
  amenities: CatalogueAmenity[];
  images: HotelImage[];
  roomTypes: RoomType[];
  reviews?: {
    id: string;
    author: string;
    country: string;
    date: string;
    score: number;
    title: string;
    body: string;
    tripType: string;
  }[];
  childPolicy: ChildPolicy | null;
  createdAt: string;
  updatedAt: string;

  // staff only
  externalRef?: Record<string, unknown> | null;
  supplierId?: string | null;
}

/** What still has to be true before a hotel may go on sale. */
export interface PublishChecklistItem {
  code: string;
  message: string;
}

export interface HotelWithChecklist extends Hotel {
  publishChecklist: PublishChecklistItem[];
}

// --- inventory --------------------------------------------------------------

export interface CalendarRate {
  ratePlanId: string;
  ratePlanName: string;
  ratePlanCode: string;
  date: string;
  currency: string;
  closed: boolean;
  sellCents: number | null;
  extraAdultCents: number | null;
  extraChildCents: number | null;
  singleOccupancyCents: number | null;
  /** staff only */
  netCents?: number;
}

export interface CalendarNight {
  date: string;
  totalUnits: number;
  blockedUnits: number;
  bookedUnits: number;
  heldUnits: number;
  /** Derived, never stored: total − blocked − booked − held. */
  availableUnits: number;
  stopSell: boolean;
  minStay: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  rates: CalendarRate[];
}

export interface InventoryCalendar {
  roomType: { id: string; name: string; code: string };
  nights: CalendarNight[];
}

/** Anything omitted keeps the value the night already had. */
export interface InventoryRangeInput {
  from: string;
  to: string;
  /** ISO weekdays, 1 = Monday. Omit for every day in the range. */
  weekdays?: number[];
  totalUnits?: number;
  blockedUnits?: number;
  stopSell?: boolean;
  minStay?: number | null;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
}

export interface RateRangeInput {
  from: string;
  to: string;
  weekdays?: number[];
  currency?: string;
  netCents?: number;
  sellCents?: number | null;
  extraAdultCents?: number | null;
  extraChildCents?: number | null;
  singleOccupancyCents?: number | null;
  closed?: boolean;
}

export interface BulkWriteResult {
  nights: number;
  days: number;
}

export interface PricingRule {
  id: string;
  markupBps: number;
  label: string | null;
  priority: number;
  isActive: boolean;
  partner: { id: string; reference: string; name: string } | null;
  hotel: { id: string; name: string; slug: string } | null;
  destination: { id: string; name: string; slug: string } | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkupExplanation {
  markupBps: number;
  source: "RULE" | "PARTNER_COMMISSION" | "PLATFORM_DEFAULT";
  ruleId?: string;
  label?: string | null;
}
