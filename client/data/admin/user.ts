import type { AdminUser } from "@/types";

/**
 * The signed-in operator.
 *
 * A fixture, not a session. There is no authentication in this prototype — the
 * sign-in screen accepts anything and this is who you become.
 */
export const adminUser: AdminUser = {
  name: "Tamar Gelashvili",
  email: "tamar@iamgeorgia.travel",
  role: "Operations lead",
  initials: "TG",
};
