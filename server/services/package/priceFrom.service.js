import { prisma } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import { addDays, todayInTimezone } from '../../lib/time.js';
import { quotePackage } from './quote.service.js';

/**
 * The indicative "from" price on a package card.
 *
 * A package has no price of its own until it is quoted for a date, so the
 * listing shows the cheapest of a few sample dates ahead, refreshed daily
 * like `Hotel.priceFromCents`. It is never what anyone is charged: the quote
 * endpoint is. A package that cannot be sold on any sample date shows no
 * price at all rather than a stale one.
 */

/** Days ahead to sample: soon, a fortnight on, and two months out. */
const SAMPLE_OFFSETS = [14, 28, 56];

const sampleDates = (pkg, now) => {
    const today = todayInTimezone(pkg.timezone, now);
    const lower = pkg.validFrom ? pkg.validFrom.toISOString().slice(0, 10) : null;
    const upper = pkg.validUntil ? pkg.validUntil.toISOString().slice(0, 10) : null;

    return SAMPLE_OFFSETS.map((offset) => addDays(today, offset)).filter((date) => (!lower || date >= lower) && (!upper || addDays(date, pkg.nights) <= upper));
};

const staffViewer = { role: 'ADMIN' };

export const refreshPackagePriceFrom = async (pkg, { now = new Date() } = {}) => {
    let cheapest = 0;

    for (const startDate of sampleDates(pkg, now)) {
        try {
            const quote = await quotePackage(
                { slugOrId: pkg.id, startDate, adults: pkg.minAdults, childAges: [], rooms: 1, choices: {}, locale: 'en' },
                staffViewer,
                { mode: 'availability', now }
            );

            if (quote.available && (cheapest === 0 || quote.totals.totalCents < cheapest)) {
                cheapest = quote.totals.totalCents;
            }
        } catch (error) {
            logger.debug({ err: error, packageId: pkg.id, startDate }, 'Package price sample failed');
        }
    }

    await prisma.package.update({ where: { id: pkg.id }, data: { priceFromCents: cheapest, priceFromAt: now } });

    return cheapest;
};

export const sweepPackagePriceFrom = async ({ now = new Date() } = {}) => {
    const packages = await prisma.package.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, timezone: true, nights: true, minAdults: true, validFrom: true, validUntil: true }
    });

    let refreshed = 0;

    for (const pkg of packages) {
        try {
            await refreshPackagePriceFrom(pkg, { now });
            refreshed += 1;
        } catch (error) {
            logger.warn({ err: error, packageId: pkg.id }, 'Package price refresh failed');
        }
    }

    return { refreshed, total: packages.length };
};
