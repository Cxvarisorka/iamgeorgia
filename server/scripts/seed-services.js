import { prisma, disconnect } from '../db/index.js';
import { SERVICES, SERVICE_CONTENT } from '../db/seed/services.js';
import { createService, publishService } from '../services/service/service.service.js';

/**
 * Seeds the service catalogue from `db/seed/services.js`.
 *
 *   node scripts/seed-services.js
 *
 * Services are the fourth product and the only one with no inventory: a
 * mashgiach, a caterer and a guide are all "somebody is available, at a
 * price". They are sold inside packages, so this seed exists mainly to give
 * `scripts/seed-packages.js` something to point its SERVICE slots at.
 *
 * Idempotent by slug. Prerequisites: `seed-reference.js` for the cancellation
 * templates, and `seed-catalogue.js` for the destinations the entries name.
 */

const LOCALES = ['ka', 'ru', 'he'];

/**
 * Everything is published, because a DRAFT service cannot fill a package slot
 * and a catalogue nobody can sell from is not a useful seed.
 */
const seedService = async (fixture, { policy }) => {
    const destination = fixture.destinationSlug
        ? await prisma.destination.findUnique({ where: { slug: fixture.destinationSlug }, select: { id: true } })
        : null;

    if (fixture.destinationSlug && !destination) {
        console.warn(`Skipping ${fixture.slug}: destination "${fixture.destinationSlug}" is not seeded`);

        return null;
    }

    const service = await createService(
        {
            slug: fixture.slug,
            name: fixture.name,
            category: fixture.category,
            basis: fixture.basis,
            netCents: fixture.netCents,
            currency: 'GEL',
            destinationId: destination?.id ?? null,
            cancellationPolicyId: policy.id,
            noticeHours: fixture.noticeHours,
            confirmationMode: fixture.confirmationMode,
            isKosher: fixture.isKosher,
            kosherAuthority: fixture.kosherAuthority ?? null,
            summary: fixture.summary,
            description: fixture.description,
            included: fixture.included,
            // All of them: a guide and a pair of boots are things a family adds
            // to its own trip as readily as a caterer is. Gating half the
            // catalogue to trade only made a package's optional slot vanish
            // for the very buyer it was there to tempt.
            b2cEnabled: true
        },
        null,
        null
    );

    for (const locale of LOCALES) {
        const text = SERVICE_CONTENT[locale]?.[fixture.slug];

        if (!text) continue;

        await prisma.serviceTranslation.create({
            data: { serviceId: service.id, locale, name: text.name, summary: text.summary }
        });
    }

    await publishService(service.id, null, null);

    return service;
};

const main = async () => {
    const policy = await prisma.cancellationPolicy.findFirst({ where: { hotelId: null, kind: 'TIERED' } });

    if (!policy) {
        throw new Error('Run scripts/seed-reference.js first: the tiered cancellation template is missing');
    }

    let created = 0;
    let skipped = 0;

    for (const fixture of SERVICES) {
        const existing = await prisma.service.findUnique({ where: { slug: fixture.slug }, select: { id: true } });

        if (existing) {
            skipped += 1;
            continue;
        }

        const service = await seedService(fixture, { policy });

        if (!service) {
            skipped += 1;
            continue;
        }

        created += 1;
        console.log(`${'Service'.padEnd(8)} ${service.slug} (${fixture.basis})`);
    }

    console.log(`Services: ${created} created, ${skipped} skipped`);
};

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(disconnect);
