import { apiFetch, serverFetch } from "./client";
import { toQueryString } from "./query";
import type { ImageAsset, PrivateFile } from "@/types/catalogue";
import type { Paginated } from "@/types/partner";

/**
 * The media library.
 *
 * Uploads go through the API rather than straight to object storage, so the
 * bytes are sniffed, re-encoded and stripped of EXIF before anything is
 * written. That means multipart rather than JSON, which is why this module
 * builds its own request instead of using the shared JSON helper.
 */

export type MediaCategory =
  | "HOTEL_IMAGE"
  | "ROOM_IMAGE"
  | "AMENITY_ICON"
  | "CONTRACT"
  | "RATE_SHEET"
  | "INVOICE"
  | "VOUCHER"
  | "IMPORT"
  | "OTHER";

export const listMedia = (query: Record<string, string | number | undefined> = {}) =>
  serverFetch<Paginated<ImageAsset | PrivateFile>>(`/api/admin/media${toQueryString(query)}`);

/**
 * Uploads one file.
 *
 * `category` decides visibility — a contract cannot be uploaded as public
 * however the caller asks — so there is deliberately no visibility parameter.
 */
export const uploadMedia = async (
  file: File,
  category: MediaCategory,
  altText?: string,
): Promise<ImageAsset | PrivateFile> => {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  if (altText) form.append("altText", altText);

  // Deliberately not through apiFetch: setting a content-type on a FormData
  // body strips the multipart boundary the browser generates.
  return apiFetch<ImageAsset | PrivateFile>("/api/admin/media", {
    method: "POST",
    rawBody: form,
  });
};

/** A short-lived signed link. The only way to reach a private file. */
export const getSignedUrl = (id: string) =>
  apiFetch<{ url: string; expiresAt: string }>(`/api/admin/media/${id}/url`);

export const deleteMedia = (id: string) =>
  apiFetch<void>(`/api/admin/media/${id}`, { method: "DELETE" });
