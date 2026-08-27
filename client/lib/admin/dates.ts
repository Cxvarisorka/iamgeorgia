/**
 * Calendar-date helpers for the admin screens.
 *
 * These mirror `server/lib/time.js`: a stay date is a `YYYY-MM-DD` string, and
 * it is parsed and read back in UTC so the browser's own time zone can never
 * shift it a day. Check-out stays exclusive everywhere.
 */

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const addDaysISO = (dateOnly: string, days: number): string => {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

/** ISO weekday, 1 = Monday through 7 = Sunday. */
export const weekdayOfISO = (dateOnly: string): number => {
  const day = new Date(`${dateOnly}T00:00:00Z`).getUTCDay();

  return day === 0 ? 7 : day;
};

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export const formatWeekday = (dateOnly: string): string =>
  WEEKDAY.format(new Date(`${dateOnly}T00:00:00Z`));

export const formatDayMonth = (dateOnly: string): string =>
  DAY.format(new Date(`${dateOnly}T00:00:00Z`));
