import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import { config } from '../../config.js';
import { BadGatewayError, BadRequestError, NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { signObjectKey } from '../../lib/media/signing.js';

/**
 * Object storage, behind one interface with two drivers.
 *
 * `s3` is Cloudflare R2 (or AWS — R2 speaks S3, which is the whole reason the
 * SDK is the one shipped here). `local` writes to a directory and is what the
 * test suite and a fresh checkout use, so neither needs credentials, a network,
 * or a bucket someone has to remember to empty.
 *
 * Everything above this file deals in object *keys*. Nothing else knows which
 * driver is in play, which bucket a visibility maps to, or how a private link
 * is signed — which is what makes swapping provider a config change.
 */

const isPrivate = (visibility) => visibility === 'PRIVATE';

export const bucketFor = (visibility) =>
    isPrivate(visibility) ? config.media.privateBucket : config.media.publicBucket;

// ---------------------------------------------------------------- local ----

const localPath = (visibility, key) => {
    const root = resolve(config.media.localRoot, bucketFor(visibility));
    const full = resolve(root, key);

    // The keys this application generates cannot escape, but the serving route
    // in routes/media.routes.js hands this whatever was in the URL, so a key
    // with `..` in it can arrive from outside. That is a bad request, not a
    // storage fault: the object it names was never ours to serve.
    if (full !== root && !full.startsWith(root + sep)) {
        throw new BadRequestError('Invalid object key');
    }

    return full;
};

// The two codes that mean "there is no such object". Anything else — EACCES,
// EMFILE, EIO — means the object may well exist and this process cannot read
// it, which is a server fault and must not be reported as a missing file.
const MISSING_FILE_CODES = new Set(['ENOENT', 'ENOTDIR']);

const localDriver = {
    async put({ key, body, visibility }) {
        const path = localPath(visibility, key);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, body);
    },

    async get({ key, visibility }) {
        try {
            return await readFile(localPath(visibility, key));
        } catch (err) {
            if (MISSING_FILE_CODES.has(err?.code)) {
                throw new NotFoundError('Object not found');
            }

            logger.error({ err, key }, 'Could not read a local media object');
            throw err;
        }
    },

    async remove({ key, visibility }) {
        await rm(localPath(visibility, key), { force: true });
    },

    async removePrefix({ prefix, visibility }) {
        await rm(localPath(visibility, prefix), { recursive: true, force: true });
    },

    // Mirrors the S3 contract: a URL that carries its own expiry and stops
    // working, served by the route in routes/media.routes.js.
    async signedUrl({ key, expiresIn }) {
        const { expiresAt, signature } = signObjectKey(key, expiresIn);
        const base = config.appUrl.replace(/\/+$/, '');

        return `${base}/media/private/${key}?expires=${expiresAt}&signature=${signature}`;
    }
};

// ------------------------------------------------------------------- s3 ----

// Imported lazily so a checkout running on the local driver never pays to load
// the AWS SDK, and so a missing credential is an error at first use rather than
// at import time.
let s3ClientPromise = null;

const s3Client = async () => {
    if (!s3ClientPromise) {
        s3ClientPromise = (async () => {
            const { S3Client } = await import('@aws-sdk/client-s3');

            return new S3Client({
                region: config.media.region,
                endpoint: config.media.endpoint,
                credentials: {
                    accessKeyId: config.media.accessKeyId,
                    secretAccessKey: config.media.secretAccessKey
                },
                maxAttempts: config.media.maxAttempts,
                // The SDK builds its NodeHttpHandler from this object, so the
                // handler package need not be a direct dependency. Neither
                // timeout is set by default, and `throwOnRequestTimeout` is
                // needed because without it the SDK merely logs a warning when
                // the budget is exceeded and keeps waiting.
                requestHandler: {
                    connectionTimeout: config.media.connectionTimeoutMs,
                    requestTimeout: config.media.requestTimeoutMs,
                    socketTimeout: config.media.requestTimeoutMs,
                    throwOnRequestTimeout: true
                }
            });
        })();
    }

    return s3ClientPromise;
};

const s3Driver = {
    async put({ key, body, contentType, visibility }) {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await s3Client();

        await client.send(
            new PutObjectCommand({
                Bucket: bucketFor(visibility),
                Key: key,
                Body: body,
                ContentType: contentType,
                // Tells the browser to download rather than render a private
                // document, and stops it second-guessing the declared type.
                ...(isPrivate(visibility) ? { ContentDisposition: 'attachment' } : {})
            })
        );
    },

    async get({ key, visibility }) {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await s3Client();

        try {
            const result = await client.send(
                new GetObjectCommand({ Bucket: bucketFor(visibility), Key: key })
            );

            return Buffer.from(await result.Body.transformToByteArray());
        } catch (err) {
            if (err?.name === 'NoSuchKey') {
                throw new NotFoundError('Object not found');
            }

            // The 502 the client sees says nothing about why; the SDK's error
            // (an expired credential, a wrong region, a timeout) is the only
            // thing that does, and it is logged here or nowhere.
            logger.error({ err, key, bucket: bucketFor(visibility) }, 'Object storage read failed');
            throw new BadGatewayError('Object storage did not respond');
        }
    },

    async remove({ key, visibility }) {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await s3Client();

        await client.send(new DeleteObjectCommand({ Bucket: bucketFor(visibility), Key: key }));
    },

    async removePrefix({ prefix, visibility }) {
        const { DeleteObjectsCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        const client = await s3Client();
        const Bucket = bucketFor(visibility);

        const listed = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix }));

        if (!listed.Contents?.length) {
            return;
        }

        await client.send(
            new DeleteObjectsCommand({
                Bucket,
                Delete: { Objects: listed.Contents.map(({ Key }) => ({ Key })) }
            })
        );
    },

    async signedUrl({ key, visibility, expiresIn }) {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const client = await s3Client();

        return getSignedUrl(
            client,
            new GetObjectCommand({ Bucket: bucketFor(visibility), Key: key }),
            { expiresIn }
        );
    }
};

const drivers = { local: localDriver, s3: s3Driver };

// No fallback: config.js refuses to boot on a driver name that is not here.
const driver = () => drivers[config.media.driver];

export const putObject = (options) => driver().put(options);
export const getObject = (options) => driver().get(options);
export const removeObject = (options) => driver().remove(options);
export const removeObjectPrefix = (options) => driver().removePrefix(options);

/**
 * A short-lived link to a private object.
 *
 * Only ever called after an authorization check. There is deliberately no
 * function anywhere that turns a private key into a permanent URL.
 */
export const signedUrlForObject = ({ key, visibility = 'PRIVATE', expiresIn } = {}) =>
    driver().signedUrl({ key, visibility, expiresIn: expiresIn ?? config.media.signedUrlTtlSeconds });

export const activeDriver = () => config.media.driver;

/** Used by the local driver's serving route, which must not exist under s3. */
export const isLocalDriver = () => config.media.driver === 'local';

export const localObjectPath = localPath;
