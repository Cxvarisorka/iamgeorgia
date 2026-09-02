import { apiFetch, serverFetch } from "./client";
import { toQueryString } from "./query";
import type { Paginated, PartnerLink } from "@/types/partner";
import type {
  AttachedDocument,
  DriverAdmin,
  DriverDocumentType,
  DriverLanguage,
  DriverVerificationStatus,
} from "@/types/driver";
import type { AttachDocumentInput } from "./fleet";

/** Driver profiles, for operations staff. Mirrors `server/routes/admin.drivers.routes.js`. */

export interface DriverQuery {
  providerId?: string;
  verificationStatus?: DriverVerificationStatus | DriverVerificationStatus[];
  isActive?: "true" | "false";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DriverInput {
  providerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  languages?: DriverLanguage[];
  yearsExperience?: number;
  bio?: string | null;
  photoFileAssetId?: string | null;
  licenceNumber?: string | null;
  licenceExpiresOn?: string | null;
  dateOfBirth?: string | null;
  internalNotes?: string | null;
  homeBasePointId?: string | null;
}

const base = "/api/admin/transfers/drivers";
const one = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const listDrivers = (query: DriverQuery = {}) =>
  serverFetch<Paginated<DriverAdmin>>(`${base}${toQueryString(query)}`);

export const listDriversClient = (query: DriverQuery = {}) =>
  apiFetch<Paginated<DriverAdmin>>(`${base}${toQueryString(query)}`);

export const getDriver = (id: string) => serverFetch<DriverAdmin>(one(id));

export const createDriver = (body: DriverInput) =>
  apiFetch<DriverAdmin>(base, { method: "POST", body });

export const updateDriver = (id: string, body: Partial<DriverInput>) =>
  apiFetch<DriverAdmin>(one(id), { method: "PATCH", body });

export const verifyDriver = (id: string, body: { status: DriverVerificationStatus; note?: string | null }) =>
  apiFetch<DriverAdmin>(`${one(id)}/verify`, { method: "POST", body });

export const deactivateDriver = (id: string, body: { reason: string; force?: boolean }) =>
  apiFetch<DriverAdmin>(`${one(id)}/deactivate`, { method: "POST", body });

export const reactivateDriver = (id: string) =>
  apiFetch<DriverAdmin>(`${one(id)}/activate`, { method: "POST" });

/**
 * A real delete, admin-only. Refused with 409 `HAS_ASSIGNMENTS` once the
 * driver has been on a job; takes their login with the profile.
 */
export const deleteDriver = (id: string) => apiFetch<void>(one(id), { method: "DELETE" });

/**
 * What creating or re-sending a login returns. The link comes back as well as
 * being emailed so the admin can copy it when the email does not land.
 */
export interface DriverAccountResult {
  driver: DriverAdmin;
  link: PartnerLink;
  email: string;
  emailSent: boolean;
}

export const createDriverAccount = (id: string, email: string) =>
  apiFetch<DriverAccountResult>(`${one(id)}/account`, { method: "POST", body: { email } });

export const resendDriverActivation = (id: string) =>
  apiFetch<DriverAccountResult>(`${one(id)}/account/resend`, { method: "POST" });

export const setDriverVehicles = (
  id: string,
  vehicles: Array<{ fleetVehicleId: string; isPrimary?: boolean }>,
) => apiFetch<DriverAdmin>(`${one(id)}/vehicles`, { method: "PUT", body: { vehicles } });

export const attachDriverDocument = (id: string, body: AttachDocumentInput<DriverDocumentType>) =>
  apiFetch<AttachedDocument>(`${one(id)}/documents`, { method: "POST", body });

export const detachDriverDocument = (id: string, documentId: string) =>
  apiFetch<void>(`${one(id)}/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });

/** A short-lived link to the bytes. Every call is audited on the server. */
export const getDriverDocumentUrl = (id: string, documentId: string) =>
  apiFetch<{ url: string; expiresAt: string }>(
    `${one(id)}/documents/${encodeURIComponent(documentId)}/url`,
  );
