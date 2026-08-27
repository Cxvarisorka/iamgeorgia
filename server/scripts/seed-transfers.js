/**
 * Seeds the transfer catalogue: points, providers, vehicle classes, extras,
 * routes and an opening price for every one of them.
 *
 *     node scripts/seed-transfers.js
 *
 * Idempotent by slug, and it **never deletes**. Re-running it refreshes the
 * editorial fields and leaves everything an admin has since changed — including
 * every curated price — exactly where it was. That asymmetry is deliberate and
 * is the same rule `seed-reference.js` follows: a seed that overwrote prices
 * would silently undo an afternoon of pricing work the first time someone ran
 * it against a live database.
 *
 * Prices are seeded from the distance engine rather than left blank, so the
 * catalogue opens with a plausible fare on every route that an admin then tunes
 * — a blank grid across three hundred routes is not a starting point anyone can
 * work from.
 *
 * Prerequisite: `node scripts/seed-reference.js`, for the shared cancellation
 * policy templates the vehicle classes attach to.
 */

import { prisma, connect, disconnect } from '../db/index.js';
import { logger } from '../lib/logger.js';
import { TRANSFER_POINTS } from '../db/seed/transfers/points.js';
import { TRANSFER_PROVIDERS, TRANSFER_VEHICLES } from '../db/seed/transfers/vehicles.js';
import { TRANSFER_EXTRAS } from '../db/seed/transfers/extras.js';
import { expandRoutes } from '../db/seed/transfers/routes.js';
import { legFare, routeMetrics } from '../services/transfer/pricing.service.js';

// The fixtures are priced in US dollars; the operator contracts in GEL. Same
// rate `seed-catalogue.js` uses, kept in step with it on purpose.
const GEL_PER_USD = 2.7;

/** Fares round to the nearest 5 GEL — a quoted 137.43 GEL reads as a bug. */
const usdToFareCents = (usd) => Math.round((usd * GEL_PER_USD * 100) / 500) * 500;

/** Per-kilometre rates need the cents: rounding these to 5 GEL would be absurd. */
const usdToCents = (usd) => Math.round(usd * GEL_PER_USD * 100);

const seedPoints = async () => {
    const destinations = await prisma.destination.findMany({ select: { id: true, slug: true } });
    const bySlug = new Map(destinations.map((row) => [row.slug, row.id]));

    let created = 0;

    for (const point of TRANSFER_POINTS) {
        const { destination, region, ...rest } = point;
        const data = {
            ...rest,
            regionLabel: region,
            // A destination that has not been seeded yet is not an error: the
            // marketing tree and the transfer network are allowed to disagree
            // about which places matter.
            destinationId: destination ? (bySlug.get(destination) ?? null) : null
        };

        const existing = await prisma.transferPoint.findUnique({ where: { slug: point.slug } });

        if (!existing) created += 1;

        await prisma.transferPoint.upsert({
            where: { slug: point.slug },
            create: data,
            // Status is left alone: a point an admin has retired stays retired.
            update: {
                name: data.name,
                kind: data.kind,
                iataCode: data.iataCode ?? null,
                regionLabel: data.regionLabel,
                latitude: data.latitude,
                longitude: data.longitude,
                popular: data.popular ?? false,
                destinationId: data.destinationId
            }
        });
    }

    logger.info(`Points: ${TRANSFER_POINTS.length} upserted (${created} new)`);
};

const seedProviders = async () => {
    for (const provider of TRANSFER_PROVIDERS) {
        await prisma.transferProvider.upsert({
            where: { slug: provider.slug },
            create: provider,
            update: provider
        });
    }

    logger.info(`Providers: ${TRANSFER_PROVIDERS.length} upserted`);
};

const seedVehicles = async () => {
    const providers = await prisma.transferProvider.findMany({ select: { id: true, slug: true } });
    const bySlug = new Map(providers.map((row) => [row.slug, row.id]));

    // The platform-level flexible policy, shared with hotels. Transfers need a
    // deadline rather than a tier ladder, so the flexible template is the right
    // one and there is nothing transfer-specific to create.
    const policy = await prisma.cancellationPolicy.findFirst({
        where: { hotelId: null, kind: 'FLEXIBLE', isActive: true }
    });

    if (!policy) {
        logger.warn('No shared FLEXIBLE cancellation policy found — run scripts/seed-reference.js first');
    }

    for (const vehicle of TRANSFER_VEHICLES) {
        const { provider, usd, ...rest } = vehicle;
        const data = {
            ...rest,
            providerId: bySlug.get(provider),
            cancellationPolicyId: policy?.id ?? null,
            perKmCents: usdToCents(usd.perKm),
            minimumFareCents: usdToFareCents(usd.minimumFare),
            airportFeeCents: usdToFareCents(usd.airportFee),
            currency: 'GEL',
            status: 'ACTIVE'
        };

        await prisma.transferVehicle.upsert({
            where: { slug: vehicle.slug },
            create: data,
            // Fares and the b2c flag are commercial decisions, so a re-run
            // refreshes the copy and leaves the numbers alone.
            update: {
                name: data.name,
                vehicleClass: data.vehicleClass,
                body: data.body,
                kind: data.kind,
                providerId: data.providerId,
                maxPassengers: data.maxPassengers,
                maxLuggage: data.maxLuggage,
                maxCabinBags: data.maxCabinBags,
                features: data.features,
                vehicleExample: data.vehicleExample,
                summary: data.summary,
                description: data.description,
                included: data.included,
                excluded: data.excluded,
                pickupProcedure: data.pickupProcedure,
                recommendedRank: data.recommendedRank
            }
        });
    }

    logger.info(`Vehicle classes: ${TRANSFER_VEHICLES.length} upserted`);
};

const seedExtras = async () => {
    for (const extra of TRANSFER_EXTRAS) {
        const { usd, bps, ...rest } = extra;
        const data = {
            ...rest,
            // PERCENT extras carry basis points in the same column; everything
            // else carries minor units.
            priceCents: extra.basis === 'PERCENT' ? bps : usdToFareCents(usd),
            currency: 'GEL'
        };

        await prisma.transferExtra.upsert({
            where: { code: extra.code },
            create: data,
            update: {
                name: data.name,
                description: data.description,
                basis: data.basis,
                appliesToClasses: data.appliesToClasses,
                position: data.position
            }
        });
    }

    logger.info(`Extras: ${TRANSFER_EXTRAS.length} upserted`);
};

const seedRoutes = async () => {
    const points = await prisma.transferPoint.findMany();
    const bySlug = new Map(points.map((point) => [point.slug, point]));

    const vehicles = await prisma.transferVehicle.findMany({ where: { status: 'ACTIVE' } });
    const rows = expandRoutes();

    let created = 0;
    let priced = 0;
    let skipped = 0;

    for (const row of rows) {
        const from = bySlug.get(row.fromSlug);
        const to = bySlug.get(row.toSlug);

        if (!from || !to) {
            // A group naming a point that was never seeded is a typo in the
            // catalogue, not a reason to abandon the run.
            logger.warn(`Skipping ${row.slug}: unknown point`);
            skipped += 1;
            continue;
        }

        const metrics = routeMetrics(from, to);
        const isCombined = row.category === 'COMBINED';

        // A multi-stop itinerary is identified by its slug; a direct route by
        // the pair it connects. Looking either one up the other way is how the
        // first run hung a day trip's stops on a two-hour airport transfer.
        const existing = await prisma.transferRoute.findFirst({
            where: isCombined
                ? { slug: row.slug }
                : { fromPointId: from.id, toPointId: to.id, category: { not: 'COMBINED' } },
            include: { prices: true }
        });

        const route =
            existing ??
            (await prisma.transferRoute.create({
                data: {
                    slug: row.slug,
                    fromPointId: from.id,
                    toPointId: to.id,
                    tier: row.tier,
                    category: row.category,
                    distanceKm: metrics.distanceKm,
                    durationMinutes: metrics.durationMinutes,
                    title: row.title ?? `${from.name} to ${to.name}`,
                    summary:
                        row.summary ??
                        `Private and shared transfers from ${from.name} to ${to.name}, about ${metrics.distanceKm} km by road.`,
                    featured: row.featured ?? false,
                    status: 'ACTIVE'
                },
                include: { prices: true }
            }));

        if (!existing) created += 1;

        if (row.stops.length > 0 && (await prisma.transferRouteStop.count({ where: { routeId: route.id } })) === 0) {
            const stopPoints = row.stops.map((slug) => bySlug.get(slug)).filter(Boolean);

            await prisma.transferRouteStop.createMany({
                data: stopPoints.map((point, index) => ({
                    routeId: route.id,
                    pointId: point.id,
                    position: index + 1,
                    dwellMinutes: 30
                }))
            });
        }

        // Opening prices, from the distance engine. Only where there is none —
        // an admin's figure is never overwritten.
        const alreadyPriced = new Set((route.prices ?? []).map((price) => price.vehicleId));
        const missing = vehicles.filter((vehicle) => !alreadyPriced.has(vehicle.id));

        if (missing.length > 0) {
            await prisma.transferRoutePrice.createMany({
                data: missing.map((vehicle) => ({
                    routeId: route.id,
                    vehicleId: vehicle.id,
                    oneWayCents: legFare({
                        vehicle,
                        distanceKm: route.distanceKm,
                        touchesAirport: from.kind === 'AIRPORT' || to.kind === 'AIRPORT',
                        curated: null,
                        tripType: 'ONE_WAY'
                    }).sellCents,
                    returnCents: null,
                    netCents: null,
                    currency: vehicle.currency
                })),
                skipDuplicates: true
            });

            priced += missing.length;
        }
    }

    logger.info(
        `Routes: ${rows.length} in the catalogue, ${created} new, ${priced} prices written, ${skipped} skipped`
    );
};

const main = async () => {
    await connect();

    await seedPoints();
    await seedProviders();
    await seedVehicles();
    await seedExtras();
    await seedRoutes();

    const [points, vehicles, routes, prices] = await Promise.all([
        prisma.transferPoint.count(),
        prisma.transferVehicle.count(),
        prisma.transferRoute.count(),
        prisma.transferRoutePrice.count()
    ]);

    logger.info(
        `Transfer catalogue: ${points} points, ${vehicles} vehicle classes, ${routes} routes, ${prices} prices`
    );
};

try {
    await main();
} catch (err) {
    logger.error({ err }, 'Transfer seed failed');
    process.exitCode = 1;
} finally {
    await disconnect();
}
