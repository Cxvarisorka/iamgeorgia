/**
 * Vocabulary shared by every screen that places something on the map.
 *
 * Pick-up points, hotels and destinations all ask for the same two things — a
 * URL segment derived from a name, and an IANA time zone from a short list —
 * and each of them had started to carry its own copy. One definition is what
 * keeps a slug typed on the destination form and a slug typed on the point
 * form from normalising two different ways.
 */

/**
 * A name to a URL segment.
 *
 * Strips diacritics before the character filter so "Sadgeri" survives and
 * "Sadgéri" does not become "sadg-ri". Georgian and Cyrillic names normalise
 * to nothing, which is correct: a slug is an ASCII URL segment, and a place
 * named only in Georgian needs one typed by hand.
 */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The zones the platform actually operates in.
 *
 * A list rather than the full tz database: the server validates against the
 * runtime's own copy, so anything else is still accepted by the API — this is
 * only what the panel offers without making an operator scroll six hundred
 * options to find the one they use every time.
 */
export const timezoneOptions = [
  "Asia/Tbilisi",
  "Asia/Yerevan",
  "Asia/Baku",
  "Europe/Istanbul",
  "Europe/Moscow",
];
