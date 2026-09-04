import { prisma } from '../../db/index.js';
import { config } from '../../config.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { dateOnlyToUtc, nightsBetween, toDateOnly } from '../../lib/time.js';

/**
 * Departure capacity, edited as ranges.
 *
 * The same shape as the hotel inventory editor and for the same reason: an
 * operator thinks "Tuesdays and Saturdays through October, twelve seats", so
 * the API takes a range and a weekday mask and the database does the
 * expansion in one statement.
 *
 * A scheduled departure is a row that exists; an on-demand day is a row the
 * generator wrote from the option's operating weekdays; a blackout is
 * `stopSell`. Availability is never stored — it is derived on read.
 */

const assertRange = (from, to) => {
    const days = nightsBetween(from, to) + 1;

    if (days <= 0) {
        throw new BadRequestError('The range ends before it begins', { from, to });
    }

    if (days > config.tour.maxBulkDays) {
        throw new BadRequestError(`A single update may cover at most ${config.tour.maxBulkDays} days`, {
            days,
            limit: config.tour.maxBulkDays
        });
    }

    return days;
};

const assertOption = async (client, tourId, optionId) => {
    const option = await client.tourOption.findFirst({
        where: { id: optionId, tourId },
        include: { tour: { select: { id: true, title: true, status: true, timezone: true, currency: true } } }
    });

    if (!option) {
        throw new NotFoundError('Tour option not found');
    }

    return option;
};

const weekdayArray = (weekdays) => (weekdays?.length ? weekdays : null);

/**
 * Refuses a reduction that would put a date below what is already committed.
 * The CHECK constraint is the real guarantee; a 409 naming the dates is a far
 * better answer to an operator than a constraint name.
 */
const assertNoOversell = async (tx, optionId, from, to, weekdays, totalUnits) => {
    if (totalUnits === undefined || totalUnits === null) {
        return;
    }

    const conflicts = await tx.$queryRaw`
        SELECT date, booked_units + held_units + blocked_units AS committed
          FROM tour_inventory
         WHERE tour_option_id = ${optionId}
           AND date BETWEEN ${dateOnlyToUtc(from)}::date AND ${dateOnlyToUtc(to)}::date
           AND (${weekdayArray(weekdays)}::int[] IS NULL
                OR EXTRACT(ISODOW FROM date)::int = ANY(${weekdayArray(weekdays)}::int[]))
           AND booked_units + held_units + blocked_units > ${totalUnits}
         ORDER BY date
         LIMIT 50
    `;

    if (conflicts.length > 0) {
        throw new ConflictError('Some departures already have more committed than that', {
            reason: 'OVERSELL',
            conflicts: conflicts.map((row) => ({ date: toDateOnly(row.date), committed: Number(row.committed) }))
        });
    }
};

/**
 * Writes capacity for every date in the range, or every matching weekday.
 *
 * Anything omitted keeps what the departure already had, so "close October"
 * is one call that does not have to restate the seat counts.
 */
export const setTourInventoryRange = async (tourId, optionId, input, actor, req) => {
    const days = assertRange(input.from, input.to);

    return prisma.$transaction(async (tx) => {
        const option = await assertOption(tx, tourId, optionId);

        // An on-demand option defaults to its own operating days, so the
        // generator and the editor are the same call.
        const weekdays = input.weekdays ?? (option.scheduleKind === 'ON_DEMAND' ? option.operatesOnWeekdays : null);

        await assertNoOversell(tx, optionId, input.from, input.to, weekdays, input.totalUnits);

        const written = await tx.$executeRaw`
            INSERT INTO tour_inventory (
                tour_option_id, date, total_units, blocked_units, booked_units, held_units,
                stop_sell, departure_time, note, created_at, updated_at
            )
            SELECT
                ${optionId},
                day::date,
                COALESCE(${input.totalUnits ?? null}::int, 0),
                COALESCE(${input.blockedUnits ?? null}::int, 0),
                0,
                0,
                COALESCE(${input.stopSell ?? null}::boolean, false),
                ${input.departureTime ?? null}::text,
                ${input.note ?? null}::text,
                now(),
                now()
              FROM generate_series(
                       ${dateOnlyToUtc(input.from)}::date,
                       ${dateOnlyToUtc(input.to)}::date,
                       '1 day'::interval
                   ) AS day
             WHERE ${weekdayArray(weekdays)}::int[] IS NULL
                OR EXTRACT(ISODOW FROM day)::int = ANY(${weekdayArray(weekdays)}::int[])
            ON CONFLICT (tour_option_id, date) DO UPDATE SET
                total_units    = COALESCE(${input.totalUnits ?? null}::int, tour_inventory.total_units),
                blocked_units  = COALESCE(${input.blockedUnits ?? null}::int, tour_inventory.blocked_units),
                stop_sell      = COALESCE(${input.stopSell ?? null}::boolean, tour_inventory.stop_sell),
                departure_time = CASE WHEN ${input.departureTime === undefined}::boolean
                                      THEN tour_inventory.departure_time ELSE ${input.departureTime ?? null}::text END,
                note           = CASE WHEN ${input.note === undefined}::boolean
                                      THEN tour_inventory.note ELSE ${input.note ?? null}::text END,
                updated_at     = now()
        `;

        await recordAudit(tx, {
            action: 'TOUR_INVENTORY_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.tourOption,
            entityId: optionId,
            summary: `Set departures on ${option.tour.title} / ${option.name} for ${input.from} to ${input.to}`,
            metadata: {
                tourId,
                from: input.from,
                to: input.to,
                weekdays: weekdays ?? null,
                departures: written,
                ...(input.totalUnits === undefined ? {} : { totalUnits: input.totalUnits }),
                ...(input.stopSell === undefined ? {} : { stopSell: input.stopSell })
            },
            req
        });

        return { departures: written, days };
    });
};

/** The admin calendar: one row per departure date in the range. */
export const readTourCalendar = async (tourId, optionId, { from, to }) => {
    assertRange(from, to);
    const option = await assertOption(prisma, tourId, optionId);

    const inventory = await prisma.tourInventory.findMany({
        where: { tourOptionId: optionId, date: { gte: dateOnlyToUtc(from), lte: dateOnlyToUtc(to) } },
        orderBy: { date: 'asc' }
    });

    return { option, inventory };
};

/** Capacity for several options over a range, as a lookup by id and date. */
export const readTourInventoryMap = async (optionIds, from, to) => {
    const rows = await prisma.tourInventory.findMany({
        where: {
            tourOptionId: { in: optionIds },
            date: { gte: dateOnlyToUtc(from), lte: dateOnlyToUtc(to) }
        }
    });

    const map = new Map();

    for (const row of rows) {
        map.set(`${row.tourOptionId}:${toDateOnly(row.date)}`, row);
    }

    return map;
};

/** What is left to sell on a departure row. Never stored, always derived. */
export const availableUnits = (row) =>
    row ? Math.max(0, row.totalUnits - row.blockedUnits - row.bookedUnits - row.heldUnits) : 0;
