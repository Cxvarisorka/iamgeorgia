import { createHash } from 'node:crypto';

import { prisma } from '../../db/index.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { nextHotelBookingReference } from '../../lib/reference.js';
import { dateOnlyToUtc, nightsBetween, toDateOnly } from '../../lib/time.js';
import { isAdmin } from '../../middleware/auth.js';
import { readOfferToken } from '../../lib/hotel/offerToken.js';
import { revalidateOffer } from './search.service.js';
import { buildCancellationSchedule, calculateRefund } from './policy.service.js';
import { categorise, DEFAULT_CHILD_POLICY } from './occupancy.service.js';
import { commitHold, createHold, createHoldIn, findUsableHold, releaseBookedUnits } from './availability.service.js';

/**
 * Bookings.
 *
 * Two properties this file exists to guarantee:
 *
 *   1. **Nothing the client sends about money is believed.** The request carries
 *      identifiers, dates, guests and a token. Availability, occupancy, nightly
 *      rates, taxes and the final amount are all recomputed here, and a price
 *      that has moved is a 409 rather than a silent charge.
 *
 *   2. **The booking is a snapshot.** Hotel name, room name, board, cancellation
 *      terms and every night's price are frozen onto it. The foreign keys stay
 *      for reporting; nothing that a guest was promised is ever re-read from a
 *      record the hotel can edit afterwards.
 */

const bookingInclude = {
    // `supplierId` is selected so the serializer can tell whether the viewer
    // owns this property, which decides whether it sees the net side.
    hotel: {
        select: { id: true, slug: true, name: true, timezone: true, currency: true, supplierId: true }
    },
    partner: { select: { id: true, reference: true, name: true } },
    rooms: {
        include: {
            nights: { orderBy: { date: 'asc' } },
            guests: true
        }
    }
};

/**
 * A key derived from the request, so a retry is recognisable as one.
 *
 * The client may supply its own; when it does not, the hold token plus the
 * guest details is a natural key — the same checkout submitted twice hashes the
 * same way, and two genuinely different bookings never collide.
 */
const deriveIdempotencyKey = (input) =>
    input.idempotencyKey ??
    createHash('sha256')
        .update(
            [
                input.holdToken ?? input.offerToken ?? '',
                input.leadGuest.email,
                input.leadGuest.lastName,
                input.checkIn ?? '',
                input.checkOut ?? ''
            ].join('|')
        )
        .digest('base64url');

const snapshotHotel = (hotel) => ({
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    address: hotel.address ?? null,
    postalCode: hotel.postalCode ?? null,
    countryCode: hotel.countryCode,
    phone: hotel.phone ?? null,
    email: hotel.email ?? null,
    timezone: hotel.timezone,
    starRating: hotel.starRating,
    propertyType: hotel.propertyType,
    checkIn: { from: hotel.checkInFrom ?? null, until: hotel.checkInUntil ?? null },
    checkOut: { from: hotel.checkOutFrom ?? null, until: hotel.checkOutUntil ?? null },
    latitude: hotel.latitude ?? null,
    longitude: hotel.longitude ?? null
});

const bedText = (roomType) => {
    const beds = (roomType?.beds ?? []).filter((bed) => (bed.groupIndex ?? 0) === 0);

    if (beds.length === 0) {
        return null;
    }

    return beds.map((bed) => `${bed.quantity} x ${bed.bedType.name}`).join(' + ');
};

/**
 * Confirms a booking.
 *
 * The order inside the transaction matters. Inventory is claimed *first* — a
 * fresh hold when booking straight from an offer, taken on the same transaction
 * so it rolls back with the booking — and moved from held to booked before the
 * transaction ends. If either fails there is no booking, rather than a booking
 * with nothing behind it or a hold with no booking in front of it. Everything
 * in between is bookkeeping that cannot fail for availability reasons.
 *
 * Nothing slow happens in here. No email, no payment call, no HTTP of any kind
 * — the connection is held for the duration and the pool is only
 * DATABASE_POOL_MAX per process.
 */
export const confirmBooking = async (input, actor, req) => {
    const idempotencyKey = deriveIdempotencyKey(input);

    // A replay is answered before anything is claimed, so a retried request
    // never takes a second room.
    const existing = await prisma.hotelBooking.findUnique({
        where: { idempotencyKey },
        include: bookingInclude
    });

    if (existing) {
        return { booking: existing, replayed: true };
    }

    // Revalidation happens outside the transaction: it reads a lot and the
    // transaction should hold locks only for the claim and the writes.
    const offer = input.holdToken ? null : readOfferToken(input.offerToken);

    let hold = null;
    let priced;

    if (input.holdToken) {
        hold = await findUsableHold(prisma, input.holdToken);

        // A hold names a room type and a rate plan but not a hotel, so the
        // property is resolved through the room it holds. Passing a null
        // hotelId into the revalidation query would be a Prisma validation
        // error rather than the 404 it looks like.
        const owner = await prisma.roomType.findUnique({
            where: { id: hold.roomTypeId },
            select: { hotelId: true }
        });

        if (!owner) {
            throw new NotFoundError('That room is no longer available');
        }

        priced = await revalidateOffer(
            {
                hotelId: owner.hotelId,
                roomTypeId: hold.roomTypeId,
                ratePlanId: hold.ratePlanId,
                checkIn: toDateOnly(hold.checkIn),
                checkOut: toDateOnly(hold.checkOut),
                adults: hold.adults,
                childAges: hold.childAges,
                rooms: hold.quantity,
                quotedSellCents: hold.quotedSellCents,
                currency: hold.currency
            },
            actor,
            // Price only: the hold is what guarantees the rooms, and asking the
            // availability query would have it trip over its own claim.
            { strict: false, requireAvailability: false }
        );

        // The hold guarantees the rooms, not the price. A rate the hotel moved
        // while the guest was typing is a question for the guest, not something
        // to absorb silently in either direction.
        if (priced.quote.totals.totalCents !== hold.quotedSellCents) {
            throw new ConflictError('The price for this booking has changed', {
                reason: 'PRICE_CHANGED',
                quotedCents: hold.quotedSellCents,
                currentCents: priced.quote.totals.totalCents,
                currency: priced.quote.currency
            });
        }
    } else {
        // No hold: price it, then claim in the same breath. Convenient for a
        // server-to-server partner booking, and the claim is identical.
        priced = await revalidateOffer(offer, actor);
    }

    const hotel = priced.hotel;
    const ratePlan = priced.ratePlan;
    const checkIn = input.holdToken ? toDateOnly(hold.checkIn) : offer.checkIn;
    const checkOut = input.holdToken ? toDateOnly(hold.checkOut) : offer.checkOut;
    const rooms = input.holdToken ? hold.quantity : offer.rooms;
    const adults = input.holdToken ? hold.adults : offer.adults;
    const childAges = input.holdToken ? hold.childAges : offer.childAges;

    const schedule = buildCancellationSchedule({
        rules: ratePlan.cancellationPolicy?.rules ?? [],
        checkInDate: checkIn,
        checkInTime: hotel.checkInFrom ?? '14:00',
        timezone: hotel.timezone,
        nightlyCents: priced.quote.nights.map((night) => night.sellCents),
        currency: priced.quote.currency,
        bookedAt: new Date()
    });

    const party = categorise(adults, childAges, DEFAULT_CHILD_POLICY);

    try {
        const booking = await prisma.$transaction(async (tx) => {
            // Claimed on this transaction, not its own, so the rooms and the
            // booking commit together or not at all: a hold that outlived a
            // rolled-back booking would block the room until the sweeper
            // noticed.
            const claimedHold =
                hold ??
                (await createHoldIn(tx, {
                    offer: {
                        roomTypeId: ratePlan.roomTypeId,
                        ratePlanId: ratePlan.id,
                        checkIn,
                        checkOut,
                        rooms,
                        adults,
                        childAges
                    },
                    quote: priced.quote,
                    actor,
                    ttlMs: 60_000
                }));

            const reference = await nextHotelBookingReference(tx);

            const created = await tx.hotelBooking.create({
                data: {
                    reference,
                    status: 'CONFIRMED',
                    idempotencyKey,
                    partnerId: actor?.partnerId ?? null,
                    bookedByUserId: actor?.id ?? null,
                    hotelId: hotel.id,
                    checkIn: dateOnlyToUtc(checkIn),
                    checkOut: dateOnlyToUtc(checkOut),
                    nights: nightsBetween(checkIn, checkOut),
                    currency: priced.quote.currency,
                    netTotalCents: priced.quote.totals.netCents,
                    sellTotalCents: priced.quote.totals.sellCents,
                    taxTotalCents: priced.quote.totals.taxIncludedCents,
                    payableAtPropertyCents: priced.quote.totals.payableAtPropertyCents,
                    markupBps: priced.quote.totals.markupBps,
                    leadGuestName: `${input.leadGuest.firstName} ${input.leadGuest.lastName}`,
                    leadGuestEmail: input.leadGuest.email,
                    leadGuestPhone: input.leadGuest.phone ?? null,
                    specialRequests: input.specialRequests ?? null,
                    hotelSnapshot: snapshotHotel(hotel),
                    confirmedAt: new Date(),
                    source: input.source ?? 'web',
                    rooms: {
                        // One row per room: two rooms on one booking are two
                        // rows, which is what makes cancelling one of them
                        // possible later.
                        create: Array.from({ length: rooms }, () => ({
                            roomTypeId: ratePlan.roomTypeId,
                            ratePlanId: ratePlan.id,
                            roomTypeName: ratePlan.roomType?.name ?? 'Room',
                            ratePlanName: ratePlan.name,
                            mealPlanCode: ratePlan.mealPlan?.code ?? 'RO',
                            mealPlanName: ratePlan.mealPlan?.name ?? 'Room Only',
                            bedConfigurationText: bedText(ratePlan.roomType),
                            adults,
                            childAges,
                            netSubtotalCents: Math.round(priced.quote.totals.netCents / rooms),
                            sellSubtotalCents: Math.round(priced.quote.totals.sellCents / rooms),
                            cancellationSummary: ratePlan.cancellationPolicy?.description ?? null,
                            cancellationSchedule: schedule,
                            nights: {
                                create: priced.quote.nights.map((night) => ({
                                    date: dateOnlyToUtc(night.date),
                                    netCents: night.netCents,
                                    sellCents: night.sellCents
                                }))
                            },
                            guests: {
                                create: [
                                    {
                                        type: 'ADULT',
                                        firstName: input.leadGuest.firstName,
                                        lastName: input.leadGuest.lastName,
                                        isLead: true
                                    },
                                    ...(input.guests ?? []).map((guest) => ({
                                        type: guest.type ?? 'ADULT',
                                        firstName: guest.firstName,
                                        lastName: guest.lastName,
                                        age: guest.age ?? null
                                    }))
                                ]
                            }
                        }))
                    }
                }
            });

            await commitHold(tx, claimedHold, created.id);

            await recordAudit(tx, {
                action: 'BOOKING_CREATED',
                actor,
                entityType: AUDIT_ENTITY.booking,
                entityId: created.id,
                summary: `Booked ${hotel.name} for ${checkIn} to ${checkOut}`,
                metadata: {
                    reference,
                    hotelId: hotel.id,
                    ratePlanId: ratePlan.id,
                    rooms,
                    nights: created.nights,
                    totalCents: created.sellTotalCents,
                    currency: created.currency
                },
                req
            });

            return tx.hotelBooking.findUnique({ where: { id: created.id }, include: bookingInclude });
        });

        return { booking, replayed: false, party };
    } catch (err) {
        // Two requests that raced past the replay check both try to insert the
        // same key; the loser is a replay, not a failure.
        if (err?.code === 'P2002') {
            const winner = await prisma.hotelBooking.findUnique({
                where: { idempotencyKey },
                include: bookingInclude
            });

            if (winner) {
                return { booking: winner, replayed: true };
            }
        }

        throw err;
    }
};

/**
 * Who may read a booking.
 *
 * Three ways in, and the third is the one that needs care:
 *
 *   * An admin reads anything.
 *   * A partner reads its own and nothing else.
 *   * A guest who booked without an account reads theirs by quoting the
 *     reference **and** the lead guest email.
 *
 * The email is not decoration. References come from a sequence — BKG-000001,
 * BKG-000002 — so a reference alone is trivially enumerable, and "manage my
 * booking" pages that ask for reference plus email do so for exactly this
 * reason. Compared case-insensitively because nobody types their own address
 * back the same way twice.
 *
 * Every failure is a 404 rather than a 403, so none of this can be used to
 * discover which references exist.
 */
const assertMayRead = (booking, viewer, { email } = {}) => {
    if (isAdmin(viewer)) {
        return;
    }

    if (viewer?.partnerId) {
        if (booking.partnerId !== viewer.partnerId) {
            throw new NotFoundError('Booking not found');
        }

        return;
    }

    const guestBooking = booking.partnerId === null;
    const emailMatches =
        typeof email === 'string' && email.trim().toLowerCase() === booking.leadGuestEmail.toLowerCase();

    if (!guestBooking || !emailMatches) {
        throw new NotFoundError('Booking not found');
    }
};

export const findBookingOr404 = async (reference, viewer, options = {}) => {
    const booking = await prisma.hotelBooking.findFirst({
        where: { OR: [{ id: reference }, { reference }] },
        include: bookingInclude
    });

    if (!booking) {
        throw new NotFoundError('Booking not found');
    }

    assertMayRead(booking, viewer, options);

    return booking;
};

export const listBookings = async (query, viewer) => {
    const { status, hotelId, partnerId, from, to, search, page, pageSize } = query;

    const where = {
        // A partner's list is scoped in the query, not filtered afterwards.
        ...(isAdmin(viewer) ? {} : { partnerId: viewer?.partnerId ?? '__none__' }),
        ...(status ? { status: { in: Array.isArray(status) ? status : [status] } } : {}),
        ...(hotelId ? { hotelId } : {}),
        ...(isAdmin(viewer) && partnerId ? { partnerId } : {}),
        ...(from || to
            ? {
                  checkIn: {
                      ...(from ? { gte: dateOnlyToUtc(from) } : {}),
                      ...(to ? { lte: dateOnlyToUtc(to) } : {})
                  }
              }
            : {}),
        ...(search
            ? {
                  OR: [
                      { reference: { contains: search, mode: 'insensitive' } },
                      { leadGuestName: { contains: search, mode: 'insensitive' } },
                      { leadGuestEmail: { contains: search, mode: 'insensitive' } }
                  ]
              }
            : {})
    };

    const [total, bookings] = await Promise.all([
        prisma.hotelBooking.count({ where }),
        prisma.hotelBooking.findMany({
            where,
            include: bookingInclude,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize
        })
    ]);

    return { bookings, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
};

/**
 * Quotes a cancellation without performing it.
 *
 * Read entirely from the frozen schedule. The hotel's current policy is not
 * consulted and must not be: what the guest is owed was settled at booking.
 */
export const quoteCancellation = (booking, at = new Date()) => {
    const active = booking.rooms.filter((room) => room.status === 'CONFIRMED');

    const perRoom = active.map((room) => ({
        bookingRoomId: room.id,
        ...calculateRefund(room.cancellationSchedule, at)
    }));

    return {
        chargeCents: perRoom.reduce((sum, room) => sum + room.chargeCents, 0),
        refundCents: perRoom.reduce((sum, room) => sum + room.refundCents, 0),
        currency: booking.currency,
        rooms: perRoom
    };
};

export const cancelBooking = async (reference, { reason, email } = {}, actor, req) =>
    prisma.$transaction(async (tx) => {
        const booking = await tx.hotelBooking.findFirst({
            where: { OR: [{ id: reference }, { reference }] },
            include: bookingInclude
        });

        if (!booking) {
            throw new NotFoundError('Booking not found');
        }

        assertMayRead(booking, actor, { email });

        if (booking.status === 'CANCELLED') {
            throw new ConflictError('This booking is already cancelled', { status: booking.status });
        }

        if (booking.status === 'COMPLETED') {
            throw new ConflictError('A completed stay cannot be cancelled', { status: booking.status });
        }

        const quote = quoteCancellation(booking);

        // Give the rooms back, one statement per room row.
        for (const room of booking.rooms.filter((candidate) => candidate.status === 'CONFIRMED')) {
            if (room.roomTypeId) {
                await releaseBookedUnits(tx, {
                    roomTypeId: room.roomTypeId,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                    quantity: 1
                });
            }
        }

        await tx.hotelBookingRoom.updateMany({
            where: { bookingId: booking.id, status: 'CONFIRMED' },
            data: { status: 'CANCELLED' }
        });

        const cancelled = await tx.hotelBooking.update({
            where: { id: booking.id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancellationChargeCents: quote.chargeCents,
                cancellationReason: reason ?? null
            }
        });

        await recordAudit(tx, {
            action: 'BOOKING_CANCELLED',
            actor,
            entityType: AUDIT_ENTITY.booking,
            entityId: booking.id,
            summary: `Cancelled ${booking.reference}`,
            metadata: {
                reference: booking.reference,
                chargeCents: quote.chargeCents,
                refundCents: quote.refundCents,
                currency: booking.currency,
                ...(reason ? { reason } : {})
            },
            req
        });

        return { booking: cancelled, quote };
    });

/**
 * Amends a booking without repricing it.
 *
 * The only fields reachable here are the ones that do not touch the sale: the
 * lead guest's name and contact details, and what the property should be told.
 * Dates, rooms, board and every figure are deliberately unreachable — those are
 * a cancellation and a rebooking, because the inventory has to be given back
 * and re-claimed and the price re-quoted, and none of that can be done by
 * editing a row.
 *
 * Only a booking that is still ahead of the guest may be amended. Renaming the
 * lead guest on a stay that has already completed would rewrite history rather
 * than correct a record.
 *
 * The lead guest exists twice — denormalised onto the booking for lists and
 * lookups, and as a `BookingGuest` row per room for the rooming list the
 * property works from. Both are updated in the same transaction; a correction
 * that reached only one of them would put the wrong name on the door.
 */
const AMENDABLE_STATUSES = ['PENDING', 'CONFIRMED'];

export const amendBooking = async (reference, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const booking = await tx.hotelBooking.findFirst({
            where: { OR: [{ id: reference }, { reference }] },
            include: bookingInclude
        });

        if (!booking) {
            throw new NotFoundError('Booking not found');
        }

        // Whoever may read a booking may correct its paperwork: an admin, the
        // partner that made it, or the guest who can quote the lead email.
        assertMayRead(booking, actor, { email: input.email });

        if (!AMENDABLE_STATUSES.includes(booking.status)) {
            throw new ConflictError('This booking can no longer be amended', {
                status: booking.status
            });
        }

        const lead = input.leadGuest ?? {};
        const renamed = lead.firstName !== undefined || lead.lastName !== undefined;

        // The guest rows carry the name already split, so the denormalised
        // `leadGuestName` never has to be parsed back apart — which is what
        // would go wrong first for a double-barrelled surname.
        const current = booking.rooms.flatMap((room) => room.guests).find((guest) => guest.isLead);
        const firstName = lead.firstName ?? current?.firstName ?? booking.leadGuestName;
        const lastName = lead.lastName ?? current?.lastName ?? '';

        const data = {
            ...(renamed ? { leadGuestName: `${firstName} ${lastName}`.trim() } : {}),
            ...(lead.email !== undefined ? { leadGuestEmail: lead.email } : {}),
            ...(lead.phone !== undefined ? { leadGuestPhone: lead.phone ?? null } : {}),
            ...(input.specialRequests !== undefined
                ? { specialRequests: input.specialRequests ?? null }
                : {})
        };

        const fields = Object.keys(data);

        // An empty amendment is not an error — a form submitted unchanged is an
        // ordinary thing — but it must not leave an audit row saying nothing
        // happened.
        if (fields.length === 0) {
            return booking;
        }

        if (renamed) {
            await tx.bookingGuest.updateMany({
                where: { bookingRoom: { bookingId: booking.id }, isLead: true },
                data: { firstName, lastName }
            });
        }

        await tx.hotelBooking.update({ where: { id: booking.id }, data });

        await recordAudit(tx, {
            action: 'BOOKING_AMENDED',
            actor,
            entityType: AUDIT_ENTITY.booking,
            entityId: booking.id,
            summary: `Amended ${booking.reference}`,
            metadata: { reference: booking.reference, fields },
            req
        });

        return tx.hotelBooking.findUnique({ where: { id: booking.id }, include: bookingInclude });
    });

/**
 * Takes a hold from an offer token.
 *
 * Separate from confirmation so a checkout page can secure the rooms while the
 * guest fills in details, which is the whole reason holds exist.
 */
export const holdOffer = async (token, actor, req) => {
    const offer = readOfferToken(token);
    const priced = await revalidateOffer(offer, actor);

    const hold = await createHold({
        offer: {
            roomTypeId: priced.ratePlan.roomTypeId,
            ratePlanId: priced.ratePlan.id,
            checkIn: offer.checkIn,
            checkOut: offer.checkOut,
            rooms: offer.rooms,
            adults: offer.adults,
            childAges: offer.childAges
        },
        quote: priced.quote,
        actor
    });

    return { hold, priced };
};
