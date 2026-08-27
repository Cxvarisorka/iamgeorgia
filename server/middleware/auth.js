import { config } from '../config.js';
import { prisma } from '../db/index.js';
import { hashToken } from '../lib/tokens.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
export const PARTNER_ROLES = ['PARTNER_OWNER', 'PARTNER_ADMIN', 'PARTNER_AGENT', 'PARTNER_FINANCE'];

/** Roles allowed to see a partner's bank details. */
export const FINANCIAL_ROLES = [...ADMIN_ROLES, 'PARTNER_OWNER', 'PARTNER_FINANCE'];

/**
 * Whether a viewer is platform staff.
 *
 * Lives here next to the role lists rather than in a serializer, because more
 * than one serializer now decides what to show on the strength of it and an
 * authorization predicate kept in two places is one that eventually disagrees
 * with itself. Takes a viewer that may be undefined: an anonymous caller is
 * simply not an admin.
 */
export const isAdmin = (viewer) => Boolean(viewer) && ADMIN_ROLES.includes(viewer.role);

/** Roles that may edit a supplier's own inventory, rates and content. */
export const SUPPLIER_MANAGE_ROLES = ['PARTNER_OWNER', 'PARTNER_ADMIN'];

/**
 * Whether a viewer owns this hotel.
 *
 * The `supplierId` comparison is the whole check, and it is what stops one
 * approved supplier reaching another's property by changing an id in a URL.
 * A hotel with no supplier belongs to the platform and only admins reach it.
 */
export const ownsHotel = (viewer, hotel) =>
    Boolean(viewer?.partnerId) && Boolean(hotel?.supplierId) && hotel.supplierId === viewer.partnerId;

/**
 * Whether a viewer may see the supplier side of the money.
 *
 * Admins always. A supplier for its own properties, because the net rate is
 * *its* rate — what it contracted with us — and hiding a supplier's own cost
 * from it would be absurd. Nobody else, ever: a guest seeing the net rate sees
 * the margin.
 */
export const canViewNetRates = (viewer, hotel) => isAdmin(viewer) || ownsHotel(viewer, hotel);

const resolveSession = async (token) => {
    if (!token) {
        return null;
    }

    const session = await prisma.session.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: { include: { partner: true } } }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        return null;
    }

    // A deactivated account must lose access on its next request, not when its
    // cookie happens to expire. This is the whole reason sessions live in the
    // database rather than in a signed token.
    if (!session.user.isActive) {
        return null;
    }

    return session;
};

/**
 * Slides the expiry forward once a session is past its halfway point, so an
 * active user is not signed out mid-task, without writing to the row on every
 * single request.
 */
const touch = async (session) => {
    const remaining = session.expiresAt.getTime() - Date.now();

    if (remaining > config.auth.sessionTtlMs / 2) {
        return;
    }

    await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: new Date(Date.now() + config.auth.sessionTtlMs) }
    });
};

export const authenticate = async (req, res, next) => {
    const session = await resolveSession(req.cookies?.[config.auth.cookieName]);

    if (!session) {
        throw new UnauthorizedError('Authentication required');
    }

    req.user = session.user;
    req.session = session;
    await touch(session);

    next();
};

/** Resolves a session when one is present, but does not require it. */
export const optionalAuthenticate = async (req, res, next) => {
    const session = await resolveSession(req.cookies?.[config.auth.cookieName]);

    if (session) {
        req.user = session.user;
        req.session = session;
    }

    next();
};

export const requireRole =
    (...roles) =>
    (req, res, next) => {
        if (!req.user) {
            throw new UnauthorizedError('Authentication required');
        }

        if (!roles.includes(req.user.role)) {
            throw new ForbiddenError('Insufficient permissions');
        }

        next();
    };

export const requireAdmin = requireRole(...ADMIN_ROLES);

/**
 * Gates the B2B platform itself.
 *
 * A PENDING_APPROVAL partner is deliberately allowed to sign in and read
 * `/api/partner/me` — that is what renders the "application under review"
 * page — but nothing behind this middleware. The status travels in `details`
 * so the client can route to the right explanation instead of showing a bare
 * "forbidden", while the decision itself stays on the server.
 */
export const requireApprovedPartner = (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError('Authentication required');
    }

    if (ADMIN_ROLES.includes(req.user.role)) {
        return next();
    }

    const status = req.user.partner?.status;

    if (status !== 'APPROVED') {
        throw new ForbiddenError('Partner account is not active', { partnerStatus: status ?? null });
    }

    next();
};
