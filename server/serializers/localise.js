import { defaultLocale, isSupportedLocale } from '../lib/locales.js';

/**
 * Merges a translation row over its English base record.
 *
 * This is the server half of the contract `client/data/i18n/merge.ts` already
 * implements: the English row stays the source of truth for everything that is
 * not language — ids, slugs, prices, coordinates, capacities — and a
 * translation supplies only prose, field by field. A half-finished translation
 * therefore reads translated where it exists and English everywhere else,
 * rather than blanking a page or falling back wholesale.
 *
 * Two absences mean the same thing and both fall through to English:
 *   * `null` — the column has never been filled in.
 *   * `[]` on a string list — Prisma defaults `description` to an empty array,
 *     so an untranslated list is indistinguishable from a deliberately empty
 *     one. Falling back is the safer reading: a hotel with no description is a
 *     worse outcome than one described in the wrong language.
 */
export const mergeTranslation = (base, translation, fields) => {
    if (!translation) {
        return base;
    }

    const merged = { ...base };

    for (const field of fields) {
        const value = translation[field];

        if (value === null || value === undefined) {
            continue;
        }

        if (Array.isArray(value) && value.length === 0) {
            continue;
        }

        merged[field] = value;
    }

    return merged;
};

/**
 * Picks the translation for a locale out of a record's `translations` array.
 *
 * Takes the already-loaded array rather than querying, so a list of fifty
 * hotels resolves fifty translations from one include instead of fifty round
 * trips. Returns null for the default locale: English is the base row, and
 * asking for it should never cost a merge.
 */
export const translationFor = (translations, locale) => {
    if (!locale || locale === defaultLocale || !isSupportedLocale(locale) || !Array.isArray(translations)) {
        return null;
    }

    return translations.find((translation) => translation.locale === locale) ?? null;
};

/** `translationFor` and `mergeTranslation` in one step, which is the usual use. */
export const localise = (base, translations, locale, fields) =>
    mergeTranslation(base, translationFor(translations, locale), fields);
