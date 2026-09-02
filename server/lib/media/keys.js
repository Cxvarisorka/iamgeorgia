import { randomBytes } from 'node:crypto';

/**
 * Object keys.
 *
 * A key is generated, never derived from what was uploaded. That one rule
 * closes an entire family of problems at once: path traversal (`../../etc`),
 * collisions between two files called `photo.jpg`, Windows reserved names,
 * right-to-left override characters in a filename, and the general awkwardness
 * of unicode in a URL. The original name is kept on the row for display and is
 * never used to build anything.
 *
 * The random segment also means a public key is unguessable, so an image that
 * has not been attached to anything yet is not discoverable by enumeration.
 */

const CATEGORY_PREFIX = {
    HOTEL_IMAGE: 'hotel-image',
    ROOM_IMAGE: 'room-image',
    AMENITY_ICON: 'amenity-icon',
    CONTRACT: 'contract',
    RATE_SHEET: 'rate-sheet',
    INVOICE: 'invoice',
    VOUCHER: 'voucher',
    IMPORT: 'import',
    KOSHER_CERTIFICATE: 'kosher-certificate',
    FLEET_IMAGE: 'fleet-image',
    DRIVER_PHOTO: 'driver-photo',
    DRIVER_DOCUMENT: 'driver-document',
    VEHICLE_DOCUMENT: 'vehicle-document',
    OTHER: 'other'
};

/** The folder a category's objects live under. Unknown categories fall to `other`. */
export const prefixFor = (category) => CATEGORY_PREFIX[category] ?? CATEGORY_PREFIX.OTHER;

/**
 * A fresh, unguessable folder for one asset and all of its renditions.
 *
 * 16 random bytes, so an attacker cannot walk the bucket even when the bucket
 * is public. Returned as a folder rather than a full key because the original
 * and every variant share it — which is what makes deleting an asset a prefix
 * delete rather than a list of keys to remember.
 */
export const newAssetFolder = (category) => `${prefixFor(category)}/${randomBytes(16).toString('hex')}`;

export const objectKeyFor = (folder, variant, extension) => `${folder}/${variant}.${extension}`;

/**
 * The extension to write, chosen from the *sniffed* type.
 *
 * Never from the uploaded filename: a file called `photo.jpg` that is really a
 * PE binary must not be stored as `.jpg`, and a file called `x.php` that really
 * is a JPEG must not keep that name anywhere near a web root.
 */
export const EXTENSION_FOR_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'text/csv': 'csv'
};

export const extensionForMime = (mimeType) => EXTENSION_FOR_MIME[mimeType] ?? 'bin';
