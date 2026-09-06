import { prisma } from '../../db/index.js';
import { config } from '../../config.js';
import { HttpError, NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { addDays, nightsBetween } from '../../lib/time.js';
import { quotesForJourney } from '../transfer/quote.service.js';
import { searchTours } from '../tour/search.service.js';
import { summaryInclude } from './package.service.js';
import { quotePackage } from './quote.service.js';
import { isTrade } from '../../middleware/auth.js';

/**
 * "Complete your trip": what goes with a hotel stay or a tour.
 *
 * Rule-based and stateless. Transfers are the nearest airport to the anchor,
 * quoted in on the arrival day and out on the departure day. Tours are those
 * in the anchor's destination with a departure during the stay, cheapest
 * first. Packages are the active templates that could contain the anchor,
 * checked for the stay's own dates. Anything that cannot be quoted is simply
 * absent: a rail with fewer cards is better than a 4xx on the hotel page.
 *
 * The seam for a curated or learned ranking is this file; the response shape
 * does not change when one arrives.
 */

const MAX_TOUR_DAYS = 5;
const MAX_TOURS = 6;
const MAX_PACKAGES = 4;
const ARRIVAL_PICKUP = '12:00';
const DEPARTURE_PICKUP = '09:00';

/** The nearest active point of a kind to a coordinate, or null when none has a position. */
const nearestPoint = async ({ latitude, longitude }, { airport }) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const rows = await prisma.$queryRaw`
        SELECT id
        FROM transfer_points
        WHERE status = 'ACTIVE'::transfer_status
          AND geo IS NOT NULL
          AND (CASE WHEN ${airport} THEN kind = 'AIRPORT'::transfer_point_kind ELSE kind <> 'AIRPORT'::transfer_point_kind END)
        ORDER BY geo <-> ST_SetSRID(ST_MakePoint(${longitude}::double precision, ${latitude}::double precision), 4326)::geography
        LIMIT 1
    `;

    return rows[0]?.id ?? null;
};

/** A quote that cannot be made is not a recommendation; anything else is a fault. */
const quietly = async (label, work) => {
    try {
        return await work();
    } catch (error) {
        if (error instanceof HttpError) return null;

        logger.warn({ err: error, label }, 'Recommendation lookup failed');

        return null;
    }
};

const cheapestOffer = (result) =>
    (result?.offers ?? []).reduce((best, offer) => (!best || offer.quote.totals.totalCents < best.quote.totals.totalCents ? offer : best), null);

const transferLeg = async ({ from, to, date, time, party, locale }, viewer) =>
    quietly('transfer', async () => {
        const result = await quotesForJourney(
            {
                from,
                to,
                date,
                time,
                tripType: 'ONE_WAY',
                adults: party.adults,
                children: party.childAges.length,
                childAges: party.childAges,
                luggage: party.adults,
                cabinBags: 0,
                extras: [],
                locale
            },
            viewer
        );
        const offer = cheapestOffer(result);

        return offer ? { from: result.from, to: result.to, date, offer } : null;
    });

/** Airport in on the first day, airport out on the last, for an anchor with a position. */
const recommendTransfers = async ({ coords, localPointId, checkIn, checkOut, party, locale }, viewer) => {
    if (!coords) return { arrival: null, departure: null };

    const [airportId, nearestId] = await Promise.all([
        nearestPoint(coords, { airport: true }),
        localPointId ? Promise.resolve(localPointId) : nearestPoint(coords, { airport: false })
    ]);

    if (!airportId || !nearestId || airportId === nearestId) return { arrival: null, departure: null };

    const [arrival, departure] = await Promise.all([
        transferLeg({ from: airportId, to: nearestId, date: checkIn, time: ARRIVAL_PICKUP, party, locale }, viewer),
        checkOut && checkOut > checkIn
            ? transferLeg({ from: nearestId, to: airportId, date: checkOut, time: DEPARTURE_PICKUP, party, locale }, viewer)
            : Promise.resolve(null)
    ]);

    return { arrival, departure };
};

/** Tours with a departure during the stay, the cheapest departure per tour. */
const recommendTours = async ({ destinationPath, checkIn, checkOut, party, locale, excludeTourId }, viewer) => {
    const days = Math.max(1, Math.min(MAX_TOUR_DAYS, checkOut ? nightsBetween(checkIn, checkOut) : 1));
    const dates = Array.from({ length: days }, (_, offset) => addDays(checkIn, offset));

    const pages = await Promise.all(
        dates.map((date) =>
            quietly('tours', () =>
                searchTours({ date, adults: party.adults, childAges: party.childAges, destinationPath, locale, page: 1, pageSize: MAX_TOURS * 2 }, viewer)
            )
        )
    );

    const best = new Map();

    for (const page of pages) {
        for (const result of page?.results ?? []) {
            if (!result.cheapest || result.tour.id === excludeTourId) continue;

            const current = best.get(result.tour.id);

            if (!current || result.cheapest.quote.totals.totalCents < current.cheapest.quote.totals.totalCents) {
                best.set(result.tour.id, result);
            }
        }
    }

    return [...best.values()]
        .sort((a, b) => a.cheapest.quote.totals.totalCents - b.cheapest.quote.totals.totalCents)
        .slice(0, MAX_TOURS);
};

/**
 * Active packages that could contain the anchor, priced so that the anchor's
 * slot lands on the buyer's date: a trek on day 1 of a package means the
 * package starts the day before the trek the buyer is looking at.
 */
const recommendPackages = async ({ destinationPath, hotelId, tourId, checkIn, party, locale }, viewer) => {
    const slotFilter = hotelId
        ? { componentType: 'HOTEL_STAY', OR: [{ hotelId }, { hotelId: null }] }
        : { componentType: 'TOUR', OR: [{ tourId }, { tourId: null }] };

    const candidates = await prisma.package.findMany({
        where: {
            status: 'ACTIVE',
            ...(isTrade(viewer) ? {} : { b2cEnabled: true }),
            destination: { path: { startsWith: destinationPath } },
            components: { some: slotFilter }
        },
        include: {
            ...summaryInclude(locale),
            components: { where: slotFilter, orderBy: { slotIndex: 'asc' }, take: 1, select: { dayOffset: true } }
        },
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
        take: config.package.maxCandidates
    });

    const quoted = await Promise.all(
        candidates.map((pkg) =>
            quietly('package', async () => {
                const startDate = addDays(checkIn, -(pkg.components[0]?.dayOffset ?? 0));
                const quote = await quotePackage(
                    { slugOrId: pkg.id, startDate, adults: party.adults, childAges: party.childAges, rooms: 1, choices: {}, locale },
                    viewer,
                    { mode: 'availability' }
                );

                return quote.available ? { package: pkg, quote } : null;
            })
        )
    );

    return quoted.filter(Boolean).slice(0, MAX_PACKAGES);
};

const hotelAnchor = async (idOrSlug, viewer) => {
    const hotel = await prisma.hotel.findFirst({
        where: {
            OR: [{ id: idOrSlug }, { slug: idOrSlug }],
            status: 'ACTIVE',
            ...(isTrade(viewer) ? {} : { b2cEnabled: true })
        },
        select: { id: true, slug: true, name: true, latitude: true, longitude: true, destination: { select: { id: true, path: true } } }
    });

    if (!hotel) throw new NotFoundError('Hotel not found');

    return {
        type: 'HOTEL',
        id: hotel.id,
        slug: hotel.slug,
        name: hotel.name,
        destinationPath: hotel.destination.path,
        coords: hotel.latitude !== null && hotel.longitude !== null ? { latitude: hotel.latitude, longitude: hotel.longitude } : null,
        localPointId: null,
        hotelId: hotel.id,
        tourId: null
    };
};

const tourAnchor = async (idOrSlug, viewer) => {
    const tour = await prisma.tour.findFirst({
        where: {
            OR: [{ id: idOrSlug }, { slug: idOrSlug }],
            status: 'ACTIVE',
            ...(isTrade(viewer) ? {} : { b2cEnabled: true })
        },
        select: {
            id: true,
            slug: true,
            title: true,
            meetingPointId: true,
            meetingPointRef: { select: { latitude: true, longitude: true } },
            destination: { select: { id: true, path: true } }
        }
    });

    if (!tour) throw new NotFoundError('Tour not found');

    return {
        type: 'TOUR',
        id: tour.id,
        slug: tour.slug,
        name: tour.title,
        destinationPath: tour.destination.path,
        coords: tour.meetingPointRef ? { latitude: tour.meetingPointRef.latitude, longitude: tour.meetingPointRef.longitude } : null,
        localPointId: tour.meetingPointId,
        hotelId: null,
        tourId: tour.id
    };
};

/**
 * @param {{ hotel?: string, tour?: string, checkIn: string, checkOut?: string, adults: number, childAges?: number[], locale?: string }} criteria
 */
export const recommendFor = async (criteria, viewer) => {
    const { checkIn, checkOut = null, adults, childAges = [], locale } = criteria;
    const anchor = criteria.hotel ? await hotelAnchor(criteria.hotel, viewer) : await tourAnchor(criteria.tour, viewer);
    const party = { adults, childAges };
    const common = { ...anchor, checkIn, checkOut, party, locale };

    const [transfers, tours, packages] = await Promise.all([
        recommendTransfers(common, viewer),
        recommendTours({ ...common, excludeTourId: anchor.tourId }, viewer),
        recommendPackages(common, viewer)
    ]);

    return {
        anchor: { type: anchor.type, id: anchor.id, slug: anchor.slug, name: anchor.name },
        stay: { checkIn, checkOut, adults, childAges },
        transfers,
        tours,
        packages
    };
};
