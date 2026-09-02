import { config } from '../../config.js';
import { prisma } from '../../db/index.js';
import { TOPICS } from '../../lib/outbox.js';

/**
 * Time-driven events: the pick-up reminder, the driver's details for the
 * passenger, and the alert for a leg nobody is driving yet.
 *
 * Each is keyed on a stamp column on the leg, and the stamp is written by the
 * same statement that selects the rows — `UPDATE … WHERE stamp IS NULL
 * RETURNING id` — inside the transaction that enqueues the event. Two
 * instances sweeping at once cannot both claim a row, and a crash between
 * the stamp and the event rolls both back together.
 */

const MS_PER_HOUR = 3_600_000;

const enqueueAll = (tx, topic, rows, extra = () => ({})) =>
    rows.length === 0
        ? Promise.resolve()
        : tx.outboxEvent.createMany({
              data: rows.map((row) => ({
                  topic,
                  payload: { legId: row.id, bookingId: row.booking_id, ...extra(row) },
                  entityType: 'TransferBookingLeg',
                  entityId: row.id
              }))
          });

export const sweepReminders = ({ now = new Date() } = {}) =>
    prisma.$transaction(async (tx) => {
            // Transaction-scoped, so it is released with the commit on the
            // same connection that took it. Every instance may run this; the
            // ones that do not get the lock do nothing.
            const [{ locked }] = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtext('transfer_reminders')) AS locked`;

            if (!locked) {
                return { skipped: true, reminders: 0, details: 0, alerts: 0 };
            }

            const reminderHorizon = new Date(now.getTime() + 2 * MS_PER_HOUR);
            const revealHorizon = new Date(now.getTime() + config.transfer.dispatch.contactRevealHours * MS_PER_HOUR);
            const alertHorizon = new Date(now.getTime() + 24 * MS_PER_HOUR);

            // Two hours before an accepted pick-up, the driver is reminded.
            const reminders = await tx.$queryRaw`
                UPDATE transfer_booking_legs l
                   SET reminder_sent_at = ${now}
                  FROM transfer_assignments a
                 WHERE a.leg_id = l.id
                   AND a.status = 'ACCEPTED'
                   AND l.status IN ('ACCEPTED', 'EN_ROUTE')
                   AND l.reminder_sent_at IS NULL
                   AND l.pickup_at > ${now}
                   AND l.pickup_at <= ${reminderHorizon}
             RETURNING l.id, l.booking_id, a.id AS assignment_id, a.driver_id
            `;

            await enqueueAll(tx, TOPICS.PICKUP_REMINDER, reminders, (row) => ({
                assignmentId: row.assignment_id,
                driverId: row.driver_id
            }));

            // Once the pick-up is close enough, the passenger learns who is coming.
            const details = await tx.$queryRaw`
                UPDATE transfer_booking_legs l
                   SET driver_details_sent_at = ${now}
                  FROM transfer_assignments a
                 WHERE a.leg_id = l.id
                   AND a.status = 'ACCEPTED'
                   AND l.status IN ('ACCEPTED', 'EN_ROUTE', 'ARRIVED')
                   AND l.driver_details_sent_at IS NULL
                   AND l.pickup_at > ${now}
                   AND l.pickup_at <= ${revealHorizon}
             RETURNING l.id, l.booking_id
            `;

            await enqueueAll(tx, TOPICS.DRIVER_DETAILS, details);

            // A confirmed leg within a day with nobody driving it is an alert.
            const alerts = await tx.$queryRaw`
                UPDATE transfer_booking_legs l
                   SET unassigned_alert_at = ${now}
                  FROM transfer_bookings b
                 WHERE b.id = l.booking_id
                   AND b.status = 'CONFIRMED'
                   AND l.status = 'UNASSIGNED'
                   AND l.unassigned_alert_at IS NULL
                   AND l.pickup_at > ${now}
                   AND l.pickup_at <= ${alertHorizon}
             RETURNING l.id, l.booking_id
            `;

            await enqueueAll(tx, TOPICS.LEG_UNASSIGNED_ALERT, alerts);

            return { reminders: reminders.length, details: details.length, alerts: alerts.length };
        });
