import { apiFetch, serverFetch } from "./client";
import { toQueryString } from "./query";
import type {
  BulkWriteResult,
  InventoryCalendar,
  InventoryRangeInput,
  MarkupExplanation,
  PricingRule,
  RateRangeInput,
} from "@/types/catalogue";

/**
 * Inventory, rates and markup.
 *
 * The two writes here are range editors, not row editors: one call covers a
 * month, optionally masked to weekdays, and the database expands it. Anything
 * the body omits keeps the value the night already had, so "close December to
 * arrivals" does not have to restate the room counts to avoid wiping them.
 */

const roomPath = (hotelId: string, roomTypeId: string, partner = false) =>
  `/api/${partner ? "partner" : "admin"}/hotels/${hotelId}/room-types/${roomTypeId}`;

export const getCalendar = (
  hotelId: string,
  roomTypeId: string,
  range: { from: string; to: string },
  options: { partner?: boolean } = {},
) =>
  serverFetch<InventoryCalendar>(
    `${roomPath(hotelId, roomTypeId, options.partner)}/inventory/calendar${toQueryString(range)}`,
  );

export const setInventory = (
  hotelId: string,
  roomTypeId: string,
  body: InventoryRangeInput,
  options: { partner?: boolean } = {},
) =>
  apiFetch<BulkWriteResult>(`${roomPath(hotelId, roomTypeId, options.partner)}/inventory`, {
    method: "PUT",
    body,
  });

export const setRates = (
  hotelId: string,
  roomTypeId: string,
  ratePlanId: string,
  body: RateRangeInput,
  options: { partner?: boolean } = {},
) =>
  apiFetch<BulkWriteResult>(
    `${roomPath(hotelId, roomTypeId, options.partner)}/rate-plans/${ratePlanId}/rates`,
    { method: "PUT", body },
  );

// --- markup -----------------------------------------------------------------

export const listPricingRules = (query: Record<string, string | boolean | undefined> = {}) =>
  serverFetch<{ data: PricingRule[] }>(`/api/admin/pricing-rules${toQueryString(query)}`);

/** Answers "why is this partner seeing that price" without reading code. */
export const explainMarkup = (query: { partnerId?: string; hotelId?: string; date?: string }) =>
  serverFetch<MarkupExplanation>(`/api/admin/pricing-rules/explain${toQueryString(query)}`);

export const createPricingRule = (body: Record<string, unknown>) =>
  apiFetch<PricingRule>("/api/admin/pricing-rules", { method: "POST", body });

export const updatePricingRule = (id: string, body: Record<string, unknown>) =>
  apiFetch<PricingRule>(`/api/admin/pricing-rules/${id}`, { method: "PUT", body });

export const deletePricingRule = (id: string) =>
  apiFetch<void>(`/api/admin/pricing-rules/${id}`, { method: "DELETE" });
