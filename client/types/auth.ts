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
}

export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

export const isAdmin = (session: Session | null): boolean =>
  Boolean(session) && ADMIN_ROLES.includes(session!.user.role);
