import type { DriverQuery } from "@/lib/api/drivers";
import type { FleetQuery } from "@/lib/api/fleet";
import { featureLabels } from "@/lib/admin/transfers";
import type {
  DriverDocumentType,
  DriverLanguage,
  DriverPublic,
  DriverVerificationStatus,
  FleetVehicleFeature,
  VehicleDocumentType,
} from "@/types/driver";
import type { TransferStatus } from "@/types/transfer";

/**
 * Labels and URL parsing for the fleet and driver screens.
 *
 * The same contract as `lib/admin/transfers.ts`: the browser writes a query
 * string, the page re-renders on the server, unknown values are dropped
 * rather than rejected.
 */

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const positiveInt = (value: string | string[] | undefined, fallback: number) => {
  const parsed = Number.parseInt(first(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const FLEET_STATUSES: TransferStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];
const VERIFICATION_STATUSES: DriverVerificationStatus[] = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"];

export function fleetQueryFromParams(params: Params): FleetQuery {
  const status = first(params.status);
  const search = first(params.search)?.trim();
  const providerId = first(params.providerId)?.trim();

  return {
    ...(status && FLEET_STATUSES.includes(status as TransferStatus)
      ? { status: status as TransferStatus }
      : {}),
    ...(providerId ? { providerId } : {}),
    ...(search ? { search } : {}),
    page: positiveInt(params.page, 1),
    pageSize: positiveInt(params.pageSize, 25),
  };
}

export function driverQueryFromParams(params: Params): DriverQuery {
  const verification = first(params.verificationStatus);
  const isActive = first(params.isActive);
  const search = first(params.search)?.trim();
  const providerId = first(params.providerId)?.trim();

  return {
    ...(verification && VERIFICATION_STATUSES.includes(verification as DriverVerificationStatus)
      ? { verificationStatus: verification as DriverVerificationStatus }
      : {}),
    ...(isActive === "true" || isActive === "false" ? { isActive } : {}),
    ...(providerId ? { providerId } : {}),
    ...(search ? { search } : {}),
    page: positiveInt(params.page, 1),
    pageSize: positiveInt(params.pageSize, 25),
  };
}

/** The class vocabulary plus the one thing a specific car can promise that a class cannot. */
export const fleetFeatureLabels: Record<FleetVehicleFeature, string> = {
  ...featureLabels,
  wheelchairAccessible: "Wheelchair accessible",
};

export const fleetFeatureOptions = (Object.keys(fleetFeatureLabels) as FleetVehicleFeature[]).map(
  (value) => ({ value, label: fleetFeatureLabels[value] }),
);

/** A car's status, in the words a dispatcher uses. */
export const fleetStatusLabels: Record<TransferStatus, string> = {
  DRAFT: "Not yet on the road",
  ACTIVE: "On the road",
  INACTIVE: "Off the road",
  ARCHIVED: "Archived",
};

export const fleetStatusOptions = FLEET_STATUSES.map((value) => ({
  value,
  label: fleetStatusLabels[value],
}));

export const verificationLabels: Record<DriverVerificationStatus, string> = {
  UNVERIFIED: "Not checked",
  PENDING: "Checks in progress",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const verificationOptions = VERIFICATION_STATUSES.map((value) => ({
  value,
  label: verificationLabels[value],
}));

export const languageLabels: Record<DriverLanguage, string> = {
  ka: "Georgian",
  en: "English",
  ru: "Russian",
  he: "Hebrew",
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  ar: "Arabic",
  hy: "Armenian",
  az: "Azerbaijani",
  uk: "Ukrainian",
  pl: "Polish",
  zh: "Chinese",
  ja: "Japanese",
};

export const languageOptions = (Object.keys(languageLabels) as DriverLanguage[]).map((value) => ({
  value,
  label: languageLabels[value],
}));

export const driverDocumentTypeLabels: Record<DriverDocumentType, string> = {
  DRIVING_LICENCE: "Driving licence",
  ID_DOCUMENT: "ID document",
  MEDICAL: "Medical certificate",
  BACKGROUND_CHECK: "Background check",
  OTHER: "Other",
};

export const vehicleDocumentTypeLabels: Record<VehicleDocumentType, string> = {
  REGISTRATION: "Registration",
  INSURANCE: "Insurance",
  TECHNICAL_INSPECTION: "Technical inspection",
  OTHER: "Other",
};

export const driverDisplayName = (driver: Pick<DriverPublic, "firstName" | "lastName">) =>
  [driver.firstName, driver.lastName].filter(Boolean).join(" ");

/** "Toyota Camry · TB 123 AB" */
export const fleetVehicleLabel = (vehicle: { make: string; model: string; plateNumber: string }) =>
  `${vehicle.make} ${vehicle.model} · ${vehicle.plateNumber}`;
