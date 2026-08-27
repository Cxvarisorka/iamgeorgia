import { prisma } from '../../db/index.js';
import { AUDIT_ENTITY, recordAudit } from '../../lib/audit.js';
import { NotFoundError, UnprocessableEntityError } from '../../lib/errors.js';
import { localise } from '../../serializers/localise.js';
import { localisePoint } from './point.service.js';
import { routeMetrics } from './pricing.service.js';

/**
 * Named routes — the operator's catalogue.
 *
 * A route is not required to sell a transfer: the distance engine will price
 * any pair of points, and that is deliberate, because a catalogue that has to
 * be exhaustive before it is useful never becomes either. What a route adds is
 * everything a bare pair cannot carry — a curated price per class, a sales
 * tier, an indexable URL, editorial copy and intermediate stops.
 */

const TRANSLATED_FIELDS = ['title', 'summary', 'description'];

const routeInclude = {
    translations: true,
    fromPoint: { include: { translations: true } },
    toPoint: { include: { translations: true } },
    stops: {
        include: { point: { include: { translations: true } } },
        orderBy: { position: 'asc' }
    },
    prices: { where: { isActive: true } }
};

const localiseRoute = (route, locale) => {
    const { translations, fromPoint, toPoint, stops, ...base } = route;

    return {
        ...localise(base, translations, locale, TRANSLATED_FIELDS),
        fromPoint: localisePoint(fromPoint, locale),
        toPoint: localisePoint(toPoint, locale),
        stops: (stops ?? []).map((stop) => ({
            id: stop.id,
            position: stop.position,
            dwellMinutes: stop.dwellMinutes,
            point: localisePoint(stop.point, locale)
        }))
    };
};

export const listRoutes = async ({
    tier,
    category,
    featured,
    fromSlug,
    toSlug,
    search,
    locale,
    includeDrafts = false,
    page = 1,
    pageSize = 24
} = {}) => {
    const where = {
        ...(includeDrafts ? {} : { status: 'ACTIVE' }),
        ...(tier ? { tier: Array.isArray(tier) ? { in: tier } : tier } : {}),
        ...(category ? { category: Array.isArray(category) ? { in: category } : category } : {}),
        ...(featured === true ? { featured: true } : {}),
        ...(fromSlug ? { fromPoint: { slug: fromSlug } } : {}),
        ...(toSlug ? { toPoint: { slug: toSlug } } : {}),
        ...(search
            ? {
                  OR: [
                      { title: { contains: search, mode: 'insensitive' } },
                      { fromPoint: { name: { contains: search, mode: 'insensitive' } } },
                      { toPoint: { name: { contains: search, mode: 'insensitive' } } }
                  ]
              }
            : {})
    };

    const [total, routes] = await Promise.all([
        prisma.transferRoute.count({ where }),
        prisma.transferRoute.findMany({
            where,
            include: routeInclude,
            // Tier is a sales priority, so it is also the default order: the
            // routes that carry the business come first.
            orderBy: [{ tier: 'asc' }, { featured: 'desc' }, { distanceKm: 'asc' }],
            skip: (page - 1) * pageSize,
            take: pageSize
        })
    ]);

    return {
        routes: routes.map((route) => localiseRoute(route, locale)),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
};

export const findRouteOr404 = async (idOrSlug, { locale, includeDrafts = false } = {}) => {
    const route = await prisma.transferRoute.findFirst({
        where: {
            ...(includeDrafts ? {} : { status: 'ACTIVE' }),
            OR: [{ id: idOrSlug }, { slug: idOrSlug }]
        },
        include: routeInclude
    });

    if (!route) {
        throw new NotFoundError('That route does not exist');
    }

    return localiseRoute(route, locale);
};

/**
 * The curated route for a pair of points, if there is one.
 *
 * Directional, and only directional. The reverse leg is its own row because it
 * is priced, described and sold separately — an airport arrival at midnight and
 * an airport departure at dawn are not the same product, and quietly reusing
 * one for the other would mean a price nobody set.
 *
 * COMBINED routes are excluded, which is the whole reason the endpoint pair is
 * not globally unique. Somebody asking for a car from Tbilisi to Telavi wants
 * the two-hour drive, not the day trip that reaches Telavi at dusk by way of
 * three wineries — even though both are Tbilisi to Telavi. Multi-stop
 * itineraries are browsed and booked by their own slug.
 *
 * Returns null rather than throwing: no curated route is the ordinary case, and
 * the distance engine takes it from there.
 */
export const findCuratedRoute = (fromPointId, toPointId) =>
    prisma.transferRoute.findFirst({
        where: { fromPointId, toPointId, status: 'ACTIVE', category: { not: 'COMBINED' } },
        include: routeInclude
    });

/**
 * Blackout windows covering a journey, for the route and every candidate
 * vehicle at once.
 *
 * One query rather than one per candidate, so a search across nine classes
 * still costs a single round trip. The OR arms are built conditionally because
 * an uncurated journey has no route to close, and `routeId: undefined` would
 * quietly match every row rather than none.
 */
export const findBlackouts = ({ routeId, vehicleIds = [], from, to }) => {
    const targets = [...(routeId ? [{ routeId }] : []), ...(vehicleIds.length > 0 ? [{ vehicleId: { in: vehicleIds } }] : [])];

    if (targets.length === 0) {
        return Promise.resolve([]);
    }

    return prisma.transferBlackout.findMany({
        where: {
            OR: targets,
            // Overlap, not containment: a closure that starts mid-journey still
            // closes the road for it.
            from: { lte: to },
            to: { gte: from }
        }
    });
};

export const createRoute = async (input, actor, req) => {
    const route = await prisma.$transaction(async (tx) => {
        const [fromPoint, toPoint] = await Promise.all([
            tx.transferPoint.findUnique({ where: { id: input.fromPointId } }),
            tx.transferPoint.findUnique({ where: { id: input.toPointId } })
        ]);

        if (!fromPoint || !toPoint) {
            throw new NotFoundError('One of those pick-up points does not exist');
        }

        // Seeded from the coordinates so a new route is immediately quotable,
        // and overridable afterwards by an admin who knows the road.
        const derived = routeMetrics(fromPoint, toPoint);

        const created = await tx.transferRoute.create({
            data: {
                ...input,
                distanceKm: input.distanceKm ?? derived.distanceKm,
                durationMinutes: input.durationMinutes ?? derived.durationMinutes
            },
            include: routeInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_ROUTE_CREATED',
            actor,
            entityType: AUDIT_ENTITY.transferRoute,
            entityId: created.id,
            summary: `Created route ${fromPoint.name} to ${toPoint.name}`,
            req
        });

        return created;
    });

    return localiseRoute(route, null);
};

export const updateRoute = async (id, input, actor, req) => {
    const route = await prisma.$transaction(async (tx) => {
        const existing = await tx.transferRoute.findUnique({ where: { id } });

        if (!existing) {
            throw new NotFoundError('That route does not exist');
        }

        const updated = await tx.transferRoute.update({
            where: { id },
            data: input,
            include: routeInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_ROUTE_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.transferRoute,
            entityId: id,
            summary: `Updated route ${updated.slug}`,
            metadata: { fields: Object.keys(input) },
            req
        });

        return updated;
    });

    return localiseRoute(route, null);
};

/**
 * What is missing before a route can be sold.
 *
 * The same shape as the hotel publish checklist, and for the same reason: a
 * route that goes live without a price falls through to the distance engine,
 * which will quote something plausible that nobody agreed to. Better to say so
 * before it is published than to discover it in a booking.
 */
export const routeChecklist = (route) => {
    const missing = [];

    if (!route.prices || route.prices.length === 0) {
        missing.push({
            code: 'NO_PRICES',
            message: 'No vehicle class has a price on this route — fares would fall back to the distance estimate'
        });
    }

    if (!route.title) {
        missing.push({ code: 'NO_TITLE', message: 'The route has no title for its landing page' });
    }

    if (!route.summary) {
        missing.push({ code: 'NO_SUMMARY', message: 'The route has no summary for search results and metadata' });
    }

    return missing;
};

export const publishRoute = async (id, actor, req) => {
    const route = await prisma.$transaction(async (tx) => {
        const existing = await tx.transferRoute.findUnique({ where: { id }, include: routeInclude });

        if (!existing) {
            throw new NotFoundError('That route does not exist');
        }

        const missing = routeChecklist(existing);

        // Only the price is a hard blocker. Missing copy makes a thin landing
        // page; a missing price makes an invented fare.
        const blocking = missing.filter((entry) => entry.code === 'NO_PRICES');

        if (blocking.length > 0) {
            throw new UnprocessableEntityError('This route is not ready to publish', { missing: blocking });
        }

        const updated = await tx.transferRoute.update({
            where: { id },
            data: { status: 'ACTIVE' },
            include: routeInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_ROUTE_PUBLISHED',
            actor,
            entityType: AUDIT_ENTITY.transferRoute,
            entityId: id,
            summary: `Published route ${updated.slug}`,
            req
        });

        return updated;
    });

    return localiseRoute(route, null);
};

const setRouteStatus = (action, status, verb) => async (id, actor, req) => {
    const route = await prisma.$transaction(async (tx) => {
        const existing = await tx.transferRoute.findUnique({ where: { id } });

        if (!existing) {
            throw new NotFoundError('That route does not exist');
        }

        const updated = await tx.transferRoute.update({
            where: { id },
            data: { status },
            include: routeInclude
        });

        await recordAudit(tx, {
            action,
            actor,
            entityType: AUDIT_ENTITY.transferRoute,
            entityId: id,
            summary: `${verb} route ${updated.slug}`,
            req
        });

        return updated;
    });

    return localiseRoute(route, null);
};

export const unpublishRoute = setRouteStatus('TRANSFER_ROUTE_UNPUBLISHED', 'INACTIVE', 'Unpublished');
export const archiveRoute = setRouteStatus('TRANSFER_ROUTE_ARCHIVED', 'ARCHIVED', 'Archived');

/**
 * Replaces the price grid for one route.
 *
 * A whole-grid PUT rather than per-row PATCHes: the admin screen is a table of
 * every class against one route, and sending it back as one body means a
 * half-applied grid is impossible.
 */
export const setRoutePrices = async (id, prices, actor, req) => {
    const route = await prisma.$transaction(async (tx) => {
        const existing = await tx.transferRoute.findUnique({ where: { id } });

        if (!existing) {
            throw new NotFoundError('That route does not exist');
        }

        const vehicleIds = prices.map((price) => price.vehicleId);
        const known = await tx.transferVehicle.count({ where: { id: { in: vehicleIds } } });

        if (known !== new Set(vehicleIds).size) {
            throw new NotFoundError('One of those vehicle classes does not exist');
        }

        await tx.transferRoutePrice.deleteMany({ where: { routeId: id } });

        if (prices.length > 0) {
            await tx.transferRoutePrice.createMany({
                data: prices.map((price) => ({ ...price, routeId: id }))
            });
        }

        await recordAudit(tx, {
            action: 'TRANSFER_ROUTE_PRICED',
            actor,
            entityType: AUDIT_ENTITY.transferRoute,
            entityId: id,
            summary: `Priced route ${existing.slug} across ${prices.length} vehicle classes`,
            metadata: { vehicleIds },
            req
        });

        return tx.transferRoute.findUnique({ where: { id }, include: routeInclude });
    });

    return localiseRoute(route, null);
};

/**
 * Replaces the intermediate stops on a route.
 *
 * Positions are renumbered from the array order rather than trusted from the
 * body, because the unique constraint is on (route, position) and a client that
 * sends two stops at position 2 should get a reordered route, not a 409.
 */
export const setRouteStops = async (id, stops, actor, req) => {
    const route = await prisma.$transaction(async (tx) => {
        const existing = await tx.transferRoute.findUnique({ where: { id } });

        if (!existing) {
            throw new NotFoundError('That route does not exist');
        }

        await tx.transferRouteStop.deleteMany({ where: { routeId: id } });

        if (stops.length > 0) {
            await tx.transferRouteStop.createMany({
                data: stops.map((stop, index) => ({
                    routeId: id,
                    pointId: stop.pointId,
                    position: index + 1,
                    dwellMinutes: stop.dwellMinutes ?? 0
                }))
            });
        }

        await recordAudit(tx, {
            action: 'TRANSFER_ROUTE_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.transferRoute,
            entityId: id,
            summary: `Set ${stops.length} stops on route ${existing.slug}`,
            req
        });

        return tx.transferRoute.findUnique({ where: { id }, include: routeInclude });
    });

    return localiseRoute(route, null);
};

/**
 * Reprices many routes at once.
 *
 * With three hundred and ninety-six routes and nine classes, a per-row editor
 * is not a workflow — pricing the Tier 1 airport runs by hand is three and a
 * half thousand keystrokes. This applies either a per-kilometre rate or a flat
 * fare across everything matching a filter.
 *
 * Two safeguards, both because this is the most destructive thing in the panel:
 *
 *   * the filter is required and there is no "everything" option, so the whole
 *     catalogue cannot be repriced by a mis-click;
 *   * `overwrite` defaults to false, so the ordinary use fills in gaps and
 *     leaves every figure someone has already set.
 */
export const bulkPriceRoutes = async (input, actor, req) => {
    const { tier, category, routeIds, vehicleIds, perKmCents, flatCents, minimumCents, overwrite } = input;

    const routes = await prisma.transferRoute.findMany({
        where: {
            ...(tier ? { tier: Array.isArray(tier) ? { in: tier } : tier } : {}),
            ...(category ? { category: Array.isArray(category) ? { in: category } : category } : {}),
            ...(routeIds?.length ? { id: { in: routeIds } } : {}),
            status: { not: 'ARCHIVED' }
        },
        include: { prices: true }
    });

    const vehicles = await prisma.transferVehicle.findMany({ where: { id: { in: vehicleIds } } });

    if (vehicles.length !== new Set(vehicleIds).size) {
        throw new NotFoundError('One of those vehicle classes does not exist');
    }

    let written = 0;
    let kept = 0;

    await prisma.$transaction(async (tx) => {
        for (const route of routes) {
            const existing = new Map(route.prices.map((price) => [price.vehicleId, price]));

            for (const vehicle of vehicles) {
                if (existing.has(vehicle.id) && !overwrite) {
                    kept += 1;
                    continue;
                }

                const computed = flatCents ?? route.distanceKm * perKmCents;
                const oneWayCents = Math.max(computed, minimumCents ?? 1);

                await tx.transferRoutePrice.upsert({
                    where: { routeId_vehicleId: { routeId: route.id, vehicleId: vehicle.id } },
                    create: {
                        routeId: route.id,
                        vehicleId: vehicle.id,
                        oneWayCents,
                        currency: vehicle.currency
                    },
                    update: { oneWayCents }
                });

                written += 1;
            }
        }

        await recordAudit(tx, {
            action: 'TRANSFER_ROUTE_PRICED',
            actor,
            entityType: AUDIT_ENTITY.transferRoute,
            // A bulk edit has no single subject, so the audit row names the
            // filter instead. Without this the trail would say a price changed
            // and not which ones.
            entityId: 'bulk',
            summary: `Repriced ${written} route prices across ${routes.length} routes`,
            metadata: { tier, category, vehicleIds, perKmCents, flatCents, overwrite, written, kept },
            req
        });
    });

    return { routes: routes.length, written, kept };
};

export const upsertRouteTranslation = async (id, locale, input) => {
    const route = await prisma.transferRoute.findUnique({ where: { id } });

    if (!route) {
        throw new NotFoundError('That route does not exist');
    }

    await prisma.transferRouteTranslation.upsert({
        where: { routeId_locale: { routeId: id, locale } },
        create: { routeId: id, locale, ...input },
        update: input
    });

    return findRouteOr404(id, { includeDrafts: true });
};

export { localiseRoute, routeInclude, TRANSLATED_FIELDS as ROUTE_TRANSLATED_FIELDS };
