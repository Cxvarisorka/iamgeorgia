import { config } from '../config.js';

/**
 * Turns a stored object key into something a browser can fetch.
 *
 * The database holds keys, never URLs. That is the whole point: moving CDN,
 * changing bucket or switching from R2 to S3 is a config change here rather
 * than an UPDATE across every image row. It also means a private object cannot
 * accidentally acquire a permanent public address — a private asset never goes
 * through this function at all, it goes through a signed URL issued after an
 * authorization check.
 */
export const publicUrl = (objectKey) =>
    `${config.media.publicBaseUrl.replace(/\/+$/, '')}/${objectKey}`;

const toVariant = (variant) => ({
    variant: variant.variant,
    format: variant.format,
    url: publicUrl(variant.objectKey),
    width: variant.width,
    height: variant.height
});

/**
 * A public image and its renditions.
 *
 * `url` is the original; `variants` carries thumb/card/gallery in WebP and
 * AVIF. The client picks — a card does not need a 1600px original, and a
 * `<picture>` element needs the whole set rather than one guess made here.
 */
export const toImageAsset = (fileAsset) => {
    if (!fileAsset) {
        return null;
    }

    return {
        id: fileAsset.id,
        url: publicUrl(fileAsset.objectKey),
        altText: fileAsset.altText ?? null,
        width: fileAsset.width ?? null,
        height: fileAsset.height ?? null,
        mimeType: fileAsset.mimeType,
        variants: (fileAsset.variants ?? []).map(toVariant)
    };
};

/** A hotel image: the asset plus where it sits in that hotel's gallery. */
export const toHotelImage = (hotelImage) => ({
    ...toImageAsset(hotelImage.fileAsset),
    hotelImageId: hotelImage.id,
    category: hotelImage.category,
    caption: hotelImage.caption ?? null,
    sortOrder: hotelImage.sortOrder,
    isCover: hotelImage.isCover
});

/**
 * A private file. Deliberately carries no URL.
 *
 * Reaching the bytes is a separate, audited request that returns a short-lived
 * signed URL. Serializing one here would defeat that, so the shape simply has
 * nowhere to put an address.
 */
export const toPrivateFile = (fileAsset) => ({
    id: fileAsset.id,
    originalFilename: fileAsset.originalFilename,
    mimeType: fileAsset.mimeType,
    sizeBytes: fileAsset.sizeBytes,
    category: fileAsset.category,
    uploadedAt: fileAsset.createdAt
});
