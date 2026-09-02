import { prisma } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { ACTIVE_ASSIGNMENT_STATUSES } from '../../lib/transfer/machines.js';
import { dateOnlyToUtc } from '../../lib/time.js';

/**
 * Who is busy when.
 *
 * Reads go through the `transfer_occupancy` view, which unions live
 * assignments and manual blocks, so the schedule screen and the dispatcher's
 * pre-check see one list from one query. Writes to a block take the same row
 * lock the dispatcher takes on the driver or the car, which is what makes the
 * "is anything already there?" check race-free against an assignment being
 * made at the same moment.
 */

/**
 * Locks a driver's and a car's rows for the rest of the transaction — driver
 * first, then car, always in that order, so two dispatchers working the same
 * pair cannot deadlock each other.
 */
export const lockResources = async (tx, { driverId, fleetVehicleId }) => {
    if (driverId) {
        await tx.$queryRaw`SELECT id FROM transfer_drivers WHERE id = ${driverId} FOR UPDATE`;
    }

    if (fleetVehicleId) {
        await tx.$queryRaw`SELECT id FROM transfer_fleet_vehicles WHERE id = ${fleetVehicleId} FOR UPDATE`;
    }
};

/**
 * Everything already occupying the driver's or the car's time in a window.
 *
 * Half-open on both sides, like the ranges in the constraint: a job that ends
 * at 12:00 does not collide with one that starts at 12:00. The assignment
 * being replaced is excluded so a reassignment does not conflict with itself.
 */
export const findConflicts = async (tx, { driverId, fleetVehicleId, windowStart, windowEnd, excludeAssignmentId }) => {
    const rows = await tx.$queryRaw`
        SELECT o.resource_type AS "resourceType",
               o.resource_id   AS "resourceId",
               o.source_kind   AS "sourceKind",
               o.source_id     AS "sourceId",
               o.status        AS "status",
               b.reference     AS "bookingReference",
               lower(o."window") AS "windowStart",
               upper(o."window") AS "windowEnd"
          FROM transfer_occupancy o
          LEFT JOIN transfer_bookings b ON b.id = o.booking_id
         WHERE (
                   (o.resource_type = 'DRIVER' AND o.resource_id = ${driverId ?? ''})
                OR (o.resource_type = 'VEHICLE' AND o.resource_id = ${fleetVehicleId ?? ''})
               )
           AND o."window" && tsrange(${windowStart}::timestamp, ${windowEnd}::timestamp, '[)')
           AND NOT (o.source_kind = 'ASSIGNMENT' AND o.source_id = ${excludeAssignmentId ?? ''})
         ORDER BY lower(o."window")
    `;

    return rows;
};

/** The schedule screen: every claim on the matching resources between two dates. */
export const listOccupancy = async ({ driverId, fleetVehicleId, providerId, from, to }) => {
    const windowStart = dateOnlyToUtc(from);
    const windowEnd = new Date(dateOnlyToUtc(to).getTime() + 86_400_000);

    const rows = await prisma.$queryRaw`
        SELECT o.resource_type AS "resourceType",
               o.resource_id   AS "resourceId",
               o.source_kind   AS "sourceKind",
               o.source_id     AS "sourceId",
               o.status        AS "status",
               b.reference     AS "bookingReference",
               b.lead_passenger_name AS "leadPassengerName",
               lower(o."window") AS "windowStart",
               upper(o."window") AS "windowEnd"
          FROM transfer_occupancy o
          LEFT JOIN transfer_bookings b ON b.id = o.booking_id
          LEFT JOIN transfer_drivers d ON o.resource_type = 'DRIVER' AND d.id = o.resource_id
          LEFT JOIN transfer_fleet_vehicles v ON o.resource_type = 'VEHICLE' AND v.id = o.resource_id
         WHERE o."window" && tsrange(${windowStart}::timestamp, ${windowEnd}::timestamp, '[)')
           AND (${driverId ?? ''} = '' OR (o.resource_type = 'DRIVER' AND o.resource_id = ${driverId ?? ''}))
           AND (${fleetVehicleId ?? ''} = '' OR (o.resource_type = 'VEHICLE' AND o.resource_id = ${fleetVehicleId ?? ''}))
           AND (${providerId ?? ''} = '' OR d.provider_id = ${providerId ?? ''} OR v.provider_id = ${providerId ?? ''})
         ORDER BY o.resource_type, o.resource_id, lower(o."window")
    `;

    return rows;
};

const blockInclude = {
    driver: { select: { id: true, firstName: true, lastName: true } },
    fleetVehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
    createdByUser: { select: { id: true, email: true, firstName: true, lastName: true } }
};

export const listBlocks = ({ driverId, fleetVehicleId, from, to }) =>
    prisma.transferResourceBlock.findMany({
        where: {
            ...(driverId ? { driverId } : {}),
            ...(fleetVehicleId ? { fleetVehicleId } : {}),
            ...(from ? { endsAt: { gt: dateOnlyToUtc(from) } } : {}),
            ...(to ? { startsAt: { lt: new Date(dateOnlyToUtc(to).getTime() + 86_400_000) } } : {})
        },
        include: blockInclude,
        orderBy: { startsAt: 'asc' }
    });

/**
 * A day off, a service slot.
 *
 * Refused while a live assignment sits inside it: the dispatcher reassigns
 * the job first, on purpose, rather than the block quietly sitting on top of
 * a pick-up somebody is expecting.
 */
export const createBlock = (input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const target = input.driverId
            ? await tx.transferDriver.findUnique({ where: { id: input.driverId }, select: { id: true } })
            : await tx.transferFleetVehicle.findUnique({ where: { id: input.fleetVehicleId }, select: { id: true } });

        if (!target) {
            throw new NotFoundError(input.driverId ? 'That driver does not exist' : 'That car does not exist');
        }

        await lockResources(tx, { driverId: input.driverId, fleetVehicleId: input.fleetVehicleId });

        const live = await tx.transferAssignment.findMany({
            where: {
                ...(input.driverId ? { driverId: input.driverId } : { fleetVehicleId: input.fleetVehicleId }),
                status: { in: ACTIVE_ASSIGNMENT_STATUSES },
                windowStart: { lt: input.endsAt },
                windowEnd: { gt: input.startsAt }
            },
            select: { id: true, windowStart: true, windowEnd: true, booking: { select: { reference: true } } },
            orderBy: { windowStart: 'asc' }
        });

        if (live.length > 0) {
            throw new ConflictError('There are assignments inside that block — reassign them first', {
                reason: 'SCHEDULE_CONFLICT',
                conflicts: live.map((row) => ({
                    sourceKind: 'ASSIGNMENT',
                    sourceId: row.id,
                    bookingReference: row.booking.reference,
                    windowStart: row.windowStart,
                    windowEnd: row.windowEnd
                }))
            });
        }

        const block = await tx.transferResourceBlock.create({
            data: {
                driverId: input.driverId ?? null,
                fleetVehicleId: input.fleetVehicleId ?? null,
                startsAt: input.startsAt,
                endsAt: input.endsAt,
                reason: input.reason,
                note: input.note ?? null,
                createdByUserId: actor?.id ?? null
            },
            include: blockInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_BLOCK_CREATED',
            actor,
            entityType: AUDIT_ENTITY.transferResourceBlock,
            entityId: block.id,
            summary: `Blocked ${input.driverId ? 'driver' : 'car'} ${input.driverId ?? input.fleetVehicleId} (${input.reason})`,
            metadata: { startsAt: input.startsAt, endsAt: input.endsAt, reason: input.reason },
            req
        });

        return block;
    });

export const deleteBlock = (id, actor, req) =>
    prisma.$transaction(async (tx) => {
        const block = await tx.transferResourceBlock.findUnique({ where: { id } });

        if (!block) {
            throw new NotFoundError('That block does not exist');
        }

        await tx.transferResourceBlock.delete({ where: { id } });

        await recordAudit(tx, {
            action: 'TRANSFER_BLOCK_DELETED',
            actor,
            entityType: AUDIT_ENTITY.transferResourceBlock,
            entityId: id,
            summary: `Removed a ${block.reason} block`,
            metadata: { driverId: block.driverId, fleetVehicleId: block.fleetVehicleId, startsAt: block.startsAt, endsAt: block.endsAt },
            req
        });
    });
