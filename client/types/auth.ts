import type { DriverSelf } from "./driver";
import type { Partner, Role } from "./partner";

/** The signed-in account. Mirrors `server/serializers/user.js`. */
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string | null;
  phone: string | null;
  isPrimaryContact: boolean;
  isActive: boolean;
  partnerId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * What `GET /api/auth/me` returns, and the single source of truth for who the
 * viewer is. `partner` is null for admins and present for everyone attached to
 * a company, in *any* status — the portal decides what to render from
 * `partner.status`, and the server enforces the same rule independently.
 */
export interface Session {
  user: SessionUser;
  partner: Partner | null;
  /**
   * The driver profile behind a DRIVER account. Null for every other role, and
   * null for a driver whose account has not been linked to a profile yet.
   */
  driver: DriverSelf | null;
}

export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

/** Admins plus dispatchers: everyone who may run transfer operations. */
export const TRANSFER_OPS_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "DISPATCHER"];

export const isAdmin = (session: Session | null): boolean =>
  Boolean(session) && ADMIN_ROLES.includes(session!.user.role);

export const isTransferOps = (session: Session | null): boolean =>
  Boolean(session) && TRANSFER_OPS_ROLES.includes(session!.user.role);

export const isDriver = (session: Session | null): boolean =>
  session?.user.role === "DRIVER";

/** Where a signed-in account belongs, for redirects between the panels. */
export const homePathFor = (session: Session): string => {
  if (TRANSFER_OPS_ROLES.includes(session.user.role)) return "/admin";
  if (session.user.role === "DRIVER") return "/driver";
  if (session.partner) return "/portal";
  return "/";
};
