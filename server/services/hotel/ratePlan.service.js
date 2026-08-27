import { prisma } from '../../db/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { dateOnlyToUtc, toDateOnly } from '../../lib/time.js';
import { findUsablePolicy } from './policyCatalog.service.js';

/**
 * Rate plans: the sellable offer.
 *
 * A RatePlan is a RoomType sold with a particular board, under particular
 * cancellation terms, on particular payment terms. It is the thing a guest
 * books and the thing a price attaches to in Phase 4.
 *
 * Everything here is scoped through hotel -> room type -> rate plan, so an id
 * from one property can never be reached through another's URL, and the meal
 * plan and both policies are checked to be ones this hotel may actually use.
 */

const ratePlanInclude = {
    mealPlan: true,
    cancellationPolicy: { include: { rules: { orderBy: { hoursBeforeCheckIn: 'desc' } } } },
    paymentPolicy: true,
    restrictions: { orderBy: { startDate: 'asc' } }
};

const assertRoomType = async (client, hotelId, roomTypeId) => {
    const roomType = await client.roomType.findFirst({
        where: { id: roomTypeId, hotelId },
        include: { hotel: { select: { id: true, name: true, currency: true, status: true } } }
    });

    if (!roomType) {
        throw new NotFoundError('Room type not found');
    }

    return roomType;
};

export const findRatePlanOr404 = async (hotelId, roomTypeId, ratePlanId) => {
    const ratePlan = await prisma.ratePlan.findFirst({
        where: { id: ratePlanId, roomTypeId, roomType: { hotelId } },
        include: ratePlanInclude
    });

    if (!ratePlan) {
        throw new NotFoundError('Rate plan not found');
    }

    return ratePlan;
};

export const listRatePlans = async (hotelId, roomTypeId, { status, includePartnerOnly } = {}) => {
    await assertRoomType(prisma, hotelId, roomTypeId);

    return prisma.ratePlan.findMany({
        where: {
            roomTypeId,
            ...(status ? { status: { in: Array.isArray(status) ? status : [status] } } : {}),
            ...(includePartnerOnly ? {} : { visibility: 'PUBLIC' })
        },
        include: ratePlanInclude,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
};

/**
 * Resolves the meal plan and both policies, refusing anything this hotel is not
 * entitled to reference.
 *
 * Doing this in one place means neither create nor update can forget it, and
 * the failure is a 400 naming the field rather than a foreign key violation.
 */
const resolveReferences = async (tx, hotelId, input, current = {}) => {
    const data = {};

    const mealPlanCode = input.mealPlanCode;

    if (mealPlanCode) {
        const mealPlan = await tx.mealPlan.findUnique({ where: { code: mealPlanCode } });

        if (!mealPlan) {
            throw new BadRequestError('That meal plan does not exist', { field: 'mealPlanCode' });
        }

        data.mealPlanId = mealPlan.id;
    }

    if (input.cancellationPolicyId) {
        await findUsablePolicy(tx, 'cancellationPolicy', hotelId, input.cancellationPolicyId);
        data.cancellationPolicyId = input.cancellationPolicyId;
    }

    if (input.paymentPolicyId) {
        await findUsablePolicy(tx, 'paymentPolicy', hotelId, input.paymentPolicyId);
        data.paymentPolicyId = input.paymentPolicyId;
    }

    // Occupancy on the plan narrows the room's, it cannot widen it: a rate that
    // claims to sleep four in a room that sleeps two would produce an offer
    // that fails at booking.
    const maxAdults = input.maxAdults ?? current.maxAdults;

    if (maxAdults != null && current.roomType && maxAdults > current.roomType.maxAdults) {
        throw new BadRequestError('A rate plan cannot allow more adults than the room does', {
            field: 'maxAdults',
            roomMaxAdults: current.roomType.maxAdults
        });
    }

    return data;
};

const toDateColumn = (value) => (value == null ? value : dateOnlyToUtc(value));

export const createRatePlan = async (hotelId, roomTypeId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const roomType = await assertRoomType(tx, hotelId, roomTypeId);

        if (roomType.hotel.status === 'ARCHIVED') {
            throw new ConflictError('An archived hotel cannot be edited', { status: roomType.hotel.status });
        }

        if (roomType.status === 'ARCHIVED') {
            throw new ConflictError('An archived room type cannot take new rate plans');
        }

        const references = await resolveReferences(tx, hotelId, input, { roomType });
        const existing = await tx.ratePlan.count({ where: { roomTypeId } });

        const { mealPlanCode, sellableFrom, sellableUntil, ...fields } = input;

        const ratePlan = await tx.ratePlan.create({
            data: {
                ...fields,
                ...references,
                roomTypeId,
                // The hotel's contracted currency unless told otherwise, so a
                // plan cannot quietly be quoted in one the property does not
                // contract in.
                currency: input.currency ?? roomType.hotel.currency,
                sortOrder: input.sortOrder ?? existing,
                sellableFrom: toDateColumn(sellableFrom),
                sellableUntil: toDateColumn(sellableUntil)
            }
        });

        await recordAudit(tx, {
            action: 'RATE_PLAN_CREATED',
            actor,
            entityType: AUDIT_ENTITY.ratePlan,
            entityId: ratePlan.id,
            summary: `Added rate plan ${ratePlan.name} to ${roomType.name}`,
            metadata: { hotelId, roomTypeId, code: ratePlan.code, mealPlanCode },
            req
        });

        return ratePlan;
    });

export const updateRatePlan = async (hotelId, roomTypeId, ratePlanId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const roomType = await assertRoomType(tx, hotelId, roomTypeId);
        const current = await tx.ratePlan.findFirst({ where: { id: ratePlanId, roomTypeId } });

        if (!current) {
            throw new NotFoundError('Rate plan not found');
        }

        if (current.status === 'ARCHIVED') {
            throw new ConflictError('An archived rate plan cannot be edited', { status: current.status });
        }

        const references = await resolveReferences(tx, hotelId, input, { ...current, roomType });
        const { mealPlanCode, sellableFrom, sellableUntil, ...fields } = input;

        const ratePlan = await tx.ratePlan.update({
            where: { id: ratePlanId },
            data: {
                ...fields,
                ...references,
                ...(sellableFrom === undefined ? {} : { sellableFrom: toDateColumn(sellableFrom) }),
                ...(sellableUntil === undefined ? {} : { sellableUntil: toDateColumn(sellableUntil) })
            }
        });

        await recordAudit(tx, {
            action: 'RATE_PLAN_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.ratePlan,
            entityId: ratePlanId,
            summary: `Updated rate plan ${ratePlan.name}`,
            metadata: { hotelId, roomTypeId, fields: Object.keys(input) },
            req
        });

        return ratePlan;
    });

export const archiveRatePlan = async (hotelId, roomTypeId, ratePlanId, actor, req) =>
    prisma.$transaction(async (tx) => {
        await assertRoomType(tx, hotelId, roomTypeId);
        const ratePlan = await tx.ratePlan.findFirst({ where: { id: ratePlanId, roomTypeId } });

        if (!ratePlan) {
            throw new NotFoundError('Rate plan not found');
        }

        if (ratePlan.status === 'ARCHIVED') {
            throw new ConflictError('This rate plan is already archived', { status: ratePlan.status });
        }

        const archived = await tx.ratePlan.update({
            where: { id: ratePlanId },
            data: { status: 'ARCHIVED' }
        });

        await recordAudit(tx, {
            action: 'RATE_PLAN_ARCHIVED',
            actor,
            entityType: AUDIT_ENTITY.ratePlan,
            entityId: ratePlanId,
            summary: `Archived rate plan ${ratePlan.name}`,
            metadata: { hotelId, roomTypeId, from: ratePlan.status },
            req
        });

        return archived;
    });

/**
 * Adds or replaces a date-ranged restriction window.
 *
 * Windows are allowed to overlap: a hotel may set a two-night minimum for all
 * of December and then close arrivals on Christmas Day, and forcing those into
 * one row would make both harder to edit. Phase 5 resolves overlaps by applying
 * the most restrictive value found for a night, which is the safe direction.
 */
export const upsertRestriction = async (hotelId, roomTypeId, ratePlanId, restrictionId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        await assertRoomType(tx, hotelId, roomTypeId);
        const ratePlan = await tx.ratePlan.findFirst({ where: { id: ratePlanId, roomTypeId } });

        if (!ratePlan) {
            throw new NotFoundError('Rate plan not found');
        }

        const data = {
            ...input,
            startDate: dateOnlyToUtc(input.startDate),
            endDate: dateOnlyToUtc(input.endDate)
        };

        if (restrictionId) {
            const current = await tx.ratePlanRestriction.findFirst({ where: { id: restrictionId, ratePlanId } });

            if (!current) {
                throw new NotFoundError('Restriction not found');
            }
        }

        const restriction = restrictionId
            ? await tx.ratePlanRestriction.update({ where: { id: restrictionId }, data })
            : await tx.ratePlanRestriction.create({ data: { ...data, ratePlanId } });

        await recordAudit(tx, {
            action: 'RATE_PLAN_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.ratePlan,
            entityId: ratePlanId,
            summary: `${restrictionId ? 'Updated' : 'Added'} a restriction on ${ratePlan.name}`,
            metadata: {
                hotelId,
                roomTypeId,
                from: toDateOnly(restriction.startDate),
                to: toDateOnly(restriction.endDate),
                minStay: restriction.minStay ?? null,
                stopSell: restriction.stopSell
            },
            req
        });

        return restriction;
    });

export const deleteRestriction = async (hotelId, roomTypeId, ratePlanId, restrictionId, actor, req) =>
    prisma.$transaction(async (tx) => {
        await assertRoomType(tx, hotelId, roomTypeId);
        const restriction = await tx.ratePlanRestriction.findFirst({
            where: { id: restrictionId, ratePlanId, ratePlan: { roomTypeId } }
        });

        if (!restriction) {
            throw new NotFoundError('Restriction not found');
        }

        await tx.ratePlanRestriction.delete({ where: { id: restrictionId } });

        await recordAudit(tx, {
            action: 'RATE_PLAN_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.ratePlan,
            entityId: ratePlanId,
            summary: 'Removed a restriction',
            metadata: { hotelId, roomTypeId, restrictionId },
            req
        });

        return restriction;
    });

export const setHotelMealPlan = async (hotelId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await tx.hotel.findUnique({ where: { id: hotelId } });

        if (!hotel) {
            throw new NotFoundError('Hotel not found');
        }

        const mealPlan = await tx.mealPlan.findUnique({ where: { code: input.mealPlanCode } });

        if (!mealPlan) {
            throw new BadRequestError('That meal plan does not exist', { field: 'mealPlanCode' });
        }

        const { mealPlanCode, ...fields } = input;

        const hotelMealPlan = await tx.hotelMealPlan.upsert({
            where: { hotelId_mealPlanId: { hotelId, mealPlanId: mealPlan.id } },
            create: { hotelId, mealPlanId: mealPlan.id, ...fields },
            update: fields,
            include: { mealPlan: true }
        });

        await recordAudit(tx, {
            action: 'HOTEL_MEAL_PLAN_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.hotel,
            entityId: hotelId,
            summary: `Described ${mealPlan.code} for ${hotel.name}`,
            metadata: { mealPlanCode },
            req
        });

        return hotelMealPlan;
    });

export const listHotelMealPlans = async (hotelId) => {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });

    if (!hotel) {
        throw new NotFoundError('Hotel not found');
    }

    return prisma.hotelMealPlan.findMany({
        where: { hotelId },
        include: { mealPlan: true },
        orderBy: { mealPlan: { sortOrder: 'asc' } }
    });
};
