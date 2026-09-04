import { prisma } from '../../db/index.js';
import { config } from '../../config.js';
import { BadRequestError, ConflictError, NotFoundError, UnprocessableEntityError } from '../../lib/errors.js';
import { addDays, dateOnlyToUtc, nightsBetween, todayInTimezone, toDateOnly, zonedTimeToInstant } from '../../lib/time.js';
import { issueTourOfferToken } from '../../lib/tour/offerToken.js';
import { resolveMarkup } from '../hotel/pricingRule.service.js';
import { buildCancellationSchedule } from '../hotel/policy.service.js';
import { findTourOr404, listTours } from './tour.service.js';
import { optionInclude } from './option.service.js';
import { availableUnits, readTourInventoryMap } from './inventory.service.js';
import { fitsOption, partyFor, quoteTour, resolveSeason, resolveTier, unitsFor } from './pricing.service.js';

/**
 * Tour availability and search.
 *
 * The same guarantee as hotel search: nothing reaches a result unless it can
 * actually be booked — a departure exists, has seats, is priced for the party
 * and the date, and is inside the notice and horizon windows. "From" prices
 * on a browse card are indicative; only this file quotes an offer.
 */

/** A departure window a calendar may ask for in one call. */
const MAX_WINDOW_DAYS = 62;

const isTrade = (viewer) => Boolean(viewer?.partnerId) || Boolean(viewer?.role);

/** The wall-clock start of a departure, resolved to an instant. */
export const departureInstant = (date, time, timezone) => zonedTimeToInstant(date, time ?? '09:00', timezone);

/**
 * Why a date cannot be sold, or null when it can. Notice and horizon are the
 * option's own; the platform horizon caps both.
 */
export const dateRefusal = ({ date, departureTime, option, tour, now = new Date() }) => {
    const today = todayInTimezone(tour.timezone, now);

    if (date < today) {
        return { reason: 'PAST' };
    }

    const horizonDays = Math.min(option.horizonDays, config.tour.bookingHorizonDays);

    if (nightsBetween(today, date) > horizonDays) {
        return { reason: 'BEYOND_HORIZON', bookableUntil: addDays(today, horizonDays) };
    }

    const startsAt = departureInstant(date, departureTime ?? option.startTime, tour.timezone);
    const noticeMs = option.noticeHours * 60 * 60 * 1000;

    if (startsAt.getTime() - now.getTime() < noticeMs) {
        return { reason: 'TOO_SOON', noticeHours: option.noticeHours };
    }

    return null;
};

/** Every calendar date from `from` to `to`, inclusive. */
const eachDate = (from, to) => {
    const dates = [];

    for (let date = from; date <= to; date = addDays(date, 1)) {
        dates.push(date);
    }

    return dates;
};

/**
 * Prices one option on one departure for one party, or says why it cannot.
 *
 * Pure apart from the inputs it is handed; the callers below fetch the tour,
 * the inventory row and the markup once and call this per date.
 */
export const buildTourOffer = ({ tour, option, date, row, party, adults, childAges = [], markupBps, now }) => {
    if (!fitsOption(option, party)) {
        return { available: false, reason: 'PARTY_SIZE', minPax: option.minPax, maxPax: option.maxPax };
    }

    if (!row) {
        return null;
    }

    const departureTime = row.departureTime ?? option.startTime ?? null;
    const refusal = dateRefusal({ date, departureTime, option, tour, now });

    if (refusal) {
        return { available: false, ...refusal };
    }

    const units = unitsFor(option, party);
    const left = availableUnits(row);

    if (row.stopSell || left < units) {
        return { available: false, reason: 'SOLD_OUT', availableUnits: row.stopSell ? 0 : left };
    }

    const season = resolveSeason(option.seasons, date);
    const tier = resolveTier(season, party.pax);
    const quote = quoteTour({ option, tier, party, markupBps, currency: tour.currency });

    if (!quote) {
        return { available: false, reason: 'UNPRICED' };
    }

    const schedule = buildCancellationSchedule({
        rules: option.cancellationPolicy?.rules ?? [],
        checkInDate: date,
        checkInTime: departureTime ?? '09:00',
        timezone: tour.timezone,
        // One "night": a tour is charged whole, so the tiers are proportions
        // of the total rather than of a nightly rate.
        nightlyCents: [quote.totals.sellCents],
        currency: quote.currency
    });

    return {
        available: true,
        tour,
        option,
        date,
        departureTime,
        startAt: departureInstant(date, departureTime, tour.timezone),
        endDate: addDays(date, Math.max(0, (tour.durationDays ?? 1) - 1)),
        units,
        party,
        availableUnits: left,
        season,
        tier,
        quote,
        schedule,
        token: issueTourOfferToken({
            tourId: tour.id,
            tourOptionId: option.id,
            date,
            // The party as it was asked for, so the token re-categorises the
            // same ages against the same bands.
            adults,
            childAges,
            quotedSellCents: quote.totals.totalCents,
            currency: quote.currency
        })
    };
};

const windowFor = ({ date, from, to }) => {
    if (date) {
        return { from: date, to: date };
    }

    if (!from || !to) {
        throw new BadRequestError('Give a date, or a from and to window');
    }

    if (to < from) {
        throw new BadRequestError('The window ends before it begins', { from, to });
    }

    if (nightsBetween(from, to) + 1 > MAX_WINDOW_DAYS) {
        throw new BadRequestError(`A window may cover at most ${MAX_WINDOW_DAYS} days`, { limit: MAX_WINDOW_DAYS });
    }

    return { from, to };
};

/**
 * Every option of one tour, priced for every departure in the window.
 *
 * A date with no inventory row is simply absent; a date that exists but cannot
 * be sold is returned with `available: false` and the reason, because a
 * calendar that shows a sold-out Saturday is more useful than one with a gap.
 */
export const tourAvailability = async (slugOrId, criteria, viewer) => {
    const { adults, childAges = [], locale } = criteria;
    const { from, to } = windowFor(criteria);
    const trade = isTrade(viewer);

    const tour = await findTourOr404(slugOrId, {
        locale,
        statuses: ['ACTIVE'],
        b2cOnly: !trade,
        includePartnerOnly: trade
    });

    const options = tour.options.filter((option) => option.status === 'ACTIVE');
    const party = partyFor(tour, adults, childAges);
    const inventory = await readTourInventoryMap(
        options.map((option) => option.id),
        from,
        to
    );
    const { markupBps } = await resolveMarkup({
        partner: viewer?.partner ?? (viewer?.partnerId ? { id: viewer.partnerId } : null),
        destinationId: tour.destinationId,
        timezone: tour.timezone,
        date: from
    });

    const now = new Date();
    const dates = eachDate(from, to);

    return {
        tour,
        party,
        window: { from, to },
        options: options.map((option) => ({
            option,
            dates: dates
                .map((date) =>
                    buildTourOffer({
                        tour,
                        option,
                        date,
                        row: inventory.get(`${option.id}:${date}`) ?? null,
                        party,
                        adults,
                        childAges,
                        markupBps,
                        now
                    })
                )
                .map((offer, index) => (offer ? { date: dates[index], ...offer } : null))
                .filter(Boolean)
        }))
    };
};

/**
 * Tours with at least one bookable offer on a date, cheapest first.
 *
 * The catalogue is small enough to price every candidate for one date, so
 * this filters the whole catalogue and paginates the result rather than
 * paginating first and pricing a page that may be mostly unavailable.
 */
export const searchTours = async (criteria, viewer) => {
    const { date, adults, childAges = [], locale, page, pageSize } = criteria;
    const trade = isTrade(viewer);

    const { tours } = await listTours({
        ...criteria,
        status: ['ACTIVE'],
        b2cOnly: !trade,
        locale,
        page: 1,
        pageSize: 500
    });

    if (!date) {
        const total = tours.length;

        return {
            results: tours.slice((page - 1) * pageSize, page * pageSize).map((tour) => ({ tour, cheapest: null })),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize))
        };
    }

    const ids = tours.map((tour) => tour.id);
    const options = await prisma.tourOption.findMany({
        where: {
            tourId: { in: ids },
            status: 'ACTIVE',
            ...(trade ? {} : { visibility: 'PUBLIC' })
        },
        include: optionInclude
    });
    const inventory = await readTourInventoryMap(
        options.map((option) => option.id),
        date,
        date
    );
    const { markupBps } = await resolveMarkup({
        partner: viewer?.partner ?? (viewer?.partnerId ? { id: viewer.partnerId } : null),
        date
    });

    const now = new Date();
    const results = [];

    for (const tour of tours) {
        const party = partyFor(tour, adults, childAges);
        let cheapest = null;

        for (const option of options.filter((candidate) => candidate.tourId === tour.id)) {
            const offer = buildTourOffer({
                tour,
                option,
                date,
                row: inventory.get(`${option.id}:${date}`) ?? null,
                party,
                adults,
                childAges,
                markupBps,
                now
            });

            if (offer?.available && (!cheapest || offer.quote.totals.totalCents < cheapest.quote.totals.totalCents)) {
                cheapest = offer;
            }
        }

        if (cheapest) {
            results.push({ tour, cheapest });
        }
    }

    results.sort((a, b) => a.cheapest.quote.totals.totalCents - b.cheapest.quote.totals.totalCents);

    const total = results.length;

    return {
        results: results.slice((page - 1) * pageSize, page * pageSize),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
};

/**
 * Re-prices an offer against live data.
 *
 * The token names the tour, the option, the date and the party; nothing else
 * is believed. `requireAvailability` is false when a hold is being confirmed —
 * the hold already owns the seats, so the counter would report the stock it
 * is itself holding.
 */
export const revalidateTourOffer = async (offer, viewer, { strict = true, requireAvailability = true } = {}) => {
    const tour = await prisma.tour.findFirst({
        where: { id: offer.tourId, status: 'ACTIVE' },
        include: {
            destination: true,
            supplier: { select: { id: true, reference: true, name: true } },
            meetingPointRef: { select: { id: true, slug: true, name: true, kind: true } },
            itinerary: { orderBy: { day: 'asc' } },
            options: { where: { id: offer.tourOptionId }, include: optionInclude }
        }
    });

    if (!tour) {
        throw new NotFoundError('That tour is no longer available');
    }

    const option = tour.options[0];

    if (!option || option.status !== 'ACTIVE') {
        throw new ConflictError('That option is no longer available', { reason: 'UNAVAILABLE' });
    }

    const party = partyFor(tour, offer.adults, offer.childAges ?? []);

    if (!fitsOption(option, party)) {
        throw new UnprocessableEntityError('That option is not offered for a party this size', {
            reason: 'PARTY_SIZE',
            minPax: option.minPax,
            maxPax: option.maxPax
        });
    }

    const row = await prisma.tourInventory.findUnique({
        where: { tourOptionId_date: { tourOptionId: option.id, date: dateOnlyToUtc(offer.date) } }
    });

    if (!row) {
        throw new ConflictError('That departure is no longer available', { reason: 'UNAVAILABLE' });
    }

    const departureTime = row.departureTime ?? option.startTime ?? null;
    const refusal = dateRefusal({ date: offer.date, departureTime, option, tour });

    if (refusal) {
        throw new UnprocessableEntityError('That departure can no longer be booked', refusal);
    }

    const units = unitsFor(option, party);

    if (requireAvailability && (row.stopSell || availableUnits(row) < units)) {
        throw new ConflictError('That departure is no longer available', {
            reason: 'UNAVAILABLE',
            availableUnits: row.stopSell ? 0 : availableUnits(row)
        });
    }

    const { markupBps } = await resolveMarkup({
        partner: viewer?.partner ?? (viewer?.partnerId ? { id: viewer.partnerId } : null),
        destinationId: tour.destinationId,
        timezone: tour.timezone,
        date: offer.date
    });

    const season = resolveSeason(option.seasons, offer.date);
    const tier = resolveTier(season, party.pax);
    const quote = quoteTour({ option, tier, party, markupBps, currency: tour.currency });

    if (!quote) {
        throw new ConflictError('That departure is no longer priced', { reason: 'UNAVAILABLE' });
    }

    const schedule = buildCancellationSchedule({
        rules: option.cancellationPolicy?.rules ?? [],
        checkInDate: offer.date,
        checkInTime: departureTime ?? '09:00',
        timezone: tour.timezone,
        nightlyCents: [quote.totals.sellCents],
        currency: quote.currency,
        bookedAt: new Date()
    });

    const currentCents = quote.totals.totalCents;

    if (strict && currentCents !== offer.quotedSellCents) {
        throw new ConflictError('The price for this tour has changed', {
            reason: 'PRICE_CHANGED',
            quotedCents: offer.quotedSellCents,
            currentCents,
            currency: quote.currency
        });
    }

    return {
        tour,
        option,
        date: offer.date,
        departureTime,
        startAt: departureInstant(offer.date, departureTime, tour.timezone),
        endDate: addDays(offer.date, Math.max(0, (tour.durationDays ?? 1) - 1)),
        party,
        units,
        inventory: row,
        availableUnits: availableUnits(row),
        quote,
        schedule,
        priceChanged: currentCents !== offer.quotedSellCents
    };
};

export { toDateOnly };
