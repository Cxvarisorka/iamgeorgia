import { config } from '../../config.js';
import { prisma } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { enqueueEvent, TOPICS } from '../../lib/outbox.js';
import { readRatingToken } from '../../lib/transfer/ratingToken.js';
import { findTransferBookingOr404 } from './booking.service.js';

/**
 * Driver ratings.
 *
 * One record per completed leg, from the passenger, the partner or — taken
 * over the phone — operations. The averages on the driver and the provider
 * are *recomputed* from the published records inside the same transaction
 * as whatever changed them, never incremented: an increment drifts on the
 * first rejection and there is no way back.
 *
 * A rating with a comment waits for a look before it is published, and its
 * score is withheld from the average until then. One without is published
 * as it arrives.
 */

export const ratingInclude = {
    driver: { select: { id: true, firstName: true, lastName: true, providerId: true } },
    leg: { select: { id: true, legIndex: true, pickupAt: true, status: true, fromPointName: true, toPointName: true } },
    booking: { select: { id: true, reference: true, partnerId: true, leadPassengerEmail: true } },
    submittedByUser: { select: { id: true, email: true, firstName: true, lastName: true } },
    moderatedByUser: { select: { id: true, email: true, firstName: true, lastName: true } }
};

/** Both averages, from the rows, in the caller's transaction. */
export const recomputeDriverAggregates = async (tx, driverId) => {
    await tx.$executeRaw`
        UPDATE transfer_drivers d
           SET rating_avg   = COALESCE((SELECT avg(r.score) FROM transfer_driver_ratings r
                                         WHERE r.driver_id = d.id AND r.status = 'PUBLISHED'), 0),
               rating_count = (SELECT count(*) FROM transfer_driver_ratings r
                                WHERE r.driver_id = d.id AND r.status = 'PUBLISHED')
         WHERE d.id = ${driverId}
    `;

    await tx.$executeRaw`
        UPDATE transfer_providers p
           SET rating       = COALESCE((SELECT avg(r.score) FROM transfer_driver_ratings r
                                         JOIN transfer_drivers d ON d.id = r.driver_id
                                        WHERE d.provider_id = p.id AND r.status = 'PUBLISHED'), 0),
               review_count = (SELECT count(*) FROM transfer_driver_ratings r
                                JOIN transfer_drivers d ON d.id = r.driver_id
                               WHERE d.provider_id = p.id AND r.status = 'PUBLISHED')
         WHERE p.id = (SELECT provider_id FROM transfer_drivers WHERE id = ${driverId})
    `;
};

/**
 * The one write. The leg must be COMPLETED and within the window; the driver
 * is whoever holds the COMPLETED assignment, snapshotted so a later
 * correction cannot move the score.
 */
const submitRating = (legId, { score, comment }, { source, submittedByUserId = null, submittedByEmail = null }, actor, req) =>
    prisma.$transaction(async (tx) => {
        const now = new Date();

        const leg = await tx.transferBookingLeg.findUnique({
            where: { id: legId },
            include: {
                booking: { select: { id: true, reference: true } },
                assignments: { where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, take: 1 },
                rating: { select: { id: true } }
            }
        });

        if (!leg) {
            throw new NotFoundError('That transfer leg does not exist');
        }

        if (leg.status !== 'COMPLETED') {
            throw new ConflictError('Only a completed transfer can be rated', {
                reason: 'NOT_RATABLE',
                status: leg.status
            });
        }

        const windowMs = config.transfer.dispatch.ratingWindowDays * 86_400_000;

        if (now.getTime() - leg.statusChangedAt.getTime() > windowMs) {
            throw new ConflictError('The rating window for this transfer has closed', { reason: 'RATING_WINDOW_CLOSED' });
        }

        if (leg.rating) {
            throw new ConflictError('This transfer has already been rated', { reason: 'ALREADY_RATED' });
        }

        const assignment = leg.assignments[0];

        if (!assignment) {
            throw new ConflictError('No driver is recorded against this transfer', { reason: 'NO_DRIVER' });
        }

        // No words: published as it arrives. Words: held for a look.
        const published = !comment;

        const rating = await tx.transferDriverRating.create({
            data: {
                legId: leg.id,
                bookingId: leg.bookingId,
                driverId: assignment.driverId,
                assignmentId: assignment.id,
                fleetVehicleId: assignment.fleetVehicleId,
                score,
                comment: comment ?? null,
                source,
                submittedByUserId,
                submittedByEmail: submittedByEmail ? submittedByEmail.toLowerCase() : null,
                status: published ? 'PUBLISHED' : 'PENDING',
                moderatedAt: published ? now : null
            },
            include: ratingInclude
        });

        if (published) {
            await recomputeDriverAggregates(tx, assignment.driverId);
        }

        await recordAudit(tx, {
            action: 'TRANSFER_RATING_SUBMITTED',
            actor,
            entityType: AUDIT_ENTITY.transferRating,
            entityId: rating.id,
            summary: `${source} rated ${leg.booking.reference} leg ${leg.legIndex + 1}: ${score}/5${comment ? ' with a comment' : ''}`,
            metadata: { legId: leg.id, driverId: assignment.driverId, score, source, status: rating.status },
            req
        });

        await enqueueEvent(tx, {
            topic: TOPICS.RATING_RECEIVED,
            payload: { ratingId: rating.id, legId: leg.id, driverId: assignment.driverId, score, status: rating.status },
            entityType: AUDIT_ENTITY.transferRating,
            entityId: rating.id
        });

        return rating;
    });

/** Operations, on the passenger's behalf. */
export const submitRatingForLeg = (legId, body, meta, actor, req) => submitRating(legId, body, meta, actor, req);

/** A partner, on one of its own bookings — scoped by the booking read. */
export const submitRatingForBookingLeg = async (reference, legIndex, body, { viewer, ...meta }, actor, req) => {
    const booking = await findTransferBookingOr404(reference, viewer);
    const leg = booking.legs.find((candidate) => candidate.legIndex === legIndex);

    if (!leg) {
        throw new NotFoundError('That transfer leg does not exist');
    }

    return submitRating(leg.id, body, meta, actor, req);
};

/** The passenger, from the emailed link. The address in the token must be the booking's. */
export const submitGuestRating = async (token, body, req) => {
    const { legId, email } = readRatingToken(token);

    const leg = await prisma.transferBookingLeg.findUnique({
        where: { id: legId },
        select: { id: true, booking: { select: { leadPassengerEmail: true } } }
    });

    if (!leg || leg.booking.leadPassengerEmail.toLowerCase() !== email) {
        throw new NotFoundError('That transfer does not exist');
    }

    return submitRating(legId, body, { source: 'GUEST', submittedByEmail: email }, null, req);
};

export const listRatings = async ({ status, driverId, page, pageSize }) => {
    const where = {
        ...(status ? { status: Array.isArray(status) ? { in: status } : status } : {}),
        ...(driverId ? { driverId } : {})
    };

    const [total, ratings] = await Promise.all([
        prisma.transferDriverRating.count({ where }),
        prisma.transferDriverRating.findMany({
            where,
            include: ratingInclude,
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            skip: (page - 1) * pageSize,
            take: pageSize
        })
    ]);

    return { ratings, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
};

/** Publish or reject. Either way the averages are recomputed from what is published. */
export const moderateRating = (id, decision, { note }, actor, req) =>
    prisma.$transaction(async (tx) => {
        const existing = await tx.transferDriverRating.findUnique({ where: { id }, include: ratingInclude });

        if (!existing) {
            throw new NotFoundError('That rating does not exist');
        }

        const rating = await tx.transferDriverRating.update({
            where: { id },
            data: {
                status: decision,
                moderatedAt: new Date(),
                moderatedByUserId: actor?.id ?? null,
                moderationNote: note ?? null
            },
            include: ratingInclude
        });

        await recomputeDriverAggregates(tx, existing.driverId);

        await recordAudit(tx, {
            action: 'TRANSFER_RATING_MODERATED',
            actor,
            entityType: AUDIT_ENTITY.transferRating,
            entityId: id,
            summary: `Rating on ${existing.booking.reference} ${decision.toLowerCase()}`,
            metadata: { from: existing.status, to: decision, note: note ?? null, driverId: existing.driverId },
            req
        });

        return rating;
    });

/** The driver's own standing. Scores and their spread; never the words. */
export const driverRatingSummary = async (driverId) => {
    const [driver, rows] = await Promise.all([
        prisma.transferDriver.findUnique({
            where: { id: driverId },
            select: { ratingAvg: true, ratingCount: true, completedCount: true }
        }),
        prisma.transferDriverRating.groupBy({
            by: ['score'],
            where: { driverId, status: 'PUBLISHED' },
            _count: { _all: true }
        })
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const row of rows) {
        distribution[row.score] = row._count._all;
    }

    return {
        ratingAvg: driver?.ratingAvg ?? 0,
        ratingCount: driver?.ratingCount ?? 0,
        completedCount: driver?.completedCount ?? 0,
        distribution
    };
};
