import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

/**
 * Where `seed-catalogue.js` gets the bytes of a catalogue photograph.
 *
 * The fixtures name images by their public path in the client app —
 * `/images/hotels/property-1.jpg` — which is both a file under
 * `client/public` and a URL the deployed site serves at that same path (Next.js
 * serves `public/` from the root, and `client/proxy.ts` skips anything with a
 * file extension, so no locale rewrite gets in the way).
 *
 * A checkout of the monorepo has the files on disk and reads them, exactly as
 * the seed always did. The API image on Render is built from `server/` alone and
 * has no `client/` at all, so there a missing file is downloaded from APP_URL
 * instead. Either way the caller gets a Buffer and hands it to the same
 * `uploadFile` pipeline — nothing is written to a temporary file.
 *
 * Only `/images/...` paths with a plain file name are accepted, the local read
 * is confined to `client/public/images`, and the download only ever goes to
 * APP_URL's own origin: a fixture cannot name another host, climb out of the
 * directory, or follow a redirect somewhere else.
 */

export class ClientImageError extends Error {
    constructor(message, { publicPath, url, cause } = {}) {
        super(message, cause ? { cause } : undefined);
        this.name = 'ClientImageError';
        this.publicPath = publicPath;
        this.url = url;
    }
}

/** `/images/`, then folders and a file name of plain characters, then a raster extension. */
const PUBLIC_IMAGE_PATH = /^\/images\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|avif)$/i;

const NOT_ON_DISK = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']);

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_ATTEMPTS = 2;

/** Rejects anything that is not a plain `/images/...` path before it reaches the disk or the network. */
export const assertSafePublicPath = (publicPath) => {
    if (typeof publicPath !== 'string' || !PUBLIC_IMAGE_PATH.test(publicPath) || publicPath.includes('..')) {
        throw new ClientImageError(
            `Invalid image path in the seed data: ${JSON.stringify(publicPath)} — ` +
                'expected /images/<folder>/<file>.jpg|png|webp|avif',
            { publicPath }
        );
    }

    return publicPath;
};

/** APP_URL's origin, or a clear error saying why it cannot be used. */
export const appOrigin = (appUrl, publicPath) => {
    if (!appUrl) {
        throw new ClientImageError(
            `Image ${publicPath} is not on disk and APP_URL is not set, so it cannot be downloaded ` +
                'from the deployed site. Set APP_URL to the site that serves client/public ' +
                '(e.g. https://your-site.vercel.app), or run the seed from a checkout that has client/.',
            { publicPath }
        );
    }

    let parsed;

    try {
        parsed = new URL(appUrl);
    } catch {
        throw new ClientImageError(
            `APP_URL is not a valid URL: ${JSON.stringify(appUrl)} (needed to download ${publicPath})`,
            { publicPath }
        );
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new ClientImageError(
            `APP_URL must be a plain http(s) URL without credentials, got ${JSON.stringify(appUrl)} (needed to download ${publicPath})`,
            { publicPath }
        );
    }

    return parsed.origin;
};

/** The URL the deployed client serves a public path at — always on APP_URL's own origin. */
export const imageUrlFor = (appUrl, publicPath) => {
    assertSafePublicPath(publicPath);

    const origin = appOrigin(appUrl, publicPath);
    const url = new URL(publicPath, origin);

    if (url.origin !== origin || url.pathname !== publicPath) {
        throw new ClientImageError(`Image URL for ${publicPath} resolved to ${url.href}, outside APP_URL`, {
            publicPath,
            url: url.href
        });
    }

    return url.href;
};

const describeFetchFailure = (err, timeoutMs) => {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        return `timed out after ${timeoutMs} ms`;
    }

    const code = err?.cause?.code ?? err?.code;
    return `request failed${code ? ` (${code})` : ''}: ${err?.cause?.message ?? err?.message ?? err}`;
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * @param {object} options
 * @param {string} options.publicDir   Absolute path to `client/public`.
 * @param {string} [options.appUrl]    APP_URL, or undefined when it is not configured.
 * @param {number} [options.maxBytes]  Refuse a download larger than this.
 * @param {number} [options.timeoutMs] Per attempt.
 * @param {number} [options.attempts] Timeouts, network errors and 5xx are retried; 4xx are not.
 * @param {number} [options.retryDelayMs]
 * @param {typeof fetch} [options.fetchImpl]
 */
export const createClientImageSource = ({
    publicDir,
    appUrl,
    maxBytes = 10 * 1024 * 1024,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    attempts = DEFAULT_ATTEMPTS,
    retryDelayMs = 1_000,
    fetchImpl = globalThis.fetch
}) => {
    const imagesRoot = resolve(publicDir, 'images');

    const localPathFor = (publicPath) => {
        const local = resolve(publicDir, `.${publicPath}`);

        if (!local.startsWith(imagesRoot + sep)) {
            throw new ClientImageError(`Image path ${publicPath} resolves outside client/public/images`, { publicPath });
        }

        return local;
    };

    /** The file's bytes (or, with `probe`, just `true`), or null when it is simply not there. */
    const readLocal = async (publicPath, { probe = false } = {}) => {
        const local = localPathFor(publicPath);

        try {
            if (probe) {
                return (await stat(local)).isFile() ? true : null;
            }

            return await readFile(local);
        } catch (err) {
            if (NOT_ON_DISK.has(err?.code)) {
                return null;
            }

            throw new ClientImageError(`Could not read local image ${local}: ${err.message}`, { publicPath, cause: err });
        }
    };

    const downloadOnce = async (publicPath, url) => {
        let response;

        try {
            response = await fetchImpl(url, {
                // A redirect could lead anywhere; APP_URL must name the host that
                // actually serves the files (e.g. the www form, if the apex redirects).
                redirect: 'manual',
                signal: AbortSignal.timeout(timeoutMs),
                headers: { accept: 'image/*' }
            });
        } catch (err) {
            return {
                retry: true,
                error: new ClientImageError(
                    `Could not download ${publicPath} from ${url}: ${describeFetchFailure(err, timeoutMs)}`,
                    { publicPath, url, cause: err }
                )
            };
        }

        const fail = (reason, retry = false) => ({
            retry,
            error: new ClientImageError(`Could not download ${publicPath} from ${url}: ${reason}`, { publicPath, url })
        });

        if (response.status >= 300 && response.status < 400) {
            return fail(
                `HTTP ${response.status} redirect to ${response.headers.get('location') ?? '(no location)'} — ` +
                    'redirects are not followed; set APP_URL to the final origin'
            );
        }

        if (response.status === 404) {
            return fail('HTTP 404 — the deployed site does not have this file (is client/public deployed and up to date?)');
        }

        if (response.status === 403) {
            return fail('HTTP 403 — the deployed site refused access (Vercel deployment protection or a firewall rule?)');
        }

        if (response.status >= 500) return fail(`HTTP ${response.status} — the deployed site failed to serve the file`, true);
        if (!response.ok) return fail(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') ?? '';

        if (!contentType.toLowerCase().startsWith('image/')) {
            return fail(`expected an image but got content-type ${JSON.stringify(contentType || '(none)')}`);
        }

        const declaredLength = Number(response.headers.get('content-length'));

        if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
            return fail(`file is ${declaredLength} bytes, over the ${maxBytes} byte limit`);
        }

        let buffer;

        try {
            buffer = Buffer.from(await response.arrayBuffer());
        } catch (err) {
            return {
                retry: true,
                error: new ClientImageError(
                    `Could not download ${publicPath} from ${url}: reading the body ${describeFetchFailure(err, timeoutMs)}`,
                    { publicPath, url, cause: err }
                )
            };
        }

        if (buffer.length === 0) return fail('the response body is empty');
        if (buffer.length > maxBytes) return fail(`file is ${buffer.length} bytes, over the ${maxBytes} byte limit`);

        return { buffer };
    };

    const download = async (publicPath) => {
        const url = imageUrlFor(appUrl, publicPath);
        let last;

        for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
            last = await downloadOnce(publicPath, url);

            if (last.buffer || !last.retry || attempt >= attempts) break;

            await sleep(retryDelayMs);
        }

        if (last.error) throw last.error;

        return { buffer: last.buffer, url };
    };

    return {
        /**
         * Checks every path up front, before the seed writes anything: each must
         * be well formed, and if any is missing on disk APP_URL must be usable.
         * Returns how many will come from disk and how many from APP_URL.
         */
        async preflight(publicPaths) {
            let local = 0;
            let remote = 0;

            for (const publicPath of new Set(publicPaths)) {
                assertSafePublicPath(publicPath);

                if (await readLocal(publicPath, { probe: true })) {
                    local += 1;
                } else {
                    imageUrlFor(appUrl, publicPath);
                    remote += 1;
                }
            }

            return { local, remote };
        },

        /**
         * The image's bytes: from `client/public` when the file is there, from
         * APP_URL when it is not. Throws ClientImageError naming the path and URL.
         */
        async load(publicPath) {
            assertSafePublicPath(publicPath);

            const buffer = await readLocal(publicPath);

            if (buffer) {
                return { buffer, source: 'local', location: localPathFor(publicPath) };
            }

            const downloaded = await download(publicPath);
            return { buffer: downloaded.buffer, source: 'remote', location: downloaded.url };
        }
    };
};
