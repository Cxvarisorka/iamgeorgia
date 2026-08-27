import type { MealPlan, Money, PaymentPolicy } from "./catalogue";

/**
 * Search offers and bookings, mirroring `server/serializers/search.js` and
 * `server/serializers/booking.js`.
 *
 * The thing to hold onto: an **offer** is a priced, bookable proposition for
 * exact dates and an exact party, carried as a signed token. A **booking** is
 * what that offer became, and it is a snapshot — every name and price on it was
 * frozen at confirmation and does not follow the hotel afterwards.
 */

export type HotelBookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export type BookingRoomStatus = "CONFIRMED" | "CANCELLED";
export type BookingGuestType = "ADULT" | "CHILD" | "INFANT";

// --- search -----------------------------------------------------------------

export interface StayQuery {
  checkIn: string;
  checkOut: string;
  adults: number;
  /** One age per child. A count would leave the server guessing how to price. */
  childAges?: number[];
  rooms?: number;
}

export interface QuoteNight {
  date: string;
  sellCents: number;
  /** staff only */
  netCents?: number;
  lines?: { label: string; amountCents: number }[];
}

export interface QuoteTotals {
  nights: number;
  roomCents: number;
  taxIncludedCents: number;
  payableAtPropertyCents: number;
  totalCents: number;
  /** staff only */
  netCents?: number;
  markupBps?: number;
  marginCents?: number;
}

export interface Quote {
  currency: string;
  party: { adults: number; children: number; infants: number; countedOccupancy: number };
  nights: QuoteNight[];
  taxes: {
    includedCents: number;
    payableAtPropertyCents: number;
    applied: { name: string; basis: string; amountCents: number; includedInRate: boolean }[];
  };
  totals: QuoteTotals;
}

export interface OfferTerms {
  mealPlan: MealPlan | null;
  cancellation: {
    name: string | null;
    kind: string | null;
    description: string | null;
    /** ISO instant. Null means the rate was never free. */
    freeUntil: string | null;
    refundable: boolean | null;
  };
  payment: PaymentPolicy | null;
}

/** A bookable proposition. `token` is what checkout carries; never a price. */
export interface Offer {
  token: string;
  roomTypeId: string;
  ratePlanId: string;
  name: string;
  terms: OfferTerms;
  quote: Quote;
  occupancy: { extraBedsNeeded: number; extraGuests: number };
  availableUnits: number;
  freeCancellationUntil: string | null;
}

export interface SearchResult {
  id: string;
  slug: string;
  name: string;
  propertyType: string;
  starRating: number;
  guestScore: number;
  reviewCount: number;
  shortDescription: string | null;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  currency: string;
  featured: boolean;
  coverImage: { url: string; altText: string | null; variants: { variant: string; format: string; url: string }[] } | null;
  destination: { id: string; slug: string; name: string; path: string } | null;
  priceFrom: Money | null;
  /** The cheapest offer that can actually be booked for these exact dates. */
  startingFrom: { totalCents: number; perNightCents: number; currency: string };
  mealPlans: string[];
  refundable: boolean;
  offerCount: number;
  cheapestOffer: Offer;
}

export interface SearchResponse {
  data: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nights: number;
}

export interface RoomAvailability {
  id: string;
  name: string;
  code: string;
  occupancy: { max: number; maxAdults: number; maxChildren: number; standard: number };
  bedGroups: { groupIndex: number; sleeps: number; beds: { name: string; quantity: number }[] }[];
  coverImage: { url: string } | null;
  offers: Offer[];
}

export interface HotelAvailability {
  hotelId: string;
  nights: number;
  roomTypes: RoomAvailability[];
}

// --- holds ------------------------------------------------------------------

export interface Hold {
  token: string;
  expiresAt: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  currency: string;
  totalCents: number;
  hotel?: { id: string; name: string; slug: string };
  roomTypeName?: string | null;
  ratePlanName?: string | null;
}

// --- bookings ---------------------------------------------------------------

export interface BookingGuestInput {
  type?: BookingGuestType;
  firstName: string;
  lastName: string;
  age?: number;
}

export interface LeadGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

/** Note the absence of any amount. Every figure is recomputed server-side. */
export interface ConfirmBookingInput {
  holdToken?: string;
  offerToken?: string;
  leadGuest: LeadGuest;
  guests?: BookingGuestInput[];
  specialRequests?: string;
  source?: "web" | "partner" | "admin";
  idempotencyKey?: string;
}

/**
 * An amendment: the paperwork around a sale, never the sale itself.
 *
 * Note what cannot be expressed here — dates, rooms, board, party, any amount.
 * Changing those means releasing inventory and re-quoting, which is a
 * cancellation and a fresh booking. The server's schema is strict, so a body
 * carrying one of them is a 400 rather than a field quietly dropped.
 */
export interface AmendBookingInput {
  leadGuest?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    /** Null clears it. */
    phone?: string | null;
  };
  specialRequests?: string | null;
  /** A guest's proof the booking is theirs. Ignored for a signed-in viewer. */
  email?: string;
}

export interface CancellationWindow {
  fromAt: string | null;
  toAt: string | null;
  chargeCents: number;
}

export interface BookingRoom {
  id: string;
  status: BookingRoomStatus;
  /** As it was sold. The hotel may have renamed it since. */
  roomTypeName: string;
  ratePlanName: string;
  mealPlan: { code: string; name: string };
  bedConfiguration: string | null;
  adults: number;
  childAges: number[];
  cancellation: {
    summary: string | null;
    freeUntil: string | null;
    /** The tiers, frozen to absolute instants at confirmation. */
    windows: CancellationWindow[];
  };
  sellSubtotalCents: number;
  nights: QuoteNight[];
  guests: { type: BookingGuestType; firstName: string; lastName: string; age: number | null; isLead: boolean }[];
  /** staff only */
  netSubtotalCents?: number;
  roomTypeId?: string | null;
}

export interface BookingSummary {
  reference: string;
  status: HotelBookingStatus;
  hotel: { id: string; name: string; slug: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  leadGuestName: string;
  currency: string;
  totalCents: number;
  payableAtPropertyCents: number;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  /** staff only */
  netTotalCents?: number;
  markupBps?: number;
  marginCents?: number;
  partner?: { id: string; reference: string; name: string } | null;
}

export interface HotelSnapshot {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  starRating: number;
  propertyType: string;
  checkIn: { from: string | null; until: string | null };
  checkOut: { from: string | null; until: string | null };
  latitude: number | null;
  longitude: number | null;
}

export interface Booking extends BookingSummary {
  /** The property as it was when booked. A voucher reads this, not the hotel. */
  hotelSnapshot: HotelSnapshot;
  leadGuestEmail: string;
  leadGuestPhone: string | null;
  specialRequests: string | null;
  taxIncludedCents: number;
  cancellationChargeCents: number | null;
  cancellationReason: string | null;
  source: string;
  bookingRooms: BookingRoom[];
}

export interface CancellationQuote {
  chargeCents: number;
  refundCents: number;
  currency: string;
  refundable: boolean;
}

export interface BookingQuery {
  status?: HotelBookingStatus | HotelBookingStatus[];
  hotelId?: string;
  partnerId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}
