import { apiFetch, serverFetch } from "./client";
import { toQueryString, type QueryValue } from "./query";
import type { HotelAvailability, Offer, SearchResponse, StayQuery } from "@/types/booking";
import type { DestinationNode, Hotel, HotelSummary } from "@/types/catalogue";
import type { Paginated } from "@/types/partner";

/**
 * Public catalogue and dated search.
 *
 * `/hotels` browses what exists; `/search` answers what can actually be booked
 * on given dates for a given party. Conflating the two is how a site advertises
 * rooms it cannot sell, so they are separate calls with separate shapes.
 */

export interface SearchQuery extends StayQuery, Record<string, QueryValue> {
  destinationSlug?: string;
  destinationPath?: string;
  countryCode?: string;
  propertyType?: string | string[];
  minStars?: number;
  amenity?: string | string[];
  mealPlan?: string | string[];
  refundableOnly?: boolean;
  locale?: string;
  page?: number;
  pageSize?: number;
}

export const searchHotels = (query: SearchQuery) =>
  serverFetch<SearchResponse>(`/api/search${toQueryString(query)}`);

export const getHotelAvailability = (slug: string, query: StayQuery & { locale?: string }) =>
  serverFetch<HotelAvailability>(`/api/search/hotels/${slug}${toQueryString(query)}`);

/**
 * Re-prices an offer before checkout.
 *
 * The signature on the token proves nobody edited the price; this proves the
 * price is still real. A 409 carries both figures so the interface can say
 * "this went from X to Y" rather than failing blankly.
 */
export const quoteOffer = (token: string) =>
  apiFetch<Offer>("/api/search/offers/quote", { method: "POST", body: { token } });

// --- public catalogue -------------------------------------------------------

export const listPublicHotels = (query: Record<string, QueryValue> = {}) =>
  serverFetch<Paginated<HotelSummary>>(`/api/hotels${toQueryString(query)}`);

export const getPublicHotel = (slug: string, query: { locale?: string } = {}) =>
  serverFetch<Hotel>(`/api/hotels/${slug}${toQueryString(query)}`);

export const getPublicDestinations = (query: Record<string, QueryValue> = {}) =>
  serverFetch<{ data: DestinationNode[] }>(`/api/destinations${toQueryString(query)}`);
