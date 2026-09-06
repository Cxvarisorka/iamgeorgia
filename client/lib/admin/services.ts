import type { AdminServiceQuery } from "@/lib/api/services";
import type { ServiceBasis, ServiceCategory, ServiceStatus } from "@/types/service";

/**
 * Display vocabulary for the service screens, mirroring `lib/admin/tours.ts`.
 *
 * The labels live here rather than in components so the register and the
 * editor cannot call the same state different things.
 */

export const serviceStatusLabels: Record<ServiceStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "On sale",
  INACTIVE: "Off sale",
  ARCHIVED: "Archived",
};

export const SERVICE_STATUSES: ServiceStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];

/**
 * On-request means here exactly what it means on a tour — the booking is
 * written PENDING and an operator answers it — so the wording is borrowed
 * rather than written a second time.
 */
export { confirmationModeLabels } from "./tours";

export const serviceCategoryLabels: Record<ServiceCategory, string> = {
  KOSHER_MEAL_DELIVERY: "Kosher meal delivery",
  SHABBAT_MEALS: "Shabbat meals",
  MASHGIACH: "Mashgiach",
  SYNAGOGUE_TRANSFER: "Synagogue transfer",
  GUIDE: "Guide",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

export const SERVICE_CATEGORIES = Object.keys(serviceCategoryLabels) as ServiceCategory[];

export const serviceCategoryOptions = SERVICE_CATEGORIES.map((value) => ({
  value,
  label: serviceCategoryLabels[value],
}));

export const serviceBasisLabels: Record<ServiceBasis, string> = {
  PER_PERSON: "Per person",
  PER_GROUP: "Per group",
  PER_DAY: "Per day",
  PER_PERSON_PER_DAY: "Per person, per day",
};

export const serviceBasisOptions = (Object.keys(serviceBasisLabels) as ServiceBasis[]).map(
  (value) => ({ value, label: serviceBasisLabels[value] }),
);

/**
 * What one unit *is*, in the operator's own terms.
 *
 * The basis is the field that gets a service mispriced: the price entered is
 * the price of one unit, and four bases disagree about what a unit is. A
 * mashgiach priced per day at ₾400 and a mashgiach priced per person per day
 * at ₾400 are an order of magnitude apart for the same booking, and nothing
 * on the screen says so unless it is written out.
 */
export const serviceBasisHints: Record<ServiceBasis, string> = {
  PER_PERSON: "One unit per traveller. The number of days makes no difference.",
  PER_GROUP: "One unit for the whole booking, however many travel and however long they stay.",
  PER_DAY: "One unit per day. The size of the party makes no difference.",
  PER_PERSON_PER_DAY: "Travellers multiplied by days — the two together.",
};

/**
 * Units a basis produces for a party and a length, mirroring `unitsFor` in
 * `server/services/service/pricing.service.js`.
 *
 * Quantity is fixed at one here: this exists to work an example on the editor,
 * and a second multiplier in the sentence would obscure the thing the sentence
 * is trying to explain.
 */
export const serviceUnits = (basis: ServiceBasis, pax: number, days: number): number => {
  switch (basis) {
    case "PER_PERSON":
      return pax;
    case "PER_DAY":
      return days;
    case "PER_PERSON_PER_DAY":
      return pax * days;
    case "PER_GROUP":
    default:
      return 1;
  }
};

const read = (params: Record<string, string | string[] | undefined>, key: string) => {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
};

/** Reads the register query out of the URL, dropping anything unrecognised. */
export function serviceQueryFromParams(
  params: Record<string, string | string[] | undefined>,
): AdminServiceQuery {
  const status = read(params, "status");
  const category = read(params, "category");
  const page = Number.parseInt(read(params, "page") ?? "", 10);

  return {
    search: read(params, "search") || undefined,
    status: SERVICE_STATUSES.includes(status as ServiceStatus)
      ? (status as ServiceStatus)
      : undefined,
    category: SERVICE_CATEGORIES.includes(category as ServiceCategory)
      ? (category as ServiceCategory)
      : undefined,
    // The endpoint reads the kosher filter as `isKosher`; `ServiceQuery.kosher`
    // is not a name the validator answers to, and an unknown key is stripped
    // rather than refused — a filter that silently does nothing. Sent under the
    // name the server expects, and only when it is on, because `isKosher=false`
    // would hide every service that simply has no kosher supervision.
    ...(read(params, "kosher") === "true" ? { isKosher: true } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 25,
  };
}
