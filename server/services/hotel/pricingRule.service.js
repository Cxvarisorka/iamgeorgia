import { prisma } from '../../db/index.js';
import { config } from '../../config.js';
import { NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { dateOnlyToUtc, toDateOnly, todayInTimezone } from '../../lib/time.js';

/**
 * Resolving the markup for a buyer.
 *
 * This fills in the seam `resolveMarkupBps` has occupied since Phase 4. Every
 * caller already went through that function while it simply returned the
 * partner commission rate, so adding a whole rules table changed no call site —
 * which was the point of putting a resolver there before there was anything to
 * resolve.
 *
 * A rule matches when every field it *sets* matches the request; a null field
 * means "any". The most specific match wins, and specificity is counted rather
 * than ordered by hand, so adding a dimension later does not reshuffle the
 * existing precedence.
 */

/** How many dimensions a rule pins down. Higher is more specific. */
const specificity = (rule) =>
    (rule.partnerId ? 4 : 0) + (rule.hotelId ? 2 : 0) + (rule.destinationId ? 1 : 0);

/**
 * The markup for one buyer at one hotel.
 *
 * Falls back through: a matching rule, then the partner's own commission rate,
 * then the platform default. The commission rate stays in the chain because it
 * is what every existing partner already has, and pulling it out would silently
 * reprice them the day this shipped.
 *
 * `destinationId` and `timezone` may be given instead of a hotel, which is how
 * transfers reach the same rules: a journey has no property, but it does start
 * somewhere, and a rule scoped to a destination should price the drive to it as
 * well as the bed at the end of it. A hotel supplies both implicitly, so
 * existing callers are unchanged.
 */
export const resolveMarkup = async ({ partner, hotel, destinationId, timezone, date } = {}) => {
    const scopeDestinationId = destinationId ?? hotel?.destinationId ?? null;
    const on = date ?? todayInTimezone(timezone ?? hotel?.timezone ?? 'Asia/Tbilisi');

    const candidates = await prisma.pricingRule.findMany({
        where: {
            isActive: true,
            // A rule that names a partner applies only to that partner; a rule
            // that names none applies to everyone including anonymous guests.
            OR: [{ partnerId: null }, ...(partner?.id ? [{ partnerId: partner.id }] : [])],
            AND: [
                { OR: [{ hotelId: null }, ...(hotel?.id ? [{ hotelId: hotel.id }] : [])] },
                {
                    OR: [
                        { destinationId: null },
                        ...(scopeDestinationId ? [{ destinationId: scopeDestinationId }] : [])
                    ]
                },
                { OR: [{ validFrom: null }, { validFrom: { lte: dateOnlyToUtc(on) } }] },
                { OR: [{ validUntil: null }, { validUntil: { gte: dateOnlyToUtc(on) } }] }
            ]
        }
    });

    if (candidates.length > 0) {
        const [best] = candidates.sort(
            (a, b) => specificity(b) - specificity(a) || b.priority - a.priority
        );

        return { markupBps: best.markupBps, source: 'RULE', ruleId: best.id, label: best.label ?? null };
    }

    if (partner?.commissionRateBps != null) {
        return { markupBps: partner.commissionRateBps, source: 'PARTNER_COMMISSION' };
    }

    return { markupBps: config.hotel.defaultMarkupBps, source: 'PLATFORM_DEFAULT' };
};

export const listPricingRules = ({ partnerId, hotelId, includeInactive } = {}) =>
    prisma.pricingRule.findMany({
        where: {
            ...(includeInactive ? {} : { isActive: true }),
            ...(partnerId ? { partnerId } : {}),
            ...(hotelId ? { hotelId } : {})
        },
        include: {
            partner: { select: { id: true, reference: true, name: true } },
            hotel: { select: { id: true, name: true, slug: true } },
            destination: { select: { id: true, name: true, slug: true } }
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
    });

const toData = (input) => ({
    partnerId: input.partnerId ?? null,
    hotelId: input.hotelId ?? null,
    destinationId: input.destinationId ?? null,
    markupBps: input.markupBps,
    label: input.label ?? null,
    priority: input.priority ?? 0,
    isActive: input.isActive ?? true,
    validFrom: input.validFrom ? dateOnlyToUtc(input.validFrom) : null,
    validUntil: input.validUntil ? dateOnlyToUtc(input.validUntil) : null
});

export const upsertPricingRule = async (ruleId, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        if (ruleId) {
            const current = await tx.pricingRule.findUnique({ where: { id: ruleId } });

            if (!current) {
                throw new NotFoundError('Pricing rule not found');
            }
        }

        const data = toData(input);
        const rule = ruleId
            ? await tx.pricingRule.update({ where: { id: ruleId }, data })
            : await tx.pricingRule.create({ data });

        await recordAudit(tx, {
            action: ruleId ? 'PRICING_RULE_UPDATED' : 'PRICING_RULE_CREATED',
            actor,
            entityType: AUDIT_ENTITY.pricingRule,
            entityId: rule.id,
            summary: `${ruleId ? 'Updated' : 'Created'} pricing rule at ${rule.markupBps} bps`,
            metadata: {
                partnerId: rule.partnerId,
                hotelId: rule.hotelId,
                destinationId: rule.destinationId,
                markupBps: rule.markupBps,
                validFrom: rule.validFrom ? toDateOnly(rule.validFrom) : null,
                validUntil: rule.validUntil ? toDateOnly(rule.validUntil) : null
            },
            req
        });

        return rule;
    });

export const deletePricingRule = async (ruleId, actor, req) =>
    prisma.$transaction(async (tx) => {
        const rule = await tx.pricingRule.findUnique({ where: { id: ruleId } });

        if (!rule) {
            throw new NotFoundError('Pricing rule not found');
        }

        await tx.pricingRule.delete({ where: { id: ruleId } });

        await recordAudit(tx, {
            action: 'PRICING_RULE_DELETED',
            actor,
            entityType: AUDIT_ENTITY.pricingRule,
            entityId: ruleId,
            summary: `Deleted pricing rule at ${rule.markupBps} bps`,
            metadata: { partnerId: rule.partnerId, hotelId: rule.hotelId },
            req
        });

        return rule;
    });

/**
 * Explains which markup a buyer would get, and why.
 *
 * Exists because "why is this partner seeing that price" is the commonest
 * question about a B2B platform, and answering it by reading code is a bad way
 * to spend an afternoon.
 */
export const explainMarkup = async ({ partnerId, hotelId, date }) => {
    const [partner, hotel] = await Promise.all([
        partnerId ? prisma.partner.findUnique({ where: { id: partnerId } }) : null,
        hotelId ? prisma.hotel.findUnique({ where: { id: hotelId } }) : null
    ]);

    if (hotelId && !hotel) {
        throw new NotFoundError('Hotel not found');
    }

    if (partnerId && !partner) {
        throw new NotFoundError('Partner not found');
    }

    return resolveMarkup({ partner, hotel, date });
};
