import { listHotelRatePlansClient, listHotelsClient, listRoomTypesClient } from "@/lib/api/hotels";
import { listServicesClient } from "@/lib/api/services";
import { getTourClient, listToursClient } from "@/lib/api/tours";
import {
  listAdminTransferPointsClient,
  listAdminTransferRoutesClient,
} from "@/lib/api/transfers";
import { serviceCategoryLabels } from "./services";
import type { PickerOption } from "@/components/admin/EntityPicker";

/**
 * The catalogue as a picker sees it.
 *
 * One module, because five screens all want "search the hotels and give me
 * something with a name on it", and each one writing its own mapping is how
 * the same record ends up labelled two different ways in two places. Each
 * function returns `PickerOption`, so a picker never learns the shape of what
 * it is choosing from.
 *
 * Archived records are filtered out where the endpoint can express it: an
 * archived product cannot be sold, so offering one as a constraint would only
 * build a slot that never resolves. Drafts stay in — a package is routinely
 * assembled alongside the hotel it sells — and carry a badge saying so.
 */

const PAGE_SIZE = 20;

/** `DRAFT` and `INACTIVE` are worth flagging on the row; `ACTIVE` is the norm. */
const statusBadge = (status: string | undefined): string | null => {
  if (!status || status === "ACTIVE") return null;

  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const searchHotelOptions = async (term: string): Promise<PickerOption[]> => {
  const { data } = await listHotelsClient({
    ...(term ? { search: term } : {}),
    status: ["ACTIVE", "DRAFT", "INACTIVE"],
    pageSize: PAGE_SIZE,
  });

  return data.map((hotel) => ({
    id: hotel.id,
    label: hotel.name,
    meta: hotel.destination?.name ?? hotel.countryCode,
    badge: statusBadge(hotel.status),
  }));
};

export const searchTourOptions = async (term: string): Promise<PickerOption[]> => {
  const { data } = await listToursClient({
    ...(term ? { search: term } : {}),
    status: ["ACTIVE", "DRAFT", "INACTIVE"],
    pageSize: PAGE_SIZE,
  });

  return data.map((tour) => ({
    id: tour.id,
    label: tour.title,
    meta: tour.location,
    badge: statusBadge(tour.status),
  }));
};

export const searchServiceOptions = async (term: string): Promise<PickerOption[]> => {
  const { data } = await listServicesClient({
    ...(term ? { search: term } : {}),
    status: ["ACTIVE", "DRAFT", "INACTIVE"],
    pageSize: PAGE_SIZE,
  });

  return data.map((service) => ({
    id: service.id,
    label: service.name,
    meta: service.destination?.name ?? serviceCategoryLabels[service.category],
    badge: statusBadge(service.status),
  }));
};

/**
 * Transfer points.
 *
 * The admin listing has no status filter, so retired points are dropped here
 * rather than server-side — they are a small minority, and a package slot must
 * not be pinned to one.
 */
export const searchTransferPointOptions = async (term: string): Promise<PickerOption[]> => {
  const { data } = await listAdminTransferPointsClient(term ? { search: term } : {});

  return data
    .filter((point) => point.status !== "ARCHIVED")
    .slice(0, PAGE_SIZE)
    .map((point) => ({
      id: point.id,
      label: point.name,
      meta: point.region,
      badge: point.code ?? statusBadge(point.status),
    }));
};

export const searchTransferRouteOptions = async (term: string): Promise<PickerOption[]> => {
  const { data } = await listAdminTransferRoutesClient({
    ...(term ? { search: term } : {}),
    pageSize: PAGE_SIZE,
  });

  return data
    .filter((route) => route.status !== "ARCHIVED")
    .map((route) => ({
      id: route.id,
      label: route.title ?? `${route.from.name} → ${route.to.name}`,
      meta: route.title ? `${route.from.name} → ${route.to.name}` : route.slug,
      badge: statusBadge(route.status),
    }));
};

// --- bounded lists, hanging off something already chosen --------------------

export const loadRoomTypeOptions = async (hotelId: string): Promise<PickerOption[]> => {
  const { data } = await listRoomTypesClient(hotelId);

  return data
    .filter((roomType) => roomType.status !== "ARCHIVED")
    .map((roomType) => ({ id: roomType.id, label: roomType.name, meta: roomType.code }));
};

export const loadRatePlanOptions = async (hotelId: string): Promise<PickerOption[]> => {
  const { data } = await listHotelRatePlansClient(hotelId);

  // Two rooms in one hotel routinely carry a plan of the same name, so the
  // room is part of the label rather than a tooltip on it.
  return data.map((ratePlan) => ({
    id: ratePlan.id,
    label: ratePlan.name,
    meta: ratePlan.roomType.name,
  }));
};

export const loadTourOptionOptions = async (tourId: string): Promise<PickerOption[]> => {
  const tour = await getTourClient(tourId);

  return tour.options
    .filter((option) => option.status !== "ARCHIVED")
    .map((option) => ({ id: option.id, label: option.name, meta: option.code }));
};
