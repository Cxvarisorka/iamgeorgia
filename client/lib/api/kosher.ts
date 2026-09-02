import { apiFetch, serverFetch } from "./client";
import type {
  HotelDocument,
  KosherCertificationScope,
  KosherProfile,
  KosherServiceLevel,
  KosherVerificationDecision,
} from "@/types/catalogue";
import type { Booking } from "@/types/booking";

/**
 * Kosher administration.
 *
 * Split by where the call runs, like the rest of the API layer: the read uses
 * `serverFetch` because it happens during a render and needs the session cookie
 * forwarded; every mutation uses `apiFetch` because it is fired from a button.
 *
 * Note what has no function here: there is no `setVerification`. Marking a
 * certificate verified is `verifyCertification`, a transition with its own
 * endpoint — and no other call in this file can reach the field, because the
 * server's schemas do not contain it.
 *
 * Every mutation resolves to the **whole** kosher block, re-derived server-side.
 * `certified` depends on today's date, so a caller that patched one field and
 * merged the reply into its local copy could otherwise keep showing a badge
 * that stopped being true at midnight.
 */

export interface KosherProfileInput {
  serviceLevel: KosherServiceLevel;
  notes?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface KosherCertificationInput {
  authorityName: string;
  authorityWebsite?: string | null;
  name?: string | null;
  reference?: string | null;
  scope?: KosherCertificationScope;
  issuedOn?: string | null;
  /** Null is a deliberate "this authority issues no expiry". */
  expiresOn?: string | null;
  documentId?: string | null;
}

// --- reads ------------------------------------------------------------------

/** Null when the property does not offer kosher services — not a 404. */
export const getKosher = (hotelId: string) =>
  serverFetch<KosherProfile | null>(`/api/admin/hotels/${hotelId}/kosher`);

export const listHotelDocuments = (hotelId: string) =>
  serverFetch<{ data: HotelDocument[] }>(`/api/admin/hotels/${hotelId}/documents`);

// --- mutations --------------------------------------------------------------

/** Creating the profile *is* switching kosher services on for the property. */
export const setKosherProfile = (hotelId: string, body: KosherProfileInput) =>
  apiFetch<KosherProfile>(`/api/admin/hotels/${hotelId}/kosher`, { method: "PUT", body });

/** 409 while a verified certificate is still live — archive that first. */
export const disableKosher = (hotelId: string) =>
  apiFetch<void>(`/api/admin/hotels/${hotelId}/kosher`, { method: "DELETE" });

export const addKosherCertification = (hotelId: string, body: KosherCertificationInput) =>
  apiFetch<KosherProfile>(`/api/admin/hotels/${hotelId}/kosher/certifications`, {
    method: "POST",
    body,
  });

/**
 * Editing a certificate.
 *
 * Changing anything somebody verified against — authority, reference, scope,
 * dates, the scan — sends it back to `PENDING_VERIFICATION`. Verification
 * attaches to a set of facts, not to a row id.
 */
export const updateKosherCertification = (
  hotelId: string,
  certId: string,
  body: Partial<KosherCertificationInput>,
) =>
  apiFetch<KosherProfile>(`/api/admin/hotels/${hotelId}/kosher/certifications/${certId}`, {
    method: "PATCH",
    body,
  });

/** The only path to VERIFIED. Notes are required for anything but approval. */
export const verifyKosherCertification = (
  hotelId: string,
  certId: string,
  body: { decision: KosherVerificationDecision; notes?: string | null },
) =>
  apiFetch<KosherProfile>(`/api/admin/hotels/${hotelId}/kosher/certifications/${certId}/verify`, {
    method: "POST",
    body,
  });

/** Archives a decided certificate; deletes one nobody ever looked at. */
export const archiveKosherCertification = (hotelId: string, certId: string) =>
  apiFetch<KosherProfile>(`/api/admin/hotels/${hotelId}/kosher/certifications/${certId}`, {
    method: "DELETE",
  });

// --- documents --------------------------------------------------------------

/**
 * Attaches an already-uploaded private asset to the property.
 *
 * Two steps on purpose, following the gallery: the bytes go to the media
 * library once and are attached afterwards, so a file can be detached and
 * re-attached without moving or changing its object key.
 */
export const attachHotelDocument = (
  hotelId: string,
  body: { fileAssetId: string; docType: string; label?: string | null; validUntil?: string | null },
) => apiFetch<HotelDocument>(`/api/admin/hotels/${hotelId}/documents`, { method: "POST", body });

/** 409 while a verified certificate still points at it. */
export const detachHotelDocument = (hotelId: string, documentId: string) =>
  apiFetch<void>(`/api/admin/hotels/${hotelId}/documents/${documentId}`, { method: "DELETE" });

// --- booking requirements ---------------------------------------------------

/**
 * The property's answer to one requirement on a booking.
 *
 * Admin-only, and it deliberately leaves the booking's own status alone: the
 * rooms were claimed and priced at confirmation, and a meal still being arranged
 * does not put them back in doubt.
 */
export const answerBookingRequest = (
  reference: string,
  requestId: string,
  body: { status: "CONFIRMED" | "DECLINED"; responseNote?: string | null },
) =>
  apiFetch<Booking>(`/api/admin/bookings/${reference}/requests/${requestId}`, {
    method: "POST",
    body,
  });
