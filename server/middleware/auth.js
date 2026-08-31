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

/**
 * The instant a session stops being renewable, no matter how recently it was
 * used. `touch` slides `expiresAt` forward; this is the wall it slides into.
 */
const absoluteDeadline = (session) =>
    session.createdAt.getTime() + config.auth.sessionAbsoluteTtlMs;

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

    // A sliding window with no ceiling renews indefinitely. Checked here rather
    // than left to `expiresAt` alone, because the whole point is that the row's
    // own expiry has been moved forward past this line.
    if (absoluteDeadline(session) <= Date.now()) {
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
 *
 * Never past the absolute deadline: the last renewal before a session's ninety
 * days are up shortens it to whatever is left rather than granting another
 * thirty, so the deadline is what actually ends it.
 */
const touch = async (session) => {
    const remaining = session.expiresAt.getTime() - Date.now();

    if (remaining > config.auth.sessionTtlMs / 2) {
        return;
    }

    const expiresAt = Math.min(Date.now() + config.auth.sessionTtlMs, absoluteDeadline(session));

    // Already at the ceiling — nothing to extend, and no write worth making.
    if (expiresAt <= session.expiresAt.getTime()) {
        return;
    }

    await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: new Date(expiresAt) }
    });
};

/**
 * Keeps an authenticated response out of every cache between here and the
 * browser.
 *
 * Express sets no cache headers on `res.json`, which leaves a shared proxy free
 * to apply its own heuristics to a 200 that happens to describe who is signed
 * in. Cheap insurance, applied wherever a session was resolved rather than
 * globally, so the public catalogue stays cacheable.
 */
const noStore = (res) => {
    res.set('Cache-Control', 'no-store');
    // `res.vary` appends; `res.set('Vary', …)` would overwrite whatever CORS
    // had already put there.
    res.vary('Cookie');
};

/**
 * The same thing as a middleware, for routes that answer with an identity
 * without going through `authenticate` — sign-in being the obvious one, which
 * returns both the session cookie and the user it belongs to.
 */
export const noStoreResponses = (req, res, next) => {
    noStore(res);
    next();
};

export const authenticate = async (req, res, next) => {
    const session = await resolveSession(req.cookies?.[config.auth.cookieName]);

    if (!session) {
        throw new UnauthorizedError('Authentication required');
    }

    req.user = session.user;
    req.session = session;
    noStore(res);
    await touch(session);

    next();
};

/** Resolves a session when one is present, but does not require it. */
export const optionalAuthenticate = async (req, res, next) => {
    const session = await resolveSession(req.cookies?.[config.auth.cookieName]);

    if (session) {
        req.user = session.user;
        req.session = session;
        noStore(res);
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
