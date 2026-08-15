import { getTransferLocation } from "@/data/transferLocations";
import { transferOffers } from "@/data/transfers";
import type { Locale } from "@/lib/i18n/config";
import { plural } from "@/lib/i18n/plural";
import type { UiDictionary } from "@/lib/i18n/ui/en";
import type { TransferLocation, TransferOffer, TransferQuote } from "@/types";

/**
 * The transfer search query and everything derived from it.
 *
 * The query lives in the URL rather than in React state. That is what makes
 * `/transfers/search?from=tbs-airport&to=batumi…` shareable, survive a reload,
 * and carry cleanly from the results page into the details page and on into
 * checkout without a provider wrapping four routes.
 */

export type TransferType = "one-way" | "return";

export interface TransferQuery {
  type: TransferType;
  /** Location ids from `data/transferLocations`. */
  from: string;
  to: string;
  /** ISO date, `yyyy-mm-dd`. */
  date: string;
  /** 24-hour `HH:mm`. */
  time: string;
  returnDate: string;
  returnTime: string;
  adults: number;
  children: number;
  /** Large checked bags. */
  luggage: number;
  /** Cabin bags. */
  cabinBags: number;
}

export const emptyQuery: TransferQuery = {
  type: "one-way",
  from: "",
  to: "",
  date: "",
  time: "",
  returnDate: "",
  returnTime: "",
  adults: 2,
  children: 0,
  luggage: 2,
  cabinBags: 0,
};

/** Accepts both `URLSearchParams` and Next's `ReadonlyURLSearchParams`. */
type ParamSource = { get(name: string): string | null };

function readInt(params: ParamSource, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function parseTransferQuery(params: ParamSource): TransferQuery {
  const type = params.get("type") === "return" ? "return" : "one-way";
  return {
    type,
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    date: params.get("date") ?? "",
    time: params.get("time") ?? "",
    returnDate: params.get("returnDate") ?? "",
    returnTime: params.get("returnTime") ?? "",
    adults: readInt(params, "adults", emptyQuery.adults),
    children: readInt(params, "children", emptyQuery.children),
    luggage: readInt(params, "luggage", emptyQuery.luggage),
    cabinBags: readInt(params, "cabinBags", emptyQuery.cabinBags),
  };
}

/**
 * Normalises the `searchParams` object a Server Component receives into
 * something `parseTransferQuery` can read, taking the first value when a key
 * has been repeated.
 */
export function paramsFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && typeof value[0] === "string") params.set(key, value[0]);
  }
  return params;
}

/** Serialises to a query string, omitting anything at its default. */
export function serializeTransferQuery(
  query: TransferQuery,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams();
  params.set("from", query.from);
  params.set("to", query.to);
  params.set("date", query.date);
  params.set("time", query.time);
  params.set("adults", String(query.adults));
  params.set("children", String(query.children));
  params.set("luggage", String(query.luggage));
  params.set("cabinBags", String(query.cabinBags));
  if (query.type === "return") {
    params.set("type", "return");
    params.set("returnDate", query.returnDate);
    params.set("returnTime", query.returnTime);
  }
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return params.toString();
}

/* ==========================================================================
   Validation — front-end only, and deliberately specific
   ========================================================================== */

export type TransferQueryField =
  | "from"
  | "to"
  | "date"
  | "time"
  | "returnDate"
  | "returnTime"
  | "passengers";

/**
 * Validation returns *keys* into `t.transfers.errors`, not sentences.
 *
 * The rules are the same in every language, but the wording is not — and this
 * module is imported by the pricing engine, which has no locale and should not
 * acquire one. The component that renders a message is the one that knows the
 * reader's language, so it does the lookup.
 */
export type TransferErrorKey =
  | "from"
  | "to"
  | "samePlace"
  | "date"
  | "time"
  | "returnDate"
  | "returnBeforeOutbound"
  | "returnTime"
  | "noAdults"
  | "tooManyPassengers";

export type TransferQueryErrors = Partial<Record<TransferQueryField, TransferErrorKey>>;

export function validateTransferQuery(query: TransferQuery): TransferQueryErrors {
  const errors: TransferQueryErrors = {};

  if (!query.from) errors.from = "from";
  if (!query.to) errors.to = "to";
  if (query.from && query.to && query.from === query.to) errors.to = "samePlace";
  if (!query.date) errors.date = "date";
  if (!query.time) errors.time = "time";

  if (query.type === "return") {
    if (!query.returnDate) errors.returnDate = "returnDate";
    else if (query.date && query.returnDate < query.date) {
      errors.returnDate = "returnBeforeOutbound";
    }
    if (!query.returnTime) errors.returnTime = "returnTime";
  }

  const passengers = query.adults + query.children;
  if (query.adults < 1) errors.passengers = "noAdults";
  else if (passengers > 40) errors.passengers = "tooManyPassengers";

  return errors;
}

export function hasErrors(errors: TransferQueryErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** True once the query describes a journey we can price. */
export function isSearchable(query: TransferQuery): boolean {
  return Boolean(query.from && query.to && query.from !== query.to);
}

/* ==========================================================================
   Journey maths
   ========================================================================== */

/**
 * Great-circle distance, scaled for the fact that roads are not straight lines.
 * 1.3 is a fair factor for Georgia, where almost every long route crosses a
 * ridge or follows a river valley rather than going over the top.
 */
const ROAD_FACTOR = 1.3;
/** Blended average across motorway, trunk and mountain sections. */
const AVERAGE_SPEED_KMH = 62;
/** Loading, terminal walk and getting clear of the kerb. */
const FIXED_OVERHEAD_MINUTES = 12;

function haversineKm(a: TransferLocation, b: TransferLocation): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RouteMetrics {
  from: TransferLocation;
  to: TransferLocation;
  distanceKm: number;
  /** True when either end is an airport — drives the airport fee and meet & greet. */
  touchesAirport: boolean;
}

export function getRouteMetrics(query: TransferQuery): RouteMetrics | null {
  const from = getTransferLocation(query.from);
  const to = getTransferLocation(query.to);
  if (!from || !to || from.id === to.id) return null;

  return {
    from,
    to,
    distanceKm: Math.round(haversineKm(from, to) * ROAD_FACTOR),
    touchesAirport: from.type === "airport" || to.type === "airport",
  };
}

/** Fare and journey time for one offer over one route. Per vehicle, or per seat for shared. */
export function quoteFor(offer: TransferOffer, route: RouteMetrics): TransferQuote {
  const distanceFare = route.distanceKm * offer.pricing.perKm;
  const airportFee = route.touchesAirport ? offer.pricing.airportFee : 0;
  const price = Math.round(Math.max(offer.pricing.minimumFare, distanceFare) + airportFee);

  const driving = (route.distanceKm / AVERAGE_SPEED_KMH) * 60 * offer.paceFactor;
  const durationMinutes = Math.round((driving + FIXED_OVERHEAD_MINUTES) / 5) * 5;

  return { offer, price, durationMinutes, distanceKm: route.distanceKm };
}

/**
 * Every offer that can physically carry the party, priced for the route.
 *
 * Capacity is a hard constraint rather than a filter: showing a three-seat
 * saloon to a party of six is not a choice, it is a mistake the traveller only
 * discovers at the kerb.
 */
export function quotesForQuery(query: TransferQuery): TransferQuote[] {
  const route = getRouteMetrics(query);
  if (!route) return [];

  const passengers = Math.max(1, query.adults + query.children);
  const bags = query.luggage;

  return transferOffers
    .filter((offer) => offer.maxPassengers >= passengers && offer.maxLuggage >= bags)
    .map((offer) => quoteFor(offer, route));
}

/** Shared transfers are sold by the seat; private ones by the vehicle. */
export function isPerPerson(offer: TransferOffer): boolean {
  return offer.kind === "shared";
}

/** What the traveller actually pays, across both legs of a return. */
export function totalFor(quote: TransferQuote, query: TransferQuery): number {
  const passengers = Math.max(1, query.adults + query.children);
  const perJourney = isPerPerson(quote.offer) ? quote.price * passengers : quote.price;
  return query.type === "return" ? perJourney * 2 : perJourney;
}

/* ==========================================================================
   Formatting
   ========================================================================== */

/**
 * 335 → "5h 35m", 45 → "45m".
 *
 * The `h` and `m` are abbreviations, not symbols, so they are translated:
 * Russian reads "5 ч 35 мин". They come in as an argument rather than being
 * looked up here, for the same reason the error keys leave: this module must
 * stay locale-free so the pricing engine can call it from anywhere.
 */
export function formatDuration(
  minutes: number,
  units: { hour: string; minute: string } = { hour: "h", minute: "m" },
): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}${units.minute}`;
  if (rest === 0) return `${hours}${units.hour}`;
  return `${hours}${units.hour} ${rest}${units.minute}`;
}

/** "20 August 2026" in the reader's locale, or an em dash when unset. */
export function formatJourneyDate(date: string, intlLocale = "en-GB"): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

/** Short form for chips and summary bars: "20 Aug". */
export function formatJourneyDateShort(date: string, intlLocale = "en-GB"): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short" }).format(parsed);
}

/** Today, as `yyyy-mm-dd` in local time — the `min` on every date input. */
export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * "2 adults · 1 child" — through `plural()`, so Russian gets 2 взрослых and
 * Georgian its single form rather than an English `-s` bolted onto a
 * translated noun.
 */
export function passengerSummary(
  query: TransferQuery,
  locale: Locale,
  units: Pick<UiDictionary["units"], "adult" | "child">,
): string {
  const parts = [plural(locale, query.adults, units.adult)];
  if (query.children > 0) parts.push(plural(locale, query.children, units.child));
  return parts.join(" · ");
}

export function luggageSummary(
  query: TransferQuery,
  locale: Locale,
  units: Pick<UiDictionary["units"], "largeBag" | "cabinBag">,
): string {
  const parts = [plural(locale, query.luggage, units.largeBag)];
  if (query.cabinBags > 0) parts.push(plural(locale, query.cabinBags, units.cabinBag));
  return parts.join(" · ");
}
