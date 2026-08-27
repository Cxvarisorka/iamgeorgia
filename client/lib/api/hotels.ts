import { apiFetch, serverFetch } from "./client";
import { toQueryString, type QueryValue } from "./query";
import type {
  CancellationPolicy,
  CatalogueAmenity,
  ChildPolicy,
  Destination,
  DestinationNode,
  DestinationSummary,
  Hotel,
  HotelMealPlan,
  HotelStatus,
  HotelSummary,
  HotelWithChecklist,
  PaymentPolicy,
  PropertyType,
  RatePlan,
  RoomType,
  RoomTypeSummary,
  TaxFee,
} from "@/types/catalogue";
import type { Paginated } from "@/types/partner";

/**
 * The hotel catalogue.
 *
 * Split by where the call runs, following `partners.ts`: reads use
 * `serverFetch` because they happen during a render and need the session
 * cookie forwarded; mutations use `apiFetch` because they are fired from a
 * button. Keeping them apart means a browser bundle never pulls in
 * `next/headers`, and a server render never makes an uncredentialed request.
 */

export interface HotelQuery extends Record<string, QueryValue> {
  search?: string;
  status?: HotelStatus | HotelStatus[];
  destinationId?: string;
  /** A destination path prefix — the way to say "everything in Georgia". */
  destinationPath?: string;
  supplierId?: string;
  propertyType?: PropertyType | PropertyType[];
  countryCode?: string;
  featured?: boolean;
  locale?: string;
  page?: number;
  pageSize?: number;
}

// --- reads ------------------------------------------------------------------

export const listHotels = (query: HotelQuery = {}) =>
  serverFetch<Paginated<HotelSummary>>(`/api/admin/hotels${toQueryString(query)}`);

export const getHotel = (id: string, query: { locale?: string } = {}) =>
  serverFetch<HotelWithChecklist>(`/api/admin/hotels/${id}${toQueryString(query)}`);

export const listRoomTypes = (hotelId: string, query: Record<string, QueryValue> = {}) =>
  serverFetch<{ data: RoomTypeSummary[] }>(
    `/api/admin/hotels/${hotelId}/room-types${toQueryString(query)}`,
  );

export const getRoomType = (hotelId: string, roomTypeId: string) =>
  serverFetch<RoomType>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}`);

export const listRatePlans = (hotelId: string, roomTypeId: string) =>
  serverFetch<{ data: RatePlan[] }>(
    `/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/rate-plans`,
  );

export const getChildPolicy = (hotelId: string) =>
  serverFetch<ChildPolicy | null>(`/api/admin/hotels/${hotelId}/child-policy`);

export const listCancellationPolicies = (hotelId: string) =>
  serverFetch<{ data: CancellationPolicy[] }>(
    `/api/admin/hotels/${hotelId}/policies/cancellation`,
  );

export const listPaymentPolicies = (hotelId: string) =>
  serverFetch<{ data: PaymentPolicy[] }>(`/api/admin/hotels/${hotelId}/policies/payment`);

export const listHotelMealPlans = (hotelId: string) =>
  serverFetch<{ data: HotelMealPlan[] }>(`/api/admin/hotels/${hotelId}/meal-plans`);

export const listTaxFees = (hotelId: string) =>
  serverFetch<{ data: TaxFee[] }>(`/api/admin/hotels/${hotelId}/tax-fees`);

export const listAmenities = (query: Record<string, QueryValue> = {}) =>
  serverFetch<{ data: CatalogueAmenity[] }>(`/api/admin/amenities${toQueryString(query)}`);

export const listDestinations = (query: Record<string, QueryValue> = {}) =>
  serverFetch<Paginated<DestinationSummary>>(`/api/admin/destinations${toQueryString(query)}`);

export const getDestinationTree = (query: Record<string, QueryValue> = {}) =>
  serverFetch<{ data: DestinationNode[] }>(`/api/admin/destinations/tree${toQueryString(query)}`);

export const getDestination = (id: string) =>
  serverFetch<Destination>(`/api/admin/destinations/${id}`);

// --- mutations --------------------------------------------------------------

export interface CreateHotelInput {
  slug: string;
  name: string;
  propertyType: PropertyType;
  destinationId: string;
  starRating: number;
  supplierId?: string | null;
  countryCode?: string;
  timezone?: string;
  currency?: string;
}

/**
 * Step one of the wizard, and nothing more.
 *
 * The hotel comes back as a DRAFT with a `publishChecklist` listing everything
 * still outstanding; each later step is a PATCH against one part of it.
 */
export const createHotel = (body: CreateHotelInput) =>
  apiFetch<HotelWithChecklist>("/api/admin/hotels", { method: "POST", body });

export const updateHotel = (id: string, body: Record<string, unknown>) =>
  apiFetch<HotelWithChecklist>(`/api/admin/hotels/${id}`, { method: "PATCH", body });

/** 422 with `details.missing` when the checklist is not clear. */
export const publishHotel = (id: string) =>
  apiFetch<HotelWithChecklist>(`/api/admin/hotels/${id}/publish`, { method: "POST" });

export const unpublishHotel = (id: string) =>
  apiFetch<HotelWithChecklist>(`/api/admin/hotels/${id}/unpublish`, { method: "POST" });

export const archiveHotel = (id: string, reason?: string) =>
  apiFetch<HotelWithChecklist>(`/api/admin/hotels/${id}/archive`, {
    method: "POST",
    body: reason ? { reason } : {},
  });

/**
 * Hard delete. Only a property with no booking history at all may go — the
 * server answers 409 otherwise, and archiving is the path for anything that
 * has ever been sold. Gallery images nothing else references go with it.
 */
export const deleteHotel = (id: string) =>
  apiFetch<void>(`/api/admin/hotels/${id}`, { method: "DELETE" });

/** Replaces the whole set — the panel edits amenities as a checklist. */
export const setHotelAmenities = (
  id: string,
  amenities: { amenityId: string; note?: string | null }[],
) => apiFetch<Hotel>(`/api/admin/hotels/${id}/amenities`, { method: "PUT", body: { amenities } });

export const attachHotelImage = (
  id: string,
  body: { fileAssetId: string; category?: string; caption?: string | null; isCover?: boolean },
) => apiFetch(`/api/admin/hotels/${id}/images`, { method: "POST", body });

export const updateHotelImage = (id: string, imageId: string, body: Record<string, unknown>) =>
  apiFetch(`/api/admin/hotels/${id}/images/${imageId}`, { method: "PATCH", body });

export const detachHotelImage = (id: string, imageId: string) =>
  apiFetch<void>(`/api/admin/hotels/${id}/images/${imageId}`, { method: "DELETE" });

export const reorderHotelImages = (id: string, order: string[]) =>
  apiFetch(`/api/admin/hotels/${id}/images/order`, { method: "PUT", body: { order } });

// --- room types -------------------------------------------------------------

export const createRoomType = (hotelId: string, body: Record<string, unknown>) =>
  apiFetch<RoomType>(`/api/admin/hotels/${hotelId}/room-types`, { method: "POST", body });

export const updateRoomType = (hotelId: string, roomTypeId: string, body: Record<string, unknown>) =>
  apiFetch<RoomType>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}`, {
    method: "PATCH",
    body,
  });

export const archiveRoomType = (hotelId: string, roomTypeId: string) =>
  apiFetch<RoomType>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/archive`, {
    method: "POST",
  });

/**
 * The bed configuration, sent whole.
 *
 * `groupIndex` separates alternative make-ups of the same room — one king, or
 * two twins. Beds within a group add up; groups do not add to each other.
 */
export const setBeds = (
  hotelId: string,
  roomTypeId: string,
  beds: { bedTypeCode: string; quantity: number; groupIndex?: number }[],
) =>
  apiFetch<RoomType>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/beds`, {
    method: "PUT",
    body: { beds },
  });

export const setRoomAmenities = (
  hotelId: string,
  roomTypeId: string,
  amenities: { amenityId: string; note?: string | null }[],
) =>
  apiFetch<RoomType>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/amenities`, {
    method: "PUT",
    body: { amenities },
  });

export const attachRoomImage = (
  hotelId: string,
  roomTypeId: string,
  body: { fileAssetId: string; caption?: string | null; isCover?: boolean },
) =>
  apiFetch<RoomType>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/images`, {
    method: "POST",
    body,
  });

export const updateRoomImage = (
  hotelId: string,
  roomTypeId: string,
  imageId: string,
  body: { caption?: string | null; sortOrder?: number; isCover?: boolean },
) =>
  apiFetch<RoomType>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/images/${imageId}`, {
    method: "PATCH",
    body,
  });

export const detachRoomImage = (hotelId: string, roomTypeId: string, imageId: string) =>
  apiFetch<void>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/images/${imageId}`, {
    method: "DELETE",
  });

// --- rate plans -------------------------------------------------------------

export const createRatePlan = (hotelId: string, roomTypeId: string, body: Record<string, unknown>) =>
  apiFetch<RatePlan>(`/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/rate-plans`, {
    method: "POST",
    body,
  });

export const updateRatePlan = (
  hotelId: string,
  roomTypeId: string,
  ratePlanId: string,
  body: Record<string, unknown>,
) =>
  apiFetch<RatePlan>(
    `/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/rate-plans/${ratePlanId}`,
    { method: "PATCH", body },
  );

export const archiveRatePlan = (hotelId: string, roomTypeId: string, ratePlanId: string) =>
  apiFetch<RatePlan>(
    `/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/rate-plans/${ratePlanId}/archive`,
    { method: "POST" },
  );

export const addRestriction = (
  hotelId: string,
  roomTypeId: string,
  ratePlanId: string,
  body: Record<string, unknown>,
) =>
  apiFetch(
    `/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/rate-plans/${ratePlanId}/restrictions`,
    { method: "POST", body },
  );

export const deleteRestriction = (
  hotelId: string,
  roomTypeId: string,
  ratePlanId: string,
  restrictionId: string,
) =>
  apiFetch<void>(
    `/api/admin/hotels/${hotelId}/room-types/${roomTypeId}/rate-plans/${ratePlanId}/restrictions/${restrictionId}`,
    { method: "DELETE" },
  );

// --- policies ---------------------------------------------------------------

export const setChildPolicy = (hotelId: string, body: Record<string, unknown>) =>
  apiFetch<ChildPolicy>(`/api/admin/hotels/${hotelId}/child-policy`, { method: "PUT", body });

export const setHotelMealPlan = (hotelId: string, body: Record<string, unknown>) =>
  apiFetch<HotelMealPlan>(`/api/admin/hotels/${hotelId}/meal-plans`, { method: "PUT", body });

export const createTaxFee = (hotelId: string, body: Record<string, unknown>) =>
  apiFetch<TaxFee>(`/api/admin/hotels/${hotelId}/tax-fees`, { method: "POST", body });

export const deleteTaxFee = (hotelId: string, taxFeeId: string) =>
  apiFetch<void>(`/api/admin/hotels/${hotelId}/tax-fees/${taxFeeId}`, { method: "DELETE" });

// --- destinations and amenities --------------------------------------------

export const createDestination = (body: Record<string, unknown>) =>
  apiFetch<Destination>("/api/admin/destinations", { method: "POST", body });

export const updateDestination = (id: string, body: Record<string, unknown>) =>
  apiFetch<Destination>(`/api/admin/destinations/${id}`, { method: "PATCH", body });

export const deleteDestination = (id: string) =>
  apiFetch<void>(`/api/admin/destinations/${id}`, { method: "DELETE" });

export const createAmenity = (body: Record<string, unknown>) =>
  apiFetch<CatalogueAmenity>("/api/admin/amenities", { method: "POST", body });

export const updateAmenity = (id: string, body: Record<string, unknown>) =>
  apiFetch<CatalogueAmenity>(`/api/admin/amenities/${id}`, { method: "PATCH", body });
