/**
 * Calendar dates, wall-clock times and the instants they correspond to.
 *
 * Two kinds of value live in this module and conflating them is the single most
 * common source of off-by-one-night bugs in a booking system:
 *
 *   * A **stay date** is a calendar date at the property. "20 December" is the
 *     night of the twentieth wherever the guest is reading it from. These are
 *     `YYYY-MM-DD` strings and `@db.Date` columns, never instants.
 *   * A **deadline** is an instant. "Free until 7 days before check-in" is a
 *     specific moment in time, and which moment depends on the property's time
 *     zone and its check-in hour.
 *
 * Everything here is pure, so the awkward cases — DST boundaries, a stay that
 * crosses a clock change, a hotel in a zone the server is not in — are testable
 * without a database or a clock.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How far `timeZone` is from UTC at a given instant, in milliseconds.
 *
 * Derived from the runtime's own tz database through Intl rather than a shipped
 * offset table, which would rot the next time a country changes its rules.
 */
export const timezoneOffsetMs = (instant, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const parts = {};

    for (const part of formatter.formatToParts(instant)) {
        parts[part.type] = part.value;
    }

    const asIfUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
    );

    return asIfUtc - instant.getTime();
};

/**
 * Turns a wall-clock date and time at a property into an instant.
 *
 * Two passes, and the second one is not optional. The offset depends on the
 * instant, and the instant is what we are trying to find — so the first pass
 * guesses using the offset at the naive UTC reading, and the second corrects it
 * using the offset at the guessed instant. Without the correction, every
 * deadline within a day of a clock change is an hour wrong.
 *
 * Times that do not exist (the hour skipped when clocks spring forward) resolve
 * forward to the next real instant rather than throwing: a hotel that says
 * check-in is 02:30 should not make bookings impossible on one day a year.
 */
export const zonedTimeToInstant = (dateOnly, timeOfDay, timeZone) => {
    if (!DATE_ONLY.test(dateOnly)) {
        throw new TypeError(`Expected a YYYY-MM-DD date, received "${dateOnly}"`);
    }

    const [year, month, day] = dateOnly.split('-').map(Number);
    const [hour, minute] = (timeOfDay ?? '00:00').split(':').map(Number);

    const naive = Date.UTC(year, month - 1, day, hour, minute);
    const firstPass = naive - timezoneOffsetMs(new Date(naive), timeZone);

    return new Date(naive - timezoneOffsetMs(new Date(firstPass), timeZone));
};

/** The calendar date it is right now at a property, as `YYYY-MM-DD`. */
export const todayInTimezone = (timeZone, now = new Date()) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);

/** `YYYY-MM-DD` for a Date, read in UTC — the form `@db.Date` round-trips. */
export const toDateOnly = (value) => {
    const date = value instanceof Date ? value : new Date(value);

    return date.toISOString().slice(0, 10);
};

/**
 * A `@db.Date` value for a calendar date.
 *
 * Postgres `date` has no time and no zone, and Prisma hands it back as a Date
 * at UTC midnight. Constructing it the same way keeps a round trip lossless.
 */
export const dateOnlyToUtc = (dateOnly) => {
    if (!DATE_ONLY.test(dateOnly)) {
        throw new TypeError(`Expected a YYYY-MM-DD date, received "${dateOnly}"`);
    }

    const [year, month, day] = dateOnly.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day));
};

export const addDays = (dateOnly, days) =>
    toDateOnly(new Date(dateOnlyToUtc(dateOnly).getTime() + days * MS_PER_DAY));

/**
 * The nights a stay actually occupies.
 *
 * Check-out is exclusive: 20 to 23 December is three nights — the 20th, 21st
 * and 22nd. The night of the 23rd belongs to whoever books it next, and
 * including it here is how a system ends up refusing a booking because the
 * departure day is "full".
 */
export const eachNight = (checkIn, checkOut) => {
    const nights = [];
    let cursor = checkIn;

    while (cursor < checkOut) {
        nights.push(cursor);
        cursor = addDays(cursor, 1);
    }

    return nights;
};

export const nightsBetween = (checkIn, checkOut) =>
    Math.round((dateOnlyToUtc(checkOut).getTime() - dateOnlyToUtc(checkIn).getTime()) / MS_PER_DAY);

/** Whole days from `from` to `to`, both calendar dates. Negative if `to` is earlier. */
export const daysBetween = (from, to) => nightsBetween(from, to);

/** ISO weekday, 1 = Monday through 7 = Sunday, for a calendar date. */
export const weekdayOf = (dateOnly) => {
    const day = dateOnlyToUtc(dateOnly).getUTCDay();

    return day === 0 ? 7 : day;
};

export const isValidDateOnly = (value) => {
    if (typeof value !== 'string' || !DATE_ONLY.test(value)) {
        return false;
    }

    // Rejects 2026-02-30, which the regex alone accepts and Date silently
    // rolls forward into March.
    return toDateOnly(dateOnlyToUtc(value)) === value;
};
