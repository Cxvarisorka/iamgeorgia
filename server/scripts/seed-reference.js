import { prisma, disconnect } from '../db/index.js';
import { AMENITIES } from '../db/seed/amenities.js';
import { KOSHER_AMENITIES } from '../db/seed/kosherAmenities.js';
import { KOSHER_AMENITY_TRANSLATIONS } from '../db/seed/kosherAmenityTranslations.js';
import { BED_TYPES } from '../db/seed/bedTypes.js';
import { MEAL_PLANS } from '../db/seed/mealPlans.js';
import { seedPolicyTemplates } from '../services/hotel/policyCatalog.service.js';

/**
 * Loads every reference table the hotel module needs.
 *
 *   node scripts/seed-reference.js
 *
 * Idempotent by design: it upserts on the natural key, so running it after
 * adding a row to a seed file adds that one and leaves everything else alone.
 *
 * It never deletes. An amenity or bed type removed from a seed file may still
 * be attached to a hotel or a room, and taking it away would silently change
 * what that property claims to offer. Retiring one is an admin action
 * (`isActive: false`), not a seed concern.
 *
 * Editorial labels *are* overwritten on every run: the English name is owned by
 * the seed file. Translations live in their own tables and are untouched.
 */
const seed = async (label, rows, { model, key, editable }) => {
    let created = 0;

    for (const row of rows) {
        const existing = await prisma[model].findUnique({ where: { [key]: row[key] } });

        await prisma[model].upsert({
            where: { [key]: row[key] },
            create: row,
            update: Object.fromEntries(editable.map((field) => [field, row[field]]))
        });

        if (!existing) {
            created += 1;
        }
    }

    console.log(
        `${label.padEnd(12)} ${String(created).padStart(3)} created, ` +
            `${String(rows.length - created).padStart(3)} updated, ${rows.length} total`
    );
};

/**
 * Facility names in the non-default locales.
 *
 * Upserted on (amenityId, locale) like every other translation, and only for
 * codes that exist — a translation for an amenity nobody seeded is skipped
 * rather than failing the run, so removing a code from a seed file does not
 * break this script.
 */
const seedTranslations = async (label, translations) => {
    let written = 0;

    for (const [code, byLocale] of Object.entries(translations)) {
        const amenity = await prisma.amenity.findUnique({ where: { code }, select: { id: true } });

        if (!amenity) {
            continue;
        }

        for (const [locale, name] of Object.entries(byLocale)) {
            await prisma.amenityTranslation.upsert({
                where: { amenityId_locale: { amenityId: amenity.id, locale } },
                create: { amenityId: amenity.id, locale, name },
                update: { name }
            });

            written += 1;
        }
    }

    console.log(`${label.padEnd(12)} ${String(written).padStart(3)} translations written`);
};

const run = async () => {
    await seed('Amenities', AMENITIES, {
        model: 'amenity',
        key: 'code',
        editable: ['name', 'category', 'scope', 'icon', 'sortOrder']
    });

    // Kosher facilities are amenities like any other — the same table, the same
    // join, the same filters. They are seeded separately only because their
    // sort order continues past the general vocabulary rather than being
    // interleaved with it.
    await seed('Kosher', KOSHER_AMENITIES, {
        model: 'amenity',
        key: 'code',
        editable: ['name', 'category', 'scope', 'icon', 'sortOrder']
    });

    await seedTranslations('Kosher i18n', KOSHER_AMENITY_TRANSLATIONS);

    await seed('Bed types', BED_TYPES, {
        model: 'bedType',
        key: 'code',
        editable: ['name', 'sleeps', 'icon', 'sortOrder']
    });

    await seed('Meal plans', MEAL_PLANS, {
        model: 'mealPlan',
        key: 'code',
        editable: ['name', 'description', 'sortOrder']
    });

    // Shared cancellation and payment templates, so a new property is offered a
    // choice rather than a blank policy form. Never updated in place: a hotel
    // may already be selling against one, and silently retightening its terms
    // would change what existing guests are owed.
    const templates = await seedPolicyTemplates(prisma);
    console.log(`${'Policies'.padEnd(12)} ${String(templates).padStart(3)} created (existing left untouched)`);
};

run()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(disconnect);
