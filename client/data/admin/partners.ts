import type { FulfilmentPartner } from "@/types";

/**
 * Suppliers the prototype bookings point at.
 *
 * Partner records themselves are live now — they come from the API, and the
 * partners section of the panel reads them from there. What remains here is
 * only what the *mock bookings* need to render: a booking fixture references
 * `pt-003`, and that id belongs to no real company, so it has to resolve
 * against a fixture too.
 *
 * This module goes away with the last mock booking, not before.
 */
export const fulfilmentPartners: FulfilmentPartner[] = [
  { id: "pt-001", name: "Caucasus Trails", kind: "Tour operator", city: "Tbilisi" },
  { id: "pt-002", name: "Vera Hospitality Group", kind: "Hotel", city: "Tbilisi" },
  { id: "pt-003", name: "Highland Rooms", kind: "Hotel", city: "Stepantsminda" },
  { id: "pt-004", name: "Georgian Transfer", kind: "Transport", city: "Tbilisi" },
  { id: "pt-005", name: "Tbilisi Premium Transfers", kind: "Transport", city: "Tbilisi" },
];

export function getFulfilmentPartner(id: string | undefined): FulfilmentPartner | undefined {
  if (!id) return undefined;
  return fulfilmentPartners.find((partner) => partner.id === id);
}
