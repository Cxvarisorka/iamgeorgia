import { addDays, dateOnlyToUtc, weekdayOf, zonedTimeToInstant } from '../time.js';

/**
 * Where Shabbat falls, for a kosher package.
 *
 * Pure. A window runs from candle lighting on Friday (sunset minus an offset,
 * eighteen minutes by custom) to havdalah on Saturday (sunset plus an offset,
 * forty-two minutes by one common reckoning). Sunset is computed from the
 * NOAA solar equations at the property's coordinates because fixed hours are
 * wrong by up to two hours across the year at Georgia's latitude; a package
 * may still choose FIXED_HOURS where an operator publishes times.
 *
 * Festivals are not computed — the Hebrew calendar is a bigger dependency
 * than this needs — and travel on `extraRestDays` instead, as windows the
 * admin writes down.
 */

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;

/** Days since J2000.0 for a UTC midnight. */
const julianDay = (dateOnly) => dateOnlyToUtc(dateOnly).getTime() / DAY_MS + 2440587.5;

/**
 * Sunset as a UTC instant, from the NOAA sunrise/sunset algorithm. Returns
 * null above the polar circles when the sun does not set; Georgia is at 42°N.
 */
export const sunsetUtc = (dateOnly, { lat, lng }) => {
    // Whole days since J2000.0 — the algorithm wants the day number, and a
    // midnight Julian date is half a day off it.
    const n = Math.ceil(julianDay(dateOnly) - 2451545 + 0.0008);
    const meanSolarNoon = n - lng / 360;
    const meanAnomaly = (357.5291 + 0.98560028 * meanSolarNoon) % 360;
    const centre =
        1.9148 * Math.sin(meanAnomaly * DEG) + 0.02 * Math.sin(2 * meanAnomaly * DEG) + 0.0003 * Math.sin(3 * meanAnomaly * DEG);
    const eclipticLongitude = (meanAnomaly + centre + 180 + 102.9372) % 360;
    const solarTransit =
        2451545 + meanSolarNoon + 0.0053 * Math.sin(meanAnomaly * DEG) - 0.0069 * Math.sin(2 * eclipticLongitude * DEG);
    const declination = Math.asin(Math.sin(eclipticLongitude * DEG) * Math.sin(23.4397 * DEG));
    // -0.833° accounts for refraction and the solar disc.
    const cosHourAngle =
        (Math.sin(-0.833 * DEG) - Math.sin(lat * DEG) * Math.sin(declination)) / (Math.cos(lat * DEG) * Math.cos(declination));

    if (cosHourAngle < -1 || cosHourAngle > 1) {
        return null;
    }

    const hourAngle = Math.acos(cosHourAngle) / DEG;
    const setJd = solarTransit + hourAngle / 360;

    return new Date((setJd - 2440587.5) * DAY_MS);
};

/** The Friday that opens the Shabbat containing or following `dateOnly`. */
const fridayOf = (dateOnly) => {
    const weekday = weekdayOf(dateOnly); // 1 = Monday … 7 = Sunday

    return weekday === 5 ? dateOnly : weekday === 6 ? addDays(dateOnly, -1) : addDays(dateOnly, 5 - weekday + (weekday > 5 ? 7 : 0));
};

/**
 * The Shabbat window for the week of `dateOnly`, or null when the profile
 * says Shabbat does not constrain this package.
 */
export const shabbatWindow = (dateOnly, timezone, coords, profile) => {
    if (!profile || profile.shabbatMode === 'NONE') {
        return null;
    }

    const friday = fridayOf(dateOnly);
    const saturday = addDays(friday, 1);

    if (profile.shabbatMode === 'FIXED_HOURS') {
        return {
            startsAt: zonedTimeToInstant(friday, profile.shabbatFixedStart ?? '18:00', timezone),
            endsAt: zonedTimeToInstant(saturday, profile.shabbatFixedEnd ?? '20:00', timezone),
            label: 'Shabbat'
        };
    }

    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        // No coordinates to compute from: the widest reasonable fixed window,
        // so an unplaced hotel errs towards caution rather than towards a
        // Friday-evening pick-up.
        return {
            startsAt: zonedTimeToInstant(friday, '16:30', timezone),
            endsAt: zonedTimeToInstant(saturday, '21:00', timezone),
            label: 'Shabbat'
        };
    }

    const fridaySunset = sunsetUtc(friday, coords);
    const saturdaySunset = sunsetUtc(saturday, coords);

    return {
        startsAt: new Date(fridaySunset.getTime() - (profile.candleLightingOffsetMin ?? 18) * 60_000),
        endsAt: new Date(saturdaySunset.getTime() + (profile.havdalahOffsetMin ?? 42) * 60_000),
        label: 'Shabbat'
    };
};

/**
 * Every rest window touching the days from `from` to `to` inclusive: the
 * weekly Shabbat plus the profile's festivals, each as a pair of instants.
 */
export const restWindowsBetween = (from, to, timezone, coords, profile) => {
    const windows = [];

    if (profile && profile.shabbatMode !== 'NONE') {
        const seen = new Set();

        for (let date = addDays(from, -1); date <= addDays(to, 1); date = addDays(date, 1)) {
            const friday = fridayOf(date);

            if (seen.has(friday)) {
                continue;
            }

            seen.add(friday);
            const window = shabbatWindow(friday, timezone, coords, profile);

            if (window && window.endsAt >= dateOnlyToUtc(from) && window.startsAt <= new Date(dateOnlyToUtc(addDays(to, 1)).getTime())) {
                windows.push({ ...window, kind: 'SHABBAT' });
            }
        }
    }

    for (const day of profile?.extraRestDays ?? []) {
        if (!day?.from || !day?.to || day.to < from || day.from > to) {
            continue;
        }

        windows.push({
            startsAt: zonedTimeToInstant(day.from, '00:00', timezone),
            endsAt: zonedTimeToInstant(addDays(day.to, 1), '00:00', timezone),
            label: day.label ?? 'Festival',
            kind: 'FESTIVAL'
        });
    }

    return windows.sort((a, b) => a.startsAt - b.startsAt);
};

/** The window an instant falls inside, or null. */
export const restWindowAt = (instant, windows) => {
    const time = instant instanceof Date ? instant.getTime() : Date.parse(instant);

    return windows.find((window) => time >= window.startsAt.getTime() && time < window.endsAt.getTime()) ?? null;
};

/**
 * Whether a calendar day is a rest day for a tour: Saturday always, or any
 * day inside a festival window. Friday is not — a day tour that returns
 * before candle lighting is an ordinary Friday.
 */
export const isRestDay = (dateOnly, windows, profile) => {
    if (profile?.shabbatMode !== 'NONE' && weekdayOf(dateOnly) === 6) {
        return true;
    }

    const noon = dateOnlyToUtc(dateOnly).getTime() + 12 * 3_600_000;

    return windows.some((window) => window.kind === 'FESTIVAL' && noon >= window.startsAt.getTime() && noon < window.endsAt.getTime());
};
