import { prisma } from '../../db/index.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';

/**
 * A hotel's child policy.
 *
 * Replaced whole rather than patched, because the bands only make sense as a
 * set: editing one band at a time lets a hotel sit in a state where ages 6 to 8
 * belong to no band at all, and the first family to search for those ages would
 * be the thing that discovered it.
 *
 * A hotel with no policy row uses the platform default (infant 0-2, child 3-11,
 * adult 12+), so this is genuinely optional configuration rather than something
 * every property has to fill in before it can be published.
 */

const DEFAULT_BANDS = [
    { minAge: 0, maxAge: 2, label: 'Infant', chargeMode: 'FREE', chargeValue: 0, requiresExtraBed: false },
    {
        minAge: 3,
        maxAge: 11,
        label: 'Child',
        chargeMode: 'PERCENT_OF_ADULT',
        chargeValue: 5000,
        requiresExtraBed: true
    }
];

export const findChildPolicy = async (hotelId) => {
    const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        include: { childPolicy: { include: { bands: { orderBy: { minAge: 'asc' } } } } }
    });

    if (!hotel) {
        throw new NotFoundError('Hotel not found');
    }

    return hotel.childPolicy;
};

/**
 * Checks the bands cover a continuous range with no gaps and no overlaps.
 *
 * Both failures are silent in production and both produce wrong money. A gap
 * means an age resolves to no band and gets charged as an adult by default; an
 * overlap means the charge depends on which row the resolver happened to pick.
 * The resolver breaks ties by preferring the narrower band, but a hotel should
 * never be relying on that.
 */
const assertBandsCoherent = (bands) => {
    if (bands.length === 0) {
        return;
    }

    const sorted = [...bands].sort((a, b) => a.minAge - b.minAge);

    if (sorted[0].minAge !== 0) {
        throw new BadRequestError('The first age band must start at 0', { minAge: sorted[0].minAge });
    }

    for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];

        if (current.minAge <= previous.maxAge) {
            throw new BadRequestError(
                `Age bands "${previous.label}" and "${current.label}" overlap`,
                { overlapAt: current.minAge }
            );
        }

        if (current.minAge !== previous.maxAge + 1) {
            throw new BadRequestError(
                `Ages ${previous.maxAge + 1} to ${current.minAge - 1} fall into no band`,
                { gapFrom: previous.maxAge + 1, gapTo: current.minAge - 1 }
            );
        }
    }
};

export const upsertChildPolicy = async (hotelId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const hotel = await tx.hotel.findUnique({ where: { id: hotelId } });

        if (!hotel) {
            throw new NotFoundError('Hotel not found');
        }

        const bands = input.bands.length > 0 ? input.bands : DEFAULT_BANDS;
        assertBandsCoherent(bands);

        const { bands: _ignored, ...policyFields } = input;

        const policy = await tx.childPolicy.upsert({
            where: { hotelId },
            create: { hotelId, ...policyFields },
            update: policyFields
        });

        // Replaced whole: the set is the unit of meaning, so deleting and
        // recreating inside the transaction is both simpler and safer than
        // reconciling row by row.
        await tx.childPolicyBand.deleteMany({ where: { childPolicyId: policy.id } });
        await tx.childPolicyBand.createMany({
            data: bands.map((band) => ({ ...band, childPolicyId: policy.id }))
        });

        await recordAudit(tx, {
            action: 'CHILD_POLICY_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.hotel,
            entityId: hotelId,
            summary: `Updated the child policy for ${hotel.name}`,
            metadata: {
                infantMaxAge: policy.infantMaxAge,
                childMaxAge: policy.childMaxAge,
                bands: bands.length
            },
            req
        });

        return tx.childPolicy.findUnique({
            where: { id: policy.id },
            include: { bands: { orderBy: { minAge: 'asc' } } }
        });
    });
