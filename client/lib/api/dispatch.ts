import { apiFetch, serverFetch } from "./client";
import { toQueryString } from "./query";
import type { Paginated } from "@/types/partner";
import type { TransferLegStatus } from "@/types/transfer";
import type {
  AssignmentHistoryRow,
  BlockReason,
  DispatchCandidate,
  DispatchLeg,
  OccupancyRow,
  ResourceBlock,
} from "@/types/driver";

/** The dispatch board. Mirrors `server/routes/admin.dispatch.routes.js`. */

const base = "/api/admin/transfers/dispatch";

export interface DispatchQuery {
  from?: string;
  to?: string;
  legStatus?: TransferLegStatus | TransferLegStatus[];
  driverId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AssignInput {
  driverId: string;
  fleetVehicleId?: string | null;
  acceptOnBehalf?: boolean;
  overrideClassMismatch?: boolean;
  overrideVehicleLink?: boolean;
  overrideUnverified?: boolean;
  windowEndOverride?: string;
  note?: string | null;
}

export const listDispatchLegs = (query: DispatchQuery = {}) =>
  serverFetch<Paginated<DispatchLeg>>(`${base}/legs${toQueryString(query)}`);

export const getDispatchLeg = (legId: string) =>
  serverFetch<DispatchLeg>(`${base}/legs/${encodeURIComponent(legId)}`);

export const getDispatchCandidates = (legId: string) =>
  apiFetch<{ leg: DispatchLeg; window: { windowStart: string; windowEnd: string }; data: DispatchCandidate[] }>(
    `${base}/legs/${encodeURIComponent(legId)}/candidates`,
  );

export const assignLeg = (legId: string, body: AssignInput) =>
  apiFetch<DispatchLeg>(`${base}/legs/${encodeURIComponent(legId)}/assign`, { method: "POST", body });

export const unassignLeg = (legId: string, reason: string) =>
  apiFetch<DispatchLeg>(`${base}/legs/${encodeURIComponent(legId)}/unassign`, {
    method: "POST",
    body: { reason },
  });

export const setLegStatus = (
  legId: string,
  body: { to: TransferLegStatus; expectedFrom?: TransferLegStatus; note?: string | null },
) => apiFetch<DispatchLeg>(`${base}/legs/${encodeURIComponent(legId)}/status`, { method: "POST", body });

export const cancelLeg = (legId: string, reason?: string) =>
  apiFetch<DispatchLeg>(`${base}/legs/${encodeURIComponent(legId)}/cancel`, {
    method: "POST",
    body: { reason: reason ?? null },
  });

export interface AssignmentQuery {
  driverId?: string;
  fleetVehicleId?: string;
  status?: string | string[];
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const listAssignments = (query: AssignmentQuery = {}) =>
  serverFetch<Paginated<AssignmentHistoryRow>>(`${base}/assignments${toQueryString(query)}`);

export const listOccupancy = (query: {
  driverId?: string;
  fleetVehicleId?: string;
  providerId?: string;
  from: string;
  to: string;
}) => serverFetch<{ data: OccupancyRow[] }>(`${base}/schedule${toQueryString(query)}`);

export const listBlocks = (query: { driverId?: string; fleetVehicleId?: string; from?: string; to?: string } = {}) =>
  serverFetch<{ data: ResourceBlock[] }>(`${base}/blocks${toQueryString(query)}`);

export const createBlock = (body: {
  driverId?: string | null;
  fleetVehicleId?: string | null;
  startsAt: string;
  endsAt: string;
  reason: BlockReason;
  note?: string | null;
}) => apiFetch<ResourceBlock>(`${base}/blocks`, { method: "POST", body });

export const deleteBlock = (id: string) =>
  apiFetch<void>(`${base}/blocks/${encodeURIComponent(id)}`, { method: "DELETE" });
