import { Prisma } from '../../generated/prisma/client.ts';
import { dateOnlyToUtc, eachNight } from '../time.js';

/**
 * The one statement every counter-based inventory in the platform claims
 * through.
 *
 * `room_inventory` was the first table shaped this way — four counters per
 * (parent, date) with a CHECK saying they can never add up to an oversell —
 * and tour inventory is the second. The concurrency argument is the same for
 * both and lives in one place: **never read availability and then write it.**
 * A single conditional UPDATE whose WHERE clause *is* the availability check
 * is what makes overbooking impossible.
 *
 *   UPDATE <table> SET held_units = held_units + :qty
 *    WHERE ... AND total - blocked - booked - held >= :qty
 *
 * Under READ COMMITTED, an UPDATE that meets a row locked by a concurrent
 * transaction blocks, and then re-evaluates its WHERE clause against the newly
 * committed row. The loser of a race finds no availability, matches zero rows,
 * and rolls back. No SELECT FOR UPDATE, no SERIALIZABLE, no retry loop.
 *
 * The table and its key column are interpolated as raw identifiers, which is
 * only safe because they come from the whitelist below and never from a
 * caller. Every value is a bound parameter.
 */
export const COUNTER_TABLES = Object.freeze({
    room_inventory: { key: 'room_type_id' },
    tour_inventory: { key: 'tour_option_id' }
});

/** Dates are always claimed in ascending order, which is half of deadlock avoidance. */
export const nightDates = (checkIn, checkOut) => eachNight(checkIn, checkOut).map(dateOnlyToUtc);

/**
 * Moves `quantity` units between the counters for every date given, atomically.
 *
 * `from` and `to` are each `'held'`, `'booked'` or absent: `to: 'held'` claims,
 * `from: 'held', to: 'booked'` commits, `from: 'booked'` gives back. One
 * statement per parent, with the dates as an array, so Postgres locks the rows
 * in a consistent order and two claims on the same parent cannot deadlock;
 * a caller spanning several parents processes them in ascending id order for
 * the same reason.
 *
 * Returns the dates actually updated and how many were asked for. A short
 * count means some date refused — sold out, stop-sell, or fewer units held
 * than the caller believed — and the caller decides what that means.
 */
export const moveCounterUnits = async (
    tx,
    { table, keyId, dates, quantity, from = null, to = null, requireAvailable = false }
) => {
    const spec = COUNTER_TABLES[table];

    if (!spec) {
        throw new Error(`Unknown inventory counter table: ${table}`);
    }

    const heldDelta = to === 'held' ? quantity : from === 'held' ? -quantity : 0;
    const bookedDelta = to === 'booked' ? quantity : from === 'booked' ? -quantity : 0;

    const claimed = await tx.$queryRaw`
        UPDATE ${Prisma.raw(table)}
           SET held_units   = held_units   + ${heldDelta},
               booked_units = booked_units + ${bookedDelta},
               updated_at   = now()
         WHERE ${Prisma.raw(spec.key)} = ${keyId}
           AND date = ANY(${dates}::date[])
           AND (${!requireAvailable}::boolean OR stop_sell = false)
           -- The availability check and the write are the same statement. This
           -- line is the entire concurrency guarantee.
           AND (${!requireAvailable}::boolean
                OR total_units - blocked_units - booked_units - held_units >= ${quantity})
           AND (${from !== 'held'}::boolean  OR held_units   >= ${quantity})
           AND (${from !== 'booked'}::boolean OR booked_units >= ${quantity})
        RETURNING date
    `;

    return { claimed, expected: dates.length };
};
