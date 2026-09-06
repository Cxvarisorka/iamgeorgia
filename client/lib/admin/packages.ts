import type { AdminPackageQuery } from "@/lib/api/packages";
import type {
  PackageAdjustmentKind,
  PackageAdjustmentScope,
  PackageComponentType,
  PackageQuantityRule,
  PackageStatus,
  PackageUnavailableReason,
  ShabbatMode,
  SlotReason,
} from "@/types/package";

/**
 * Display vocabulary for the package screens, mirroring `lib/admin/tours.ts`.
 *
 * The labels live here rather than in components so two screens cannot call
 * the same state different things, and so a Server Component can use them —
 * a component marked "use client" cannot export a constant into one.
 */

export const packageStatusLabels: Record<PackageStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "On sale",
  INACTIVE: "Off sale",
  ARCHIVED: "Archived",
};

export const PACKAGE_STATUSES: PackageStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];

export const componentTypeLabels: Record<PackageComponentType, string> = {
  HOTEL_STAY: "Hotel stay",
  TRANSFER: "Transfer",
  TOUR: "Tour",
  SERVICE: "Service",
};

export const quantityRuleLabels: Record<PackageQuantityRule, string> = {
  ONE: "One for the booking",
  PER_PERSON: "One per traveller",
  PER_ROOM: "One per room",
};

export const adjustmentKindLabels: Record<PackageAdjustmentKind, string> = {
  NONE: "No adjustment",
  DISCOUNT_BPS: "Percentage discount",
  FIXED_SELL: "Fixed package price",
  PER_PERSON_FIXED: "Fixed price per traveller",
};

/**
 * What the `adjustmentValue` field means for each kind, so the editor can
 * change its own unit rather than making the operator remember.
 */
export const adjustmentValueUnit: Record<PackageAdjustmentKind, "none" | "percent" | "money"> = {
  NONE: "none",
  DISCOUNT_BPS: "percent",
  FIXED_SELL: "money",
  PER_PERSON_FIXED: "money",
};

export const adjustmentScopeLabels: Record<PackageAdjustmentScope, string> = {
  REQUIRED_ONLY: "Required parts only",
  ALL_ITEMS: "Every part, optional included",
};

export const shabbatModeLabels: Record<ShabbatMode, string> = {
  SOLAR: "From local sunset",
  FIXED_HOURS: "Fixed hours",
  NONE: "No Shabbat rules",
};

export const unavailableReasonLabels: Record<PackageUnavailableReason, string> = {
  COMPONENT_UNAVAILABLE: "A part cannot be booked",
  ADJUSTMENT_BELOW_COST: "The adjustment puts the package below cost",
  KOSHER_INELIGIBLE: "Kosher requirements cannot be met",
};

export const slotReasonLabels: Record<SlotReason, string> = {
  EXCLUDED: "Excluded",
  UNAVAILABLE: "Unavailable",
  ROUTE_CLOSED: "Route closed",
  SOLD_OUT: "Sold out",
  PARTY_SIZE: "Party size",
  TOO_SOON: "Too soon",
  BEYOND_HORIZON: "Beyond horizon",
  PAST: "Past",
  UNPRICED: "No price for that date",
  QUANTITY: "Quantity out of range",
  NOT_FOUND: "No longer exists",
  INACTIVE: "Not on sale",
  CURRENCY: "Wrong currency",
};

/**
 * Problems a template save reports per slot, as `422 { problems: [...] }`.
 * Same vocabulary as a quote's slot reasons where they overlap, because a
 * template failing for a reason and a date failing for it are the same fact.
 */
export const problemLabel = (code: string): string =>
  code === "OUTSIDE_PACKAGE"
    ? "Falls outside the package's own dates"
    : code === "ENDPOINTS"
      ? "Needs both a start and an end point, or a route"
      : code === "TOUR"
        ? "Needs a tour"
        : code === "OPTIONS"
          ? "The tour has no option this slot allows"
          : (slotReasonLabels[code as SlotReason] ?? code);

// --- query parsing ----------------------------------------------------------

type ParamValue = string | string[] | undefined;

const first = (value: ParamValue): string | undefined => (Array.isArray(value) ? value[0] : value);

const asList = (value: ParamValue): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/** The register's URL, read into the shape `listPackages` wants. */
export function packageQueryFromParams(params: Record<string, ParamValue>): AdminPackageQuery {
  const statuses = asList(params.status).filter((value): value is PackageStatus =>
    (PACKAGE_STATUSES as string[]).includes(value),
  );
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  const kosher = first(params.kosher);

  return {
    status: statuses.length > 0 ? statuses : undefined,
    search: first(params.search) || undefined,
    destinationId: first(params.destinationId) || undefined,
    // Absent means "either", which is not the same as false.
    kosher: kosher === "true" ? true : kosher === "false" ? false : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 25,
  };
}

/** The card image for a package: the gallery cover, else the editorial path. */
export function packageCardImage(pkg: {
  image: string | null;
  coverImage: { url: string; variants: { variant: string; url: string }[] } | null;
}): string | null {
  if (pkg.coverImage) {
    return (
      pkg.coverImage.variants.find((variant) => variant.variant === "card")?.url ??
      pkg.coverImage.url
    );
  }

  return pkg.image || null;
}
