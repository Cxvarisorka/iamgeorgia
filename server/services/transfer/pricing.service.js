import { config } from '../../config.js';
import { timezoneOffsetMs, zonedTimeToInstant } from '../../lib/time.js';

/**
 * Transfer pricing: turning a journey and a vehicle into a fare.
 *
 * Pure — plain data in, plain data out, no Prisma and no `req`, exactly like
 * `services/hotel/pricing.service.js`. Search calls it for every candidate
 * vehicle and booking calls it again before it commits, and the two have to
 * agree to the cent, which is much easier to guarantee when the thing doing the
 * arithmetic cannot read anything.
 *
 * The fare model is two-tier, and the tiers exist for different reasons:
 *
 *   1. **A curated price**, when an admin has decided what this route costs in
 *      this class. This is the commercial truth for the routes that sell.
 *   2. **The distance engine**, for every other pair of points. Without it, a
 *      journey nobody has priced yet is simply unbookable, and the catalogue
 *      would have to be exhaustive before it could be useful.
 *
 * The maths in the fallback is the same as the client prototype used
 * (`client/lib/transfers/query.ts`), moved here and converted to integer cents.
 * The client can no longer be trusted with it — not because it was wrong, but
 * because a price the browser computes is a price the browser can change.
 */

const EARTH_RADIUS_KM = 6371;
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;

const applyBps = (amountCents, bps) => Math.round((amountCents * bps) / 10_000);

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export const haversineKm = (from, to) => {
    const dLat = toRadians(to.latitude - from.latitude);
    const dLng = toRadians(to.longitude - from.longitude);
    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);
    const h =
        Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/**
 * Road distance and journey time for a pair of points.
 *
 * A straight line scaled by a road factor, because almost every long route in
 * Georgia crosses a ridge or follows a river valley rather than going over the
 * top. Rough, and honest about being rough — a curated route carries a figure
 * an admin has corrected, and this is only what happens when nobody has.
 */
export const routeMetrics = (fromPoint, toPoint) => {
    const distanceKm = Math.max(1, Math.round(haversineKm(fromPoint, toPoint) * config.transfer.roadFactor));

    return {
        distanceKm,
        // The baseline, before a vehicle's pace factor is applied.
        durationMinutes: Math.round(
            (distanceKm / config.transfer.averageSpeedKmh) * MINUTES_PER_HOUR +
                config.transfer.fixedOverheadMinutes
        ),
        touchesAirport: fromPoint.kind === 'AIRPORT' || toPoint.kind === 'AIRPORT'
    };
};

/**
 * Journey time for one vehicle over a known distance, rounded to five minutes.
 *
 * A bus is slower than a sedan over the same mountain road, and travellers
 * notice when that is ignored. Rounded because a quoted "3h 27m" claims a
 * precision no road has.
 */
export const durationFor = (distanceKm, paceFactor = 1) => {
    const driving = (distanceKm / config.transfer.averageSpeedKmh) * MINUTES_PER_HOUR * paceFactor;

    return Math.round((driving + config.transfer.fixedOverheadMinutes) / 5) * 5;
};

/**
 * True when a pick-up falls in the unsocial hours, read as a wall clock at the
 * pick-up point.
 *
 * The window wraps midnight, which is why this is a comparison against two
 * bounds rather than a range check: 22:00 to 06:00 is `hour >= 22 || hour < 6`,
 * and writing it as `between` would make every night transfer a day one.
 */
export const isNightPickup = (instant, timezone) => {
    const local = new Date(instant.getTime() + timezoneOffsetMs(instant, timezone));
    const hour = local.getUTCHours();
    const { nightFromHour, nightUntilHour } = config.transfer;

    return nightFromHour > nightUntilHour
        ? hour >= nightFromHour || hour < nightUntilHour
        : hour >= nightFromHour && hour < nightUntilHour;
};

/**
 * The net fare for one leg, before extras, night surcharge and markup.
 *
 * `curated` is a TransferRoutePrice row or null. When it carries a `netCents`
 * the supplier has quoted us directly and there is nothing to derive; when it
 * does not, the sell price is taken as given and the net is backed out of the
 * markup later, which is what `netFromSell` does.
 */
export const legFare = ({ vehicle, distanceKm, touchesAirport, curated, tripType }) => {
    if (curated) {
        // A return price is only meaningful on the pair of legs it prices, so a
        // one-way read of it would be wrong in both directions.
        const cents =
            tripType === 'RETURN' && curated.returnCents !== null && curated.returnCents !== undefined
                ? Math.round(curated.returnCents / 2)
                : curated.oneWayCents;

        return { sellCents: cents, netCents: curated.netCents ?? null, source: 'curated' };
    }

    const distanceFare = distanceKm * vehicle.perKmCents;
    const airportFee = touchesAirport ? vehicle.airportFeeCents : 0;

    return {
        // The minimum is what keeps a short airport hop viable; the per-km rate
        // is what keeps a seven-hour drive to Mestia proportionate.
        sellCents: Math.max(vehicle.minimumFareCents, distanceFare) + airportFee,
        netCents: null,
        source: 'distance'
    };
};

/**
 * What one add-on costs on one leg.
 *
 * PERCENT is basis points of the leg fare rather than of the total, because an
 * extra that scales with the journey should scale with each journey — a return
 * to Kazbegi buys the child seat twice.
 */
export const extraCents = ({ extra, quantity, passengers, legFareCents, hours = 1 }) => {
    switch (extra.basis) {
        case 'PER_PASSENGER':
            return extra.priceCents * passengers * quantity;
        case 'PER_HOUR':
            return extra.priceCents * Math.max(1, Math.ceil(hours)) * quantity;
        case 'PERCENT':
            return applyBps(legFareCents, extra.priceCents) * quantity;
        case 'FIXED':
        default:
            return extra.priceCents * quantity;
    }
};

/**
 * True when a blackout window covers a travel date.
 *
 * Both ends inclusive: a road that reopens on the 15th is shut on the 14th, and
 * an exclusive upper bound would sell the last closed day.
 */
export const isBlackedOut = (dateOnly, blackouts = []) =>
    blackouts.some((window) => dateOnly >= window.from && dateOnly <= window.to);

/**
 * Everything the traveller pays, for one vehicle over one journey.
 *
 * The order is the whole of the design, and each step is where it is because
 * the step after it depends on the number the step before produced:
 *
 *   1. the base fare per leg — curated if there is one, distance if not;
 *   2. the night surcharge, which is a proportion of that fare;
 *   3. the extras, some of which are a proportion of it too;
 *   4. per-seat multiplication for a shared vehicle, because a shared transfer
 *      sells a seat and a private one sells the car;
 *   5. markup, applied once at the end to the net total.
 *
 * Rounding happens once per leg rather than once at the end, so the leg lines
 * on a voucher add up to the total printed beneath them. An invoice whose lines
 * do not sum is a support ticket every time.
 */
export const quoteJourney = ({
    vehicle,
    legs,
    passengers,
    extras = [],
    markupBps,
    currency
}) => {
    const perSeat = vehicle.kind === 'SHARED';
    const seatMultiplier = perSeat ? Math.max(1, passengers) : 1;

    const pricedLegs = legs.map((leg) => {
        const base = legFare({
            vehicle,
            distanceKm: leg.distanceKm,
            touchesAirport: leg.touchesAirport,
            curated: leg.curated,
            tripType: leg.tripType
        });

        const nightCents = leg.isNight ? applyBps(base.sellCents, config.transfer.nightSurchargeBps) : 0;
        const fareCents = (base.sellCents + nightCents) * seatMultiplier;

        const legExtras = extras.map((entry) => ({
            code: entry.extra.code,
            name: entry.extra.name,
            quantity: entry.quantity,
            unitCents: entry.extra.priceCents,
            totalCents: extraCents({
                extra: entry.extra,
                quantity: entry.quantity,
                passengers,
                legFareCents: fareCents,
                hours: leg.durationMinutes / MINUTES_PER_HOUR
            })
        }));

        const extrasCents = legExtras.reduce((sum, entry) => sum + entry.totalCents, 0);
        const sellCents = fareCents + extrasCents;

        // A curated net is what the supplier actually charges. Without one the
        // net is backed out of the sell price, so the margin is consistent
        // whichever tier priced the leg.
        const netCents =
            base.netCents === null
                ? Math.round((sellCents * 10_000) / (10_000 + markupBps))
                : base.netCents * seatMultiplier + extrasCents;

        return {
            direction: leg.direction,
            fromPointId: leg.fromPointId,
            toPointId: leg.toPointId,
            fromPointName: leg.fromPointName,
            toPointName: leg.toPointName,
            pickupAt: leg.pickupAt,
            distanceKm: leg.distanceKm,
            durationMinutes: durationFor(leg.distanceKm, vehicle.paceFactor),
            isNight: leg.isNight,
            source: base.source,
            baseFareCents: base.sellCents,
            nightSurchargeCents: nightCents,
            extras: legExtras,
            netCents,
            sellCents
        };
    });

    const netTotalCents = pricedLegs.reduce((sum, leg) => sum + leg.netCents, 0);
    const sellTotalCents = pricedLegs.reduce((sum, leg) => sum + leg.sellCents, 0);

    return {
        currency,
        perSeat,
        legs: pricedLegs,
        totals: {
            netCents: netTotalCents,
            sellCents: sellTotalCents,
            totalCents: sellTotalCents,
            markupBps,
            marginCents: sellTotalCents - netTotalCents
        }
    };
};

/**
 * The wall-clock pick-up time, resolved to an instant at the pick-up point.
 *
 * A pick-up is agreed in local time — nobody arranges to be collected at 05:00
 * UTC — but a cancellation deadline and a driver roster both need to order it
 * against real time, so the conversion happens once, here, and the instant is
 * what everything downstream reads.
 */
export const pickupInstant = (dateOnly, timeOfDay, timezone) =>
    zonedTimeToInstant(dateOnly, timeOfDay, timezone);

/** Minutes between now and a pick-up, for the minimum-notice check. */
export const noticeMinutes = (pickupAt, now = new Date()) =>
    Math.floor((pickupAt.getTime() - now.getTime()) / MS_PER_MINUTE);

/**
 * The markup for a buyer, without touching the database.
 *
 * The real resolution reads the pricing rules table; this is the fallback that
 * needs no I/O, and the answer when no rule matches. Mirrors
 * `resolveMarkupBps` in the hotel pricing service.
 */
export const resolveTransferMarkupBps = (partner) =>
    partner?.commissionRateBps ?? config.transfer.defaultMarkupBps;
