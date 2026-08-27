import sharp from 'sharp';

import { config } from '../../config.js';
import { BadRequestError } from '../../lib/errors.js';

/**
 * Image processing.
 *
 * Three things happen here, and only one of them is about size:
 *
 *   1. The image is decoded. A file that sharp cannot decode is not an image,
 *      whatever its magic bytes claimed, and it is rejected here rather than
 *      discovered when a page tries to render it.
 *   2. Metadata is stripped. Phone photos carry GPS coordinates in EXIF, and a
 *      hotel gallery is the last place those should be republished. Orientation
 *      is applied first, so stripping it does not leave a sideways image.
 *   3. Renditions are written, so the CDN serves a real object rather than a
 *      resize on every request.
 */

// Widths chosen against the client's trimmed `deviceSizes` in next.config.ts.
const VARIANTS = [
    { variant: 'thumb', width: 320 },
    { variant: 'card', width: 640 },
    { variant: 'gallery', width: 1600 }
];

// sharp's own default, stated explicitly because it is the decompression-bomb
// guard: a 100 KB PNG can declare a 50000x50000 canvas and exhaust memory on
// decode. ~268 megapixels is far above any real photograph.
const MAX_INPUT_PIXELS = 268_402_689;

const open = (buffer) => sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });

const encode = (pipeline, format) => {
    if (format === 'webp') {
        return pipeline.webp({ quality: 82 });
    }

    if (format === 'avif') {
        return pipeline.avif({ quality: 55 });
    }

    return pipeline.jpeg({ quality: 86, mozjpeg: true });
};

/**
 * Re-encodes the original and builds every rendition.
 *
 * The original is re-encoded rather than stored as uploaded, because that is
 * what removes EXIF and what guarantees the stored bytes really are the image
 * sharp just decoded — not an image with something appended to it.
 */
export const processImage = async (buffer) => {
    let metadata;

    try {
        metadata = await open(buffer).metadata();
    } catch {
        throw new BadRequestError('That file is not an image we can read');
    }

    if (!metadata.width || !metadata.height) {
        throw new BadRequestError('That file is not an image we can read');
    }

    // `rotate()` with no argument applies the EXIF orientation; everything
    // after it works on upright pixels and carries no metadata forward.
    const upright = () => open(buffer).rotate();

    const originalFormat = metadata.format === 'png' ? 'png' : 'jpeg';
    const original = await (originalFormat === 'png'
        ? upright().png({ compressionLevel: 9 })
        : encode(upright(), 'jpeg')
    )
        .toBuffer({ resolveWithObject: true });

    const renditions = [];

    for (const { variant, width } of VARIANTS) {
        // Never upscale: a 400px logo has no business becoming a 1600px
        // "gallery" image that is mostly interpolation.
        const targetWidth = Math.min(width, original.info.width);

        for (const format of config.media.imageFormats) {
            const output = await encode(
                upright().resize({ width: targetWidth, withoutEnlargement: true }),
                format
            ).toBuffer({ resolveWithObject: true });

            renditions.push({
                variant,
                format,
                buffer: output.data,
                width: output.info.width,
                height: output.info.height,
                sizeBytes: output.data.length
            });
        }

        if (targetWidth === original.info.width) {
            // Anything larger would be the same picture again under a
            // different name.
            break;
        }
    }

    return {
        original: {
            buffer: original.data,
            format: originalFormat,
            mimeType: originalFormat === 'png' ? 'image/png' : 'image/jpeg',
            width: original.info.width,
            height: original.info.height,
            sizeBytes: original.data.length
        },
        renditions
    };
};
