/**
 * The locales the platform serves.
 *
 * Mirrors `client/lib/i18n/config.ts`. English is the default and lives on the
 * base row of every translatable table; the other three are stored as
 * translation rows and merged over it at read time.
 *
 * Kept as a plain list rather than a Postgres enum: adding a fifth language
 * should be a deploy, not a migration, and the translation tables key on a
 * `locale` string precisely so that it can be.
 */
export const SUPPORTED_LOCALES = ['en', 'ka', 'ru', 'he'];

export const defaultLocale = 'en';

export const isSupportedLocale = (value) => SUPPORTED_LOCALES.includes(value);

/**
 * Resolves the locale to serve a request in.
 *
 * Anything unrecognised degrades to English rather than erroring: a stale
 * bookmark or a hand-edited query string should show an English page, not a
 * validation failure. This is the same forgiving treatment
 * `partnerQueryFromParams` already gives unknown filter values on the client.
 */
export const resolveLocale = (value) => (isSupportedLocale(value) ? value : defaultLocale);
