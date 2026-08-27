import {
  Baby,
  Clock,
  Droplets,
  Languages,
  PlaneLanding,
  Snowflake,
  UserRoundCheck,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { TransferFeature } from "@/types";

/**
 * Icon per transfer feature. Labels live in the dictionary and always
 * accompany the glyph — the icon is a scanning aid, never the only carrier of
 * the information.
 */
export const featureIcons: Record<TransferFeature, LucideIcon> = {
  airConditioning: Snowflake,
  wifi: Wifi,
  childSeat: Baby,
  englishDriver: Languages,
  meetGreet: UserRoundCheck,
  flightTracking: PlaneLanding,
  bottledWater: Droplets,
  freeWaiting: Clock,
};
