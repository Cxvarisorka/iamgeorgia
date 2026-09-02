import { apiFetch, serverFetch } from "./client";
import { toQueryString } from "./query";
import type { Paginated } from "@/types/partner";
import type { TransferStatus, TransferVehicleBody } from "@/types/transfer";
import type {
  AttachedDocument,
  FleetImage,
  FleetVehicleAdmin,
  FleetVehicleFeature,
  VehicleDocumentType,
} from "@/types/driver";

/**
 * The fleet: physical cars. Mirrors `server/routes/admin.fleet.routes.js`.
 *
 * Reads run in Server Components (`serverFetch`); writes run from the browser
 * (`apiFetch`), which is why the two are split rather than one function that
 * guesses where it is.
 */

export interface FleetQuery {
  providerId?: string;
  vehicleClassId?: string;
  status?: TransferStatus | TransferStatus[];
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface FleetVehicleInput {
  providerId: string;
  vehicleClassId: string;
  make: string;
  model: string;
  year?: number | null;
  colour?: string | null;
  body: TransferVehicleBody;
  plateNumber: string;
  vin?: string | null;
  passengerCapacity: number;
  luggageCapacity: number;
  cabinBagCapacity?: number;
  features?: FleetVehicleFeature[];
  description?: string | null;
  internalNotes?: string | null;
  status?: TransferStatus;
}

export const listFleetVehicles = (query: FleetQuery = {}) =>
  serverFetch<Paginated<FleetVehicleAdmin>>(`/api/admin/transfers/fleet${toQueryString(query)}`);

export const listFleetVehiclesClient = (query: FleetQuery = {}) =>
  apiFetch<Paginated<FleetVehicleAdmin>>(`/api/admin/transfers/fleet${toQueryString(query)}`);

export const getFleetVehicle = (id: string) =>
  serverFetch<FleetVehicleAdmin>(`/api/admin/transfers/fleet/${encodeURIComponent(id)}`);

export const createFleetVehicle = (body: FleetVehicleInput) =>
  apiFetch<FleetVehicleAdmin>("/api/admin/transfers/fleet", { method: "POST", body });

export const updateFleetVehicle = (id: string, body: Partial<FleetVehicleInput>) =>
  apiFetch<FleetVehicleAdmin>(`/api/admin/transfers/fleet/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });

export const archiveFleetVehicle = (id: string) =>
  apiFetch<FleetVehicleAdmin>(`/api/admin/transfers/fleet/${encodeURIComponent(id)}/archive`, {
    method: "POST",
  });

export const activateFleetVehicle = (id: string) =>
  apiFetch<FleetVehicleAdmin>(`/api/admin/transfers/fleet/${encodeURIComponent(id)}/activate`, {
    method: "POST",
  });

/**
 * A real delete, admin-only. The server refuses with 409 `HAS_ASSIGNMENTS`
 * once the car has been on a job — archiving is the answer then.
 */
export const deleteFleetVehicle = (id: string) =>
  apiFetch<void>(`/api/admin/transfers/fleet/${encodeURIComponent(id)}`, { method: "DELETE" });

// --- Gallery ----------------------------------------------------------------

export const attachFleetImage = (
  id: string,
  body: { fileAssetId: string; caption?: string | null; isCover?: boolean },
) =>
  apiFetch<FleetImage>(`/api/admin/transfers/fleet/${encodeURIComponent(id)}/images`, {
    method: "POST",
    body,
  });

export const updateFleetImage = (
  id: string,
  imageId: string,
  body: { caption?: string | null; isCover?: boolean; sortOrder?: number },
) =>
  apiFetch<FleetImage>(
    `/api/admin/transfers/fleet/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
    { method: "PATCH", body },
  );

export const detachFleetImage = (id: string, imageId: string) =>
  apiFetch<void>(
    `/api/admin/transfers/fleet/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" },
  );

export const reorderFleetImages = (id: string, order: string[]) =>
  apiFetch<{ count: number }>(`/api/admin/transfers/fleet/${encodeURIComponent(id)}/images/order`, {
    method: "PUT",
    body: { order },
  });

// --- Documents --------------------------------------------------------------

export interface AttachDocumentInput<T extends string> {
  fileAssetId: string;
  docType: T;
  label?: string | null;
  validUntil?: string | null;
}

export const attachFleetDocument = (id: string, body: AttachDocumentInput<VehicleDocumentType>) =>
  apiFetch<AttachedDocument>(`/api/admin/transfers/fleet/${encodeURIComponent(id)}/documents`, {
    method: "POST",
    body,
  });

export const detachFleetDocument = (id: string, documentId: string) =>
  apiFetch<void>(
    `/api/admin/transfers/fleet/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
  );

/** A short-lived link to the bytes. Every call is audited on the server. */
export const getFleetDocumentUrl = (id: string, documentId: string) =>
  apiFetch<{ url: string; expiresAt: string }>(
    `/api/admin/transfers/fleet/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/url`,
  );
