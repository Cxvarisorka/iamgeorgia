import { createHash } from 'node:crypto';

import { prisma } from '../../db/index.js';
import { AUDIT_ENTITY, recordAudit } from '../../lib/audit.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { nextTransferBookingReference } from '../../lib/reference.js';
import { dateOnlyToUtc } from '../../lib/time.js';
import { isAdmin } from '../../middleware/auth.js';
import { buildCancellationSchedule, calculateRefund, freeCancellationUntil } from '../hotel/policy.service.js';
import { revalidateQuote } from './quote.service.js';

/**
 * Confirming, reading, amending and cancelling a transfer.
 *
 * Modelled beat for beat on `services/hotel/booking.service.js`, because the
 * hard parts are identical and solving them twice differently would guarantee
 * the two disagreed:
 *
 *   * the idempotency replay is answered **before** anything else happens;
 *   * the re-quote runs **outside** the transaction, which reads a lot;
 *   * a fare that moved is a 409 the traveller re-confirms, never absorbed;
 *   * the cancellation schedule is frozen at confirmation and is the only
 *     thing a cancellation ever reads;
 *   * nothing slow happens inside the transaction — no email, no HTTP.
 *
 * What is different is what is *not* here: no inventory claim, because a
 * transfer has none. The transaction writes the booking and its legs and that
 * is all, which makes it shorter than the hotel one rather than more clever.
 */

const bookingInclude = {
    legs: { orderBy: { legIndex: 'asc' } },
    extras: true,
    vehicle: { select: { id: true, slug: true, name: true, partnerId: true } },
    route: { select: { id: true, slug: true } },
    partner: { select: { id: true, reference: true, name: true } }
};

/**
 * A key derived from the request when the client did not send one.
 *
 * A double-clicked submit button produces two identical requests, and without
 * this the second one dispatches a second car. Derived from the things that
 * make this booking *this* booking rather than from a timestamp, which would
 * differ between the two and defeat the point.
 */
const deriveIdempotencyKey = (input) =>
    input.idempotencyKey ??
    createHash('sha256')
        .update(
            [
                input.quoteToken,
                input.leadPassenger.email.toLowerCase(),
                input.leadPassenger.lastName.toLowerCase()
            ].join('|')
        )
        .digest('base64url');

/** The journey as it was sold. A voucher reads this, never the live route. */
const snapshotRoute = (from, to, route, legs) => ({
    fromSlug: from.slug,
    fromName: from.name,
    fromRegion: from.regionLabel,
    fromKind: from.kind,
    fromTimezone: from.timezone,
    toSlug: to.slug,
    toName: to.name,
    toRegion: to.regionLabel,
    toKind: to.kind,
    routeSlug: route?.slug ?? null,
    routeTitle: route?.title ?? null,
    distanceKm: legs[0]?.distanceKm ?? null,
    durationMinutes: legs[0]?.durationMinutes ?? null,
    stops: (route?.stops ?? []).map((stop) => ({ name: stop.point.name, dwellMinutes: stop.dwellMinutes }))
});

const snapshotVehicle = (vehicle) => ({
    slug: vehicle.slug,
    name: vehicle.name,
    vehicleClass: vehicle.vehicleClass,
    body: vehicle.body,
    kind: vehicle.kind,
    vehicleExample: vehicle.vehicleExample,
    maxPassengers: vehicle.maxPassengers,
    maxLuggage: vehicle.maxLuggage,
    features: vehicle.features ?? [],
    providerName: vehicle.provider?.name ?? null,
    pickupProcedure: vehicle.pickupProcedure,
    included: vehicle.included ?? [],
    excluded: vehicle.excluded ?? []
});

/**
 * Confirms a transfer.
 *
 * Idempotent: a repeated `Idempotency-Key` returns the original booking with a
 * 200 rather than making a second one with a 201.
 */
export const confirmTransferBooking = async (input, actor, req) => {
    const idempotencyKey = deriveIdempotencyKey(input);

    // Answered first, before anything is written, so a retry can never produce
    // a second dispatch.
    const existing = await prisma.transferBooking.findUnique({
        where: { idempotencyKey },
        include: bookingInclude
    });

    if (existing) {
        return { booking: existing, replayed: true };
    }

    // Re-quoted from scratch. The token names the journey; it does not set the
    // price, and a fare that has moved since it was issued raises here.
    const offer = await revalidateQuote(input.quoteToken, actor, { strict: true });
    const { vehicle, quote, from, to, route, decoded } = offer;

    const schedule = buildCancellationSchedule({
        rules: vehicle.cancellationPolicy?.rules ?? [],
        // A transfer's deadline is measured from the pick-up, which is what
        // `checkInDate` and `checkInTime` mean to this function: the moment the
        // thing being cancelled was due to start.
        checkInDate: decoded.date,
        checkInTime: decoded.time,
        timezone: from.timezone,
        // One "night": a transfer is charged whole, so the tiers are
        // proportions of the total fare rather than of a nightly rate.
        nightlyCents: [quote.totals.sellCents],
        currency: quote.currency,
        bookedAt: new Date()
    });

    try {
        const booking = await prisma.$transaction(async (tx) => {
            const reference = await nextTransferBookingReference(tx);

            const created = await tx.transferBooking.create({
                data: {
                    reference,
                    status: 'CONFIRMED',
                    idempotencyKey,
                    partnerId: actor?.partnerId ?? null,
                    bookedByUserId: actor?.id ?? null,
                    routeId: route?.id ?? null,
                    vehicleId: vehicle.id,
                    tripType: decoded.tripType,
                    pickupAt: quote.legs[0].pickupAt,
                    returnPickupAt: quote.legs[1]?.pickupAt ?? null,
                    adults: decoded.adults,
                    children: decoded.children,
                    childAges: decoded.childAges ?? [],
                    luggage: decoded.luggage,
                    cabinBags: decoded.cabinBags,
                    currency: quote.currency,
                    netTotalCents: quote.totals.netCents,
                    sellTotalCents: quote.totals.sellCents,
                    markupBps: quote.totals.markupBps,
                    leadPassengerName: `${input.leadPassenger.firstName} ${input.leadPassenger.lastName}`,
                    leadPassengerEmail: input.leadPassenger.email,
                    leadPassengerPhone: input.leadPassenger.phone ?? null,
                    flightNumber: input.flightNumber ?? null,
                    pickupAddress: input.pickupAddress ?? null,
                    dropoffAddress: input.dropoffAddress ?? null,
                    specialRequests: input.specialRequests ?? null,
                    routeSnapshot: snapshotRoute(from, to, route, quote.legs),
                    vehicleSnapshot: snapshotVehicle(vehicle),
                    cancellationSchedule: schedule,
                    confirmedAt: new Date(),
                    source: input.source ?? 'web',
                    legs: {
                        create: quote.legs.map((leg, index) => ({
                            legIndex: index,
                            direction: leg.direction,
                            fromPointId: leg.fromPointId,
                            toPointId: leg.toPointId,
                            fromPointName: leg.fromPointName,
                            toPointName: leg.toPointName,
                            pickupAt: leg.pickupAt,
                            distanceKm: leg.distanceKm,
                            durationMinutes: leg.durationMinutes,
                            netCents: leg.netCents,
                            sellCents: leg.sellCents
                        }))
                    },
                    // Extras are summed across the legs: a return buys the
                    // child seat twice, and the booking records one line for it
                    // at the total quantity and total price.
                    extras: {
                        create: aggregateExtras(quote.legs)
                    }
                },
                include: bookingInclude
            });

            await recordAudit(tx, {
                action: 'TRANSFER_BOOKING_CREATED',
                actor,
                entityType: AUDIT_ENTITY.transferBooking,
                entityId: created.id,
                summary: `Transfer ${created.reference} confirmed: ${from.name} to ${to.name}`,
                metadata: { reference: created.reference, vehicle: vehicle.slug, totalCents: created.sellTotalCents },
                req
            });

            return created;
        });

        return { booking, replayed: false };
    } catch (err) {
        // Two identical requests in flight at once: the loser reads back what
        // the winner wrote and reports it as the replay it is.
        if (err?.code === 'P2002') {
            const raced = await prisma.transferBooking.findUnique({
                where: { idempotencyKey },
                include: bookingInclude
            });

            if (raced) {
                return { booking: raced, replayed: true };
            }
        }

        throw err;
    }
};

/** One line per extra, summed across every leg it was bought on. */
const aggregateExtras = (legs) => {
    const totals = new Map();

    for (const leg of legs) {
        for (const extra of leg.extras ?? []) {
            const entry = totals.get(extra.code) ?? {
                code: extra.code,
                name: extra.name,
                quantity: 0,
                unitCents: extra.unitCents,
                totalCents: 0
            };

            entry.quantity += extra.quantity;
            entry.totalCents += extra.totalCents;
            totals.set(extra.code, entry);
        }
    }

    return [...totals.values()];
};

/**
 * Who may read a booking.
 *
 * Every failure is a 404 rather than a 403, and that is not politeness: the
 * references come from a sequence and are trivially enumerable, so a 403 would
 * turn this endpoint into a way of discovering which ones exist.
 */
const assertMayRead = (booking, viewer, { email } = {}) => {
    if (isAdmin(viewer)) {
        return;
    }

    if (viewer?.partnerId) {
        if (booking.partnerId !== viewer.partnerId) {
            throw new NotFoundError('That booking does not exist');
        }

        return;
    }

    // An anonymous traveller proves it with the email they booked under. A
    // partner booking is never readable this way, whatever email is quoted.
    const matches =
        booking.partnerId === null &&
        typeof email === 'string' &&
        email.toLowerCase() === booking.leadPassengerEmail.toLowerCase();

    if (!matches) {
        throw new NotFoundError('That booking does not exist');
    }
};

export const findTransferBookingOr404 = async (reference, viewer, options = {}) => {
    const booking = await prisma.transferBooking.findUnique({
        where: { reference },
        include: bookingInclude
    });

    if (!booking) {
        throw new NotFoundError('That booking does not exist');
    }

    assertMayRead(booking, viewer, options);

    return booking;
};

export const listTransferBookings = async (query, viewer) => {
    const { page, pageSize, status, from, to, search } = query;

    const where = {
        // Scoped in the query rather than filtered after, so there is no path
        // by which one partner reads another's.
        ...(isAdmin(viewer) ? {} : { partnerId: viewer?.partnerId ?? '__none__' }),
        ...(status ? { status: Array.isArray(status) ? { in: status } : status } : {}),
        ...(from || to
            ? {
                  pickupAt: {
                      ...(from ? { gte: dateOnlyToUtc(from) } : {}),
                      ...(to ? { lte: new Date(dateOnlyToUtc(to).getTime() + 86_399_000) } : {})
                  }
              }
            : {}),
        ...(search
            ? {
                  OR: [
                      { reference: { contains: search, mode: 'insensitive' } },
                      { leadPassengerName: { contains: search, mode: 'insensitive' } },
                      { leadPassengerEmail: { contains: search, mode: 'insensitive' } }
                  ]
              }
            : {})
    };

    const [total, bookings] = await Promise.all([
        prisma.transferBooking.count({ where }),
        prisma.transferBooking.findMany({
            where,
            include: bookingInclude,
            orderBy: { pickupAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize
        })
    ]);

    return { bookings, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
};

/**
 * What cancelling would cost right now.
 *
 * Read entirely off the frozen schedule. The vehicle's current policy is never
 * consulted, which is the point of freezing it: terms tightened in March cannot
 * change what a January traveller is owed.
 */
export const quoteTransferCancellation = (booking, at = new Date()) => {
    const refund = calculateRefund(booking.cancellationSchedule, at);

    return {
        chargeCents: refund.chargeCents,
        refundableCents: refund.refundCents,
        currency: refund.currency,
        freeUntil: freeCancellationUntil(booking.cancellationSchedule),
        asAt: (at instanceof Date ? at : new Date(at)).toISOString()
    };
};

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

export const cancelTransferBooking = async (reference, { reason, email } = {}, actor, req) => {
    const booking = await findTransferBookingOr404(reference, actor, { email });

    if (!CANCELLABLE_STATUSES.includes(booking.status)) {
        throw new ConflictError('That booking cannot be cancelled', {
            reason: 'NOT_CANCELLABLE',
            status: booking.status
        });
    }

    const quote = quoteTransferCancellation(booking);

    const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.transferBooking.update({
            where: { id: booking.id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancellationChargeCents: quote.chargeCents,
                cancellationReason: reason ?? null
            },
            include: bookingInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_BOOKING_CANCELLED',
            actor,
            entityType: AUDIT_ENTITY.transferBooking,
            entityId: booking.id,
            summary: `Transfer ${booking.reference} cancelled`,
            metadata: { chargeCents: quote.chargeCents, reason: reason ?? null },
            req
        });

        return result;
    });

    return { booking: updated, quote };
};

const AMENDABLE_STATUSES = ['PENDING', 'CONFIRMED'];

/**
 * Amends the paperwork on a booking.
 *
 * Deliberately narrow. Nothing that was priced is reachable, so this endpoint
 * cannot change what a transfer costs — moving the pick-up means cancelling and
 * booking again, because the fare has to be re-quoted against the new time and
 * the driver re-rostered.
 */
export const amendTransferBooking = async (reference, input, actor, req) => {
    const { email, leadPassenger, ...rest } = input;
    const booking = await findTransferBookingOr404(reference, actor, { email });

    if (!AMENDABLE_STATUSES.includes(booking.status)) {
        throw new ConflictError('That booking can no longer be amended', {
            reason: 'NOT_AMENDABLE',
            status: booking.status
        });
    }

    const data = { ...rest };

    if (leadPassenger) {
        const firstName = leadPassenger.firstName ?? booking.leadPassengerName.split(' ')[0];
        const lastName =
            leadPassenger.lastName ?? booking.leadPassengerName.split(' ').slice(1).join(' ');

        data.leadPassengerName = `${firstName} ${lastName}`.trim();

        if (leadPassenger.email) data.leadPassengerEmail = leadPassenger.email;
        if (leadPassenger.phone !== undefined) data.leadPassengerPhone = leadPassenger.phone;
    }

    return prisma.$transaction(async (tx) => {
        const updated = await tx.transferBooking.update({
            where: { id: booking.id },
            data,
            include: bookingInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_BOOKING_AMENDED',
            actor,
            entityType: AUDIT_ENTITY.transferBooking,
            entityId: booking.id,
            summary: `Transfer ${booking.reference} amended`,
            metadata: { fields: Object.keys(data) },
            req
        });

        return updated;
    });
};

export { bookingInclude, assertMayRead };
