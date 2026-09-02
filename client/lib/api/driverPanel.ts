import { apiFetch, serverFetch } from "./client";
import { toQueryString } from "./query";
import type { Paginated } from "@/types/partner";
import type { TransferLegStatus } from "@/types/transfer";
import type { DriverAssignment, DriverLanguage, DriverSelf, FleetVehiclePublic } from "@/types/driver";

/**
 * The driver panel's API. Mirrors `server/routes/driver.routes.js`.
 *
 * Reads run in Server Components; the three writes a driver makes — accept,
 * decline, a milestone — run from the phone.
 */

const base = "/api/driver";

export type DriverScope = "today" | "upcoming" | "history";

export const getDriverProfile = () => serverFetch<DriverSelf>(`${base}/me`);

export const updateDriverProfile = (body: { phone?: string; languages?: DriverLanguage[]; bio?: string | null }) =>
  apiFetch<DriverSelf>(`${base}/me`, { method: "PATCH", body });

export const listDriverVehicles = () =>
  serverFetch<{ data: Array<FleetVehiclePublic & { isPrimary: boolean }> }>(`${base}/vehicles`);

export const listDriverAssignments = (query: { scope?: DriverScope; page?: number; pageSize?: number } = {}) =>
  serverFetch<Paginated<DriverAssignment>>(`${base}/assignments${toQueryString(query)}`);

export const getDriverAssignment = (id: string) =>
  serverFetch<DriverAssignment>(`${base}/assignments/${encodeURIComponent(id)}`);

export const acceptAssignment = (id: string) =>
  apiFetch<DriverAssignment>(`${base}/assignments/${encodeURIComponent(id)}/accept`, { method: "POST" });

export const declineAssignment = (id: string, reason?: string) =>
  apiFetch<DriverAssignment>(`${base}/assignments/${encodeURIComponent(id)}/decline`, {
    method: "POST",
    body: { reason: reason ?? null },
  });

export const updateAssignmentStatus = (
  id: string,
  body: { to: TransferLegStatus; expectedFrom?: TransferLegStatus; note?: string | null },
) => apiFetch<DriverAssignment>(`${base}/assignments/${encodeURIComponent(id)}/status`, { method: "POST", body });

// --- The bell ---------------------------------------------------------------

export interface DriverNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  payload: { assignmentId?: string; legId?: string; bookingReference?: string; score?: number };
  readAt: string | null;
  createdAt: string;
}

export const listDriverNotifications = (query: { unread?: "true" | "false"; page?: number; pageSize?: number } = {}) =>
  serverFetch<Paginated<DriverNotification> & { unreadCount: number }>(`${base}/notifications${toQueryString(query)}`);

export const markNotificationRead = (id: string) =>
  apiFetch<DriverNotification>(`${base}/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });

export const markAllNotificationsRead = () =>
  apiFetch<{ count: number }>(`${base}/notifications/read-all`, { method: "POST" });
