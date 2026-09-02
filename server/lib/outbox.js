/**
 * The transactional outbox.
 *
 * A state change and the event describing it commit together, and a sweeper
 * turns the event into emails and in-app notifications afterwards. The
 * handler that writes the row never sends anything itself — which is what
 * keeps a dead mail server from turning a successful assignment into a 500,
 * and what lets a notification be retried without the assignment being made
 * twice.
 *
 * Topics are dotted and past-tense: `transfer.assignment.offered`.
 */
export const TOPICS = Object.freeze({
    ASSIGNMENT_OFFERED: 'transfer.assignment.offered',
    ASSIGNMENT_ACCEPTED: 'transfer.assignment.accepted',
    ASSIGNMENT_DECLINED: 'transfer.assignment.declined',
    ASSIGNMENT_REVOKED: 'transfer.assignment.revoked',
    LEG_STATUS_CHANGED: 'transfer.leg.status_changed',
    LEG_NO_SHOW_REPORTED: 'transfer.leg.no_show_reported',
    LEG_UNASSIGNED_ALERT: 'transfer.leg.unassigned_alert',
    BOOKING_CANCELLED: 'transfer.booking.cancelled',
    PICKUP_REMINDER: 'transfer.pickup.reminder',
    DRIVER_DETAILS: 'transfer.driver.details',
    RATING_RECEIVED: 'transfer.rating.received',
    RATING_INVITE: 'transfer.rating.invite'
});

/** Writes one event on the given client — a transaction handle, in practice. */
export const enqueueEvent = (client, { topic, payload = {}, entityType = null, entityId = null }) =>
    client.outboxEvent.create({
        data: { topic, payload, entityType, entityId }
    });
