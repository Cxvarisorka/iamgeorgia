import { apiFetch, serverFetch } from "./client";
import { toQueryString } from "./query";
import type { Paginated } from "@/types/partner";
import type { DriverProfileForPartner, RatingAdmin, RatingPublic, RatingStatus } from "@/types/driver";

/** Driver ratings: the operations queue, the partner's word, the passenger's link. */

const admin = "/api/admin/transfers/dispatch";

export const listRatings = (query: { status?: RatingStatus | RatingStatus[]; driverId?: string; page?: number; pageSize?: number } = {}) =>
  serverFetch<Paginated<RatingAdmin>>(`${admin}/ratings${toQueryString(query)}`);

export const publishRating = (id: string, note?: string | null) =>
  apiFetch<RatingAdmin>(`${admin}/ratings/${encodeURIComponent(id)}/publish`, { method: "POST", body: { note: note ?? null } });

export const rejectRating = (id: string, note?: string | null) =>
  apiFetch<RatingAdmin>(`${admin}/ratings/${encodeURIComponent(id)}/reject`, { method: "POST", body: { note: note ?? null } });

/** Feedback taken by phone, recorded by operations against a completed leg. */
export const rateLegOnBehalf = (legId: string, body: { score: number; comment?: string | null }) =>
  apiFetch<RatingAdmin>(`${admin}/legs/${encodeURIComponent(legId)}/rating`, { method: "POST", body });

/** A partner rates the driver of one leg of its own booking. */
export const ratePartnerTransferLeg = (reference: string, legIndex: number, body: { score: number; comment?: string | null }) =>
  apiFetch<RatingPublic>(
    `/api/partner/transfers/bookings/${encodeURIComponent(reference)}/legs/${legIndex}/rating`,
    { method: "POST", body },
  );

/** A passenger rates from the emailed link. */
export const rateFromLink = (body: { token: string; score: number; comment?: string | null }) =>
  apiFetch<RatingPublic>("/api/transfers/ratings", { method: "POST", body });

/** A driver's public profile, for a partner who has met them. 404 otherwise. */
export const getPartnerDriverProfile = (id: string) =>
  serverFetch<DriverProfileForPartner>(`/api/partner/drivers/${encodeURIComponent(id)}`);
