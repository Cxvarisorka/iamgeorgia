import { prisma, disconnect } from '../db/index.js';
import { PACKAGES, PACKAGE_CONTENT } from '../db/seed/packages.js';
import { createPackage, publishPackage, upsertKosherProfile } from '../services/package/package.service.js';
import { refreshPackagePriceFrom } from '../services/package/priceFrom.service.js';

/**
 * Seeds sample packages from `db/seed/packages.js`.
 *
 *   node scripts/seed-packages.js
 *
 * A package is a template of typed slots, so this script's real work is
 * turning the fixtures' product **slugs** into ids: a slot that names a hotel
 * or a tour that is not seeded cannot be written, and a template with a
 * missing slot is worse than no template — so such a package is skipped whole,
 * with a line saying which slug was missing.
 *
 * Prerequisites, in order: `seed-reference.js`, `seed-catalogue.js`,
 * `seed-transfers.js`, `seed-tours.js`, `seed-services.js`. Idempotent by slug.
 */

const LOCALES = ['ka', 'ru', 'he'];

/** Every slug a fixture's slots reference, resolved once per package. */
const resolveProducts = async (fixture) => {
    const missing = [];

    const bySlug = async (model, slug, label) => {
        if (!slug) return null;

        const row = await prisma[model].findUnique({ where: { slug }, select: { id: true } });

        if (!row) missing.push(`${label} "${slug}"`);

        return row;
    };

    const destination = await bySlug('destination', fixture.destinationSlug, 'destination');
    const components = [];

    for (const slot of fixture.components) {
        const [hotel, tour, service, fromPoint, toPoint] = await Promise.all([
            bySlug('hotel', slot.hotelSlug, 'hotel'),
            bySlug('tour', slot.tourSlug, 'tour'),
            bySlug('service', slot.serviceSlug, 'service'),
            bySlug('transferPoint', slot.fromPointSlug, 'pick-up point'),
            bySlug('transferPoint', slot.toPointSlug, 'drop-off point')
        ]);

        components.push({
            componentType: slot.componentType,
            label: slot.label,
            required: slot.required ?? true,
            dayOffset: slot.dayOffset ?? 0,
            ...(slot.componentType === 'HOTEL_STAY' ? { nights: slot.nights, hotelId: hotel?.id ?? null } : {}),
            ...(slot.componentType === 'TRANSFER'
                ? { fromPointId: fromPoint?.id ?? null, toPointId: toPoint?.id ?? null, timeOfDay: slot.timeOfDay ?? null }
                : {}),
            ...(slot.componentType === 'TOUR' ? { tourId: tour?.id ?? null } : {}),
            ...(slot.componentType === 'SERVICE'
                ? { serviceId: service?.id ?? null, quantityRule: slot.quantityRule ?? 'ONE' }
                : {})
        });
    }

    return { destination, components, missing };
};

const seedPackage = async (fixture) => {
    const { destination, components, missing } = await resolveProducts(fixture);

    if (missing.length > 0 || !destination) {
        console.warn(`Skipping ${fixture.slug}: ${missing.join(', ') || 'destination missing'} not seeded`);

        return null;
    }

    const pkg = await createPackage(
        {
            slug: fixture.slug,
            name: fixture.name,
            destinationId: destination.id,
            summary: fixture.summary,
            description: fixture.description,
            image: fixture.image,
            nights: fixture.nights,
            currency: 'GEL',
            b2cEnabled: fixture.b2cEnabled ?? false,
            featured: fixture.featured ?? false,
            ...(fixture.maxAdults ? { maxAdults: fixture.maxAdults } : {}),
            ...(fixture.maxPax ? { maxPax: fixture.maxPax } : {}),
            adjustmentKind: fixture.adjustment.kind,
            adjustmentValue: fixture.adjustment.value,
            adjustmentAppliesTo: fixture.adjustment.appliesTo,
            components
        },
        null,
        null
    );

    // The profile is written after the slots, because it is validated against
    // them: a kosher package whose hotel cannot meet its minimum is refused,
    // and there is nothing to judge until the slots exist.
    if (fixture.kosher) {
        await upsertKosherProfile(pkg.id, fixture.kosher, null, null);
    }

    for (const locale of LOCALES) {
        const text = PACKAGE_CONTENT[locale]?.[fixture.slug];

        if (!text) continue;

        await prisma.packageTranslation.create({
            data: { packageId: pkg.id, locale, name: text.name, summary: text.summary }
        });
    }

    await publishPackage(pkg.id, null, null);

    // A card with no figure on it looks broken. The sweeper would fill this in
    // within a day; seeding it means the listing reads correctly immediately.
    const priceFrom = await refreshPackagePriceFrom(
        await prisma.package.findUnique({
            where: { id: pkg.id },
            select: { id: true, timezone: true, nights: true, minAdults: true, validFrom: true, validUntil: true }
        })
    );

    return { pkg, priceFrom };
};

const main = async () => {
    let created = 0;
    let skipped = 0;

    for (const fixture of PACKAGES) {
        const existing = await prisma.package.findUnique({ where: { slug: fixture.slug }, select: { id: true } });

        if (existing) {
            skipped += 1;
            continue;
        }

        const result = await seedPackage(fixture);

        if (!result) {
            skipped += 1;
            continue;
        }

        created += 1;
        console.log(
            `${'Package'.padEnd(8)} ${result.pkg.slug} (${fixture.nights} nights, ${fixture.components.length} slots)` +
                `${result.priceFrom > 0 ? ` from ${(result.priceFrom / 100).toFixed(2)} GEL` : ' — not quotable on any sample date'}`
        );
    }

    console.log(`Packages: ${created} created, ${skipped} skipped`);
};

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(disconnect);
