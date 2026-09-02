import { config } from '../../config.js';
import { prisma } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import { driverPanelUrl, ratingUrl, sendMailQuietly } from '../../lib/mailer/index.js';
import { TOPICS } from '../../lib/outbox.js';
import { issueRatingToken } from '../../lib/transfer/ratingToken.js';
import { TRANSFER_OPS_ROLES } from '../../middleware/auth.js';
import { contactRevealed } from '../../serializers/dispatch.js';
import { sqlStateOf } from '../../middleware/errors.js';

/**
 * The outbox drain.
 *
 * Turns events written by the dispatch service into in-app notifications
 * and emails. Runs on an interval under an advisory lock, so several
 * instances may run it and only one will; a handler that throws leaves the
 * event to be retried with a growing delay, and after enough attempts it is
 * marked processed with the error kept, rather than blocking everything
 * behind it forever.
 *
 * Push and SMS are new entries in the channel table below; nothing else
 * changes when they arrive.
 */

const MAX_ATTEMPTS = 8;

const backoffMs = (attempts) => Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));

// --- Lookups ---------------------------------------------------------------

const legWithContext = (legId) =>
    prisma.transferBookingLeg.findUnique({
        where: { id: legId },
        include: {
            fromPoint: { select: { kind: true, timezone: true } },
            booking: {
                include: {
                    partner: { select: { id: true, name: true } },
                    bookedByUser: { select: { id: true, email: true, firstName: true, isActive: true } }
                }
            },
            assignments: {
                where: { status: { in: ['OFFERED', 'ACCEPTED', 'COMPLETED', 'NO_SHOW'] } },
                orderBy: { assignedAt: 'desc' },
                take: 1,
                include: {
                    driver: { include: { user: { select: { id: true, email: true, isActive: true } } } },
                    fleetVehicle: { select: { make: true, model: true, colour: true, plateNumber: true } }
                }
            }
        }
    });

const driverWithUser = (driverId) =>
    prisma.transferDriver.findUnique({
        where: { id: driverId },
        include: { user: { select: { id: true, email: true, isActive: true } } }
    });

const opsUserIds = async () =>
    (
        await prisma.user.findMany({
            where: { role: { in: TRANSFER_OPS_ROLES }, isActive: true },
            select: { id: true }
        })
    ).map((row) => row.id);

/** The partner-side person to tell: whoever booked, else the company's primary contact. */
const partnerRecipient = async (booking) => {
    if (!booking.partnerId) return null;
    if (booking.bookedByUser?.isActive) return booking.bookedByUser;

    return prisma.user.findFirst({
        where: { partnerId: booking.partnerId, isActive: true },
        orderBy: [{ isPrimaryContact: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, email: true, firstName: true }
    });
};

/**
 * Writes one notice per recipient.
 *
 * A recipient list is read a moment before it is used, and an account can be
 * deleted in between — an admin removed while the drain runs. The foreign key
 * refuses the whole batch, so on that one failure the list is re-read and
 * the insert tried once more with whoever is still there.
 */
const notify = async (recipients, { kind, title, body, payload = {}, entityType = null, entityId = null }) => {
    const insert = (ids) =>
        ids.length === 0
            ? Promise.resolve()
            : prisma.notification.createMany({
                  data: ids.map((recipientUserId) => ({ recipientUserId, kind, title, body, payload, entityType, entityId }))
              });

    try {
        await insert(recipients);
    } catch (err) {
        if (sqlStateOf(err) !== '23503' && err?.code !== 'P2003') {
            throw err;
        }

        const stillThere = await prisma.user.findMany({ where: { id: { in: recipients } }, select: { id: true } });
        await insert(stillThere.map((row) => row.id));
    }
};

const legLine = (leg) => `${leg.fromPointName} → ${leg.toPointName}`;

const mailData = (leg) => ({
    reference: leg.booking.reference,
    from: leg.fromPointName,
    to: leg.toPointName,
    pickupAt: leg.pickupAt,
    timezone: leg.fromPoint?.timezone ?? 'Asia/Tbilisi',
    passengers: leg.booking.adults + leg.booking.children,
    passengerName: leg.booking.leadPassengerName,
    passengerPhone: leg.booking.leadPassengerPhone,
    flightNumber: leg.booking.flightNumber,
    pickupAddress: leg.booking.pickupAddress
});

const driverLine = (assignment) =>
    assignment
        ? {
              driverName: `${assignment.driver.firstName} ${assignment.driver.lastName}`,
              driverPhone: assignment.driver.phone,
              vehicle: assignment.fleetVehicle
                  ? `${assignment.fleetVehicle.make} ${assignment.fleetVehicle.model}${assignment.fleetVehicle.colour ? `, ${assignment.fleetVehicle.colour}` : ''} · ${assignment.fleetVehicle.plateNumber}`
                  : null
          }
        : {};

// --- Handlers -------------------------------------------------------------------

const handlers = {
    [TOPICS.ASSIGNMENT_OFFERED]: async ({ legId, driverId, assignmentId, onBehalf }) => {
        const [leg, driver] = await Promise.all([legWithContext(legId), driverWithUser(driverId)]);
        if (!leg || !driver) return;

        if (driver.user?.isActive) {
            await notify([driver.user.id], {
                kind: 'TRANSFER_ASSIGNMENT_OFFERED',
                title: onBehalf ? 'New transfer assigned to you' : 'New transfer offered to you',
                body: `${legLine(leg)} · ${leg.booking.reference}`,
                payload: { assignmentId, legId, bookingReference: leg.booking.reference },
                entityType: 'TransferAssignment',
                entityId: assignmentId
            });

            await sendMailQuietly({
                to: driver.user.email,
                template: 'transferAssignmentOffered',
                data: { ...mailData(leg), driverName: driver.firstName, onBehalf, url: driverPanelUrl(assignmentId) }
            });
        }
    },

    [TOPICS.ASSIGNMENT_ACCEPTED]: async ({ legId, assignmentId }) => {
        const leg = await legWithContext(legId);
        if (!leg) return;
        const assignment = leg.assignments[0];

        await notify(await opsUserIds(), {
            kind: 'TRANSFER_ASSIGNMENT_ACCEPTED',
            title: `${assignment ? `${assignment.driver.firstName} ${assignment.driver.lastName}` : 'Driver'} accepted ${leg.booking.reference}`,
            body: legLine(leg),
            payload: { assignmentId, legId, bookingReference: leg.booking.reference },
            entityType: 'TransferAssignment',
            entityId: assignmentId
        });

        const recipient = await partnerRecipient(leg.booking);

        if (recipient) {
            await notify([recipient.id], {
                kind: 'TRANSFER_ASSIGNMENT_ACCEPTED',
                title: `Driver confirmed for ${leg.booking.reference}`,
                body: `${assignment?.driver.firstName ?? 'A driver'} will drive ${legLine(leg)}`,
                payload: { legId, bookingReference: leg.booking.reference },
                entityType: 'TransferBookingLeg',
                entityId: legId
            });

            const revealed = contactRevealed(leg);

            await sendMailQuietly({
                to: recipient.email,
                template: 'transferDriverAssigned',
                data: { ...mailData(leg), ...driverLine(assignment), driverPhone: revealed ? assignment?.driver.phone : null }
            });
        }
    },

    [TOPICS.ASSIGNMENT_DECLINED]: async ({ legId, driverId, reason }) => {
        const [leg, driver] = await Promise.all([legWithContext(legId), driverWithUser(driverId)]);
        if (!leg) return;

        await notify(await opsUserIds(), {
            kind: 'TRANSFER_ASSIGNMENT_DECLINED',
            title: `${driver ? `${driver.firstName} ${driver.lastName}` : 'Driver'} declined ${leg.booking.reference}`,
            body: `${legLine(leg)} needs a driver${reason ? ` — "${reason}"` : ''}`,
            payload: { legId, bookingReference: leg.booking.reference },
            entityType: 'TransferBookingLeg',
            entityId: legId
        });
    },

    [TOPICS.ASSIGNMENT_REVOKED]: async ({ legId, driverId, assignmentId, reason }) => {
        const [leg, driver] = await Promise.all([legWithContext(legId), driverWithUser(driverId)]);
        if (!leg || !driver?.user?.isActive) return;

        await notify([driver.user.id], {
            kind: 'TRANSFER_ASSIGNMENT_REVOKED',
            title: `${leg.booking.reference} is no longer yours`,
            body: `${legLine(leg)} — ${reason === 'REASSIGNED' ? 'reassigned by dispatch' : reason === 'BOOKING_CANCELLED' ? 'the booking was cancelled' : 'withdrawn by dispatch'}`,
            payload: { assignmentId, legId, bookingReference: leg.booking.reference, reason },
            entityType: 'TransferAssignment',
            entityId: assignmentId
        });

        await sendMailQuietly({
            to: driver.user.email,
            template: 'transferAssignmentRevoked',
            data: { ...mailData(leg), driverName: driver.firstName, reason }
        });
    },

    [TOPICS.BOOKING_CANCELLED]: async ({ legId, driverId }) => {
        // The revocation event already told the driver; this one is the ops record.
        const leg = await legWithContext(legId);
        if (!leg) return;

        await notify(await opsUserIds(), {
            kind: 'TRANSFER_BOOKING_CANCELLED',
            title: `${leg.booking.reference} cancelled${driverId ? ' with a driver assigned' : ''}`,
            body: legLine(leg),
            payload: { legId, bookingReference: leg.booking.reference },
            entityType: 'TransferBookingLeg',
            entityId: legId
        });
    },

    [TOPICS.LEG_STATUS_CHANGED]: async ({ legId, to }) => {
        if (!['ARRIVED', 'ON_BOARD', 'COMPLETED'].includes(to)) return;
        const leg = await legWithContext(legId);
        if (!leg) return;
        const recipient = await partnerRecipient(leg.booking);
        if (!recipient) return;

        const wording = { ARRIVED: 'The driver has arrived at the pick-up', ON_BOARD: 'Your passenger is on board', COMPLETED: 'Transfer completed' }[to];

        await notify([recipient.id], {
            kind: 'TRANSFER_LEG_STATUS_CHANGED',
            title: `${wording} · ${leg.booking.reference}`,
            body: legLine(leg),
            payload: { legId, bookingReference: leg.booking.reference, status: to },
            entityType: 'TransferBookingLeg',
            entityId: legId
        });
    },

    [TOPICS.LEG_NO_SHOW_REPORTED]: async ({ legId, driverId }) => {
        const [leg, driver] = await Promise.all([legWithContext(legId), driverId ? driverWithUser(driverId) : null]);
        if (!leg) return;

        await notify(await opsUserIds(), {
            kind: 'TRANSFER_LEG_NO_SHOW_REPORTED',
            title: `No-show reported on ${leg.booking.reference}`,
            body: `${driver ? `${driver.firstName} ${driver.lastName}` : 'The driver'} is waiting at ${leg.fromPointName} — confirm or correct`,
            payload: { legId, bookingReference: leg.booking.reference },
            entityType: 'TransferBookingLeg',
            entityId: legId
        });
    },

    [TOPICS.LEG_UNASSIGNED_ALERT]: async ({ legId }) => {
        const leg = await legWithContext(legId);
        if (!leg) return;

        await notify(await opsUserIds(), {
            kind: 'TRANSFER_LEG_UNASSIGNED_ALERT',
            title: `${leg.booking.reference} still has no driver`,
            body: `${legLine(leg)} · pick-up within 24 hours`,
            payload: { legId, bookingReference: leg.booking.reference },
            entityType: 'TransferBookingLeg',
            entityId: legId
        });

        if (config.transfer.dispatch.opsEmail) {
            await sendMailQuietly({
                to: config.transfer.dispatch.opsEmail,
                template: 'transferUnassignedAlert',
                data: mailData(leg)
            });
        }
    },

    [TOPICS.PICKUP_REMINDER]: async ({ legId, assignmentId, driverId }) => {
        const [leg, driver] = await Promise.all([legWithContext(legId), driverWithUser(driverId)]);
        if (!leg || !driver?.user?.isActive) return;

        await notify([driver.user.id], {
            kind: 'TRANSFER_PICKUP_REMINDER',
            title: `Pick-up soon · ${leg.booking.reference}`,
            body: legLine(leg),
            payload: { assignmentId, legId, bookingReference: leg.booking.reference },
            entityType: 'TransferAssignment',
            entityId: assignmentId
        });

        await sendMailQuietly({
            to: driver.user.email,
            template: 'transferPickupReminder',
            data: { ...mailData(leg), driverName: driver.firstName, url: driverPanelUrl(assignmentId) }
        });
    },

    [TOPICS.DRIVER_DETAILS]: async ({ legId }) => {
        const leg = await legWithContext(legId);
        if (!leg) return;
        const assignment = leg.assignments[0];
        if (!assignment || assignment.status !== 'ACCEPTED') return;

        const recipient = await partnerRecipient(leg.booking);
        const addresses = new Set([leg.booking.leadPassengerEmail, recipient?.email].filter(Boolean));

        for (const to of addresses) {
            await sendMailQuietly({
                to,
                template: 'transferDriverDetails',
                data: { ...mailData(leg), ...driverLine(assignment) }
            });
        }
    },

    [TOPICS.RATING_INVITE]: async ({ legId }) => {
        const leg = await legWithContext(legId);
        if (!leg || leg.status !== 'COMPLETED') return;
        const assignment = leg.assignments[0];

        const token = issueRatingToken({ legId, email: leg.booking.leadPassengerEmail });

        await sendMailQuietly({
            to: leg.booking.leadPassengerEmail,
            template: 'transferRatingInvite',
            data: { ...mailData(leg), ...driverLine(assignment), url: ratingUrl(token) }
        });
    },

    [TOPICS.RATING_RECEIVED]: async ({ driverId, score, status }) => {
        if (status !== 'PUBLISHED') return;
        const driver = await driverWithUser(driverId);
        if (!driver?.user?.isActive) return;

        await notify([driver.user.id], {
            kind: 'TRANSFER_RATING_RECEIVED',
            title: `You received a ${score}-star rating`,
            body: 'Thank you for driving with us.',
            payload: { score }
        });
    }
};

// --- The drain ------------------------------------------------------------------

/** How long a claimed batch is left alone by other drainers before it is retried. */
const LEASE_MS = 5 * 60_000;

/**
 * Claims what is due.
 *
 * The advisory lock is transaction-scoped, so it lives and dies on one
 * connection — a session lock taken on one pooled connection and released on
 * another is a lock nobody ever releases. The claim pushes `nextAttemptAt`
 * forward as a lease, so the events can be processed *outside* the
 * transaction (an email inside one would hold the connection for the length
 * of an SMTP conversation) without another instance picking them up.
 */
const claimDue = (limit) =>
    prisma.$transaction(async (tx) => {
        const [{ locked }] = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtext('outbox_drain')) AS locked`;

        if (!locked) {
            return null;
        }

        const events = await tx.outboxEvent.findMany({
            where: { processedAt: null, nextAttemptAt: { lte: new Date() } },
            orderBy: { createdAt: 'asc' },
            take: limit
        });

        if (events.length > 0) {
            await tx.outboxEvent.updateMany({
                where: { id: { in: events.map((event) => event.id) } },
                data: { nextAttemptAt: new Date(Date.now() + LEASE_MS) }
            });
        }

        return events;
    });

/** Processes one event; never throws. Returns whether it succeeded. */
export const processEvent = async (event) => {
    const handler = handlers[event.topic];

    try {
        if (handler) {
            await handler(event.payload ?? {});
        } else {
            logger.warn({ topic: event.topic }, 'No handler for outbox topic');
        }

        await prisma.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });

        return true;
    } catch (err) {
        const attempts = event.attempts + 1;
        const giveUp = attempts >= MAX_ATTEMPTS;

        logger.error({ err, topic: event.topic, eventId: event.id, attempts }, 'Outbox handler failed');

        await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
                attempts,
                lastError: String(err?.message ?? err).slice(0, 1000),
                nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
                ...(giveUp ? { processedAt: new Date() } : {})
            }
        });

        return false;
    }
};

/**
 * Drains what is due. Safe to call from several instances at once: the
 * advisory lock means only one does the work.
 */
export const drainOutbox = async ({ limit = 50 } = {}) => {
    const events = await claimDue(limit);

    if (events === null) {
        return { skipped: true, processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const event of events) {
        if (await processEvent(event)) processed += 1;
        else failed += 1;
    }

    return { processed, failed, remaining: events.length === limit };
};
