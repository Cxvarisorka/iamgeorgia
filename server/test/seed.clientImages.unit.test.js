import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    ClientImageError,
    assertSafePublicPath,
    createClientImageSource,
    imageUrlFor
} from '../scripts/lib/client-images.js';

/**
 * The image source `seed-catalogue.js` uses: a file under client/public when it
 * exists, a download from APP_URL when it does not.
 *
 * No database and no bucket — a throwaway directory stands in for
 * client/public and a local HTTP server stands in for the deployed site, with
 * one route per way Vercel can let the seed down.
 */

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const LOCAL_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x01, 0x02, 0x03]);

let server;
let appUrl;
let publicDir;
const hits = [];

const routes = {
    '/images/hotels/remote.jpg': (res) => {
        res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': JPEG.length });
        res.end(JPEG);
    },
    '/images/hotels/forbidden.jpg': (res) => {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('Forbidden');
    },
    '/images/hotels/broken.jpg': (res) => {
        res.writeHead(502, { 'content-type': 'text/plain' });
        res.end('Bad gateway');
    },
    '/images/hotels/slow.jpg': () => {
        // Never answers; the client's timeout has to end it.
    },
    '/images/hotels/empty.jpg': (res) => {
        res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': 0 });
        res.end();
    },
    '/images/hotels/html.jpg': (res) => {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><title>Not an image</title>');
    },
    '/images/hotels/redirect.jpg': (res) => {
        res.writeHead(307, { location: 'https://elsewhere.example/images/hotels/remote.jpg' });
        res.end();
    },
    '/images/hotels/huge.jpg': (res) => {
        res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': 5000 });
        res.end(Buffer.alloc(5000, 1));
    }
};

const source = (overrides = {}) =>
    createClientImageSource({ publicDir, appUrl, timeoutMs: 500, attempts: 2, retryDelayMs: 10, ...overrides });

const rejectsWith = async (promise, pattern) => {
    const err = await promise.then(
        () => assert.fail('expected a rejection'),
        (error) => error
    );

    assert.ok(err instanceof ClientImageError, `expected ClientImageError, got ${err?.name}: ${err?.message}`);
    assert.match(err.message, pattern);

    return err;
};

before(async () => {
    publicDir = await mkdtemp(join(tmpdir(), 'client-images-'));
    await mkdir(join(publicDir, 'images', 'hotels'), { recursive: true });
    await writeFile(join(publicDir, 'images', 'hotels', 'local.jpg'), LOCAL_JPEG);
    // A file just outside images/, which no path may reach.
    await writeFile(join(publicDir, 'secret.jpg'), LOCAL_JPEG);

    server = createServer((req, res) => {
        hits.push(req.url);
        const route = routes[req.url];

        if (route) {
            route(res);
        } else {
            res.writeHead(404, { 'content-type': 'text/html' });
            res.end('<h1>404</h1>');
        }
    });

    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    appUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    await rm(publicDir, { recursive: true, force: true });
});

describe('client images: local file first', () => {
    it('reads a file that exists on disk and never touches the network', async () => {
        const before = hits.length;
        const loaded = await source().load('/images/hotels/local.jpg');

        assert.equal(loaded.source, 'local');
        assert.deepEqual(loaded.buffer, LOCAL_JPEG);
        assert.equal(hits.length, before);
    });

    it('uses the local file even when APP_URL is not set', async () => {
        const loaded = await source({ appUrl: undefined }).load('/images/hotels/local.jpg');

        assert.equal(loaded.source, 'local');
    });
});

describe('client images: APP_URL fallback', () => {
    it('downloads a file missing on disk from APP_URL at the same public path', async () => {
        const loaded = await source().load('/images/hotels/remote.jpg');

        assert.equal(loaded.source, 'remote');
        assert.equal(loaded.location, `${appUrl}/images/hotels/remote.jpg`);
        assert.deepEqual(loaded.buffer, JPEG);
    });

    it('builds the URL on the origin only, ignoring any path in APP_URL', () => {
        assert.equal(
            imageUrlFor('https://site.example/some/page?x=1', '/images/rooms/twin.jpg'),
            'https://site.example/images/rooms/twin.jpg'
        );
    });

    it('fails clearly when the file is missing and APP_URL is not set', async () => {
        const err = await rejectsWith(source({ appUrl: undefined }).load('/images/hotels/remote.jpg'), /APP_URL is not set/);

        assert.equal(err.publicPath, '/images/hotels/remote.jpg');
    });

    it('rejects an APP_URL that is not a usable http(s) URL', async () => {
        await rejectsWith(source({ appUrl: 'not a url' }).load('/images/hotels/remote.jpg'), /APP_URL is not a valid URL/);
        await rejectsWith(source({ appUrl: 'ftp://site.example' }).load('/images/hotels/remote.jpg'), /plain http\(s\) URL/);
        await rejectsWith(
            source({ appUrl: 'https://user:pass@site.example' }).load('/images/hotels/remote.jpg'),
            /without credentials/
        );
    });

    it('reports a 404 with the path and the URL', async () => {
        const err = await rejectsWith(source().load('/images/hotels/nope.jpg'), /HTTP 404/);

        assert.match(err.message, /\/images\/hotels\/nope\.jpg/);
        assert.equal(err.url, `${appUrl}/images/hotels/nope.jpg`);
    });

    it('reports a 403 without retrying it', async () => {
        const before = hits.filter((url) => url === '/images/hotels/forbidden.jpg').length;
        await rejectsWith(source().load('/images/hotels/forbidden.jpg'), /HTTP 403/);

        assert.equal(hits.filter((url) => url === '/images/hotels/forbidden.jpg').length - before, 1);
    });

    it('retries a 5xx, then reports it', async () => {
        const before = hits.filter((url) => url === '/images/hotels/broken.jpg').length;
        await rejectsWith(source().load('/images/hotels/broken.jpg'), /HTTP 502/);

        assert.equal(hits.filter((url) => url === '/images/hotels/broken.jpg').length - before, 2);
    });

    it('times out a site that never answers', async () => {
        await rejectsWith(source({ timeoutMs: 200 }).load('/images/hotels/slow.jpg'), /timed out after 200 ms/);
    });

    it('reports a site that cannot be reached at all', async () => {
        await rejectsWith(source({ appUrl: 'http://127.0.0.1:1' }).load('/images/hotels/remote.jpg'), /request failed/);
    });

    it('rejects an empty body', async () => {
        await rejectsWith(source().load('/images/hotels/empty.jpg'), /body is empty/);
    });

    it('rejects a response that is not an image', async () => {
        await rejectsWith(source().load('/images/hotels/html.jpg'), /content-type "text\/html/);
    });

    it('rejects a file over the size limit', async () => {
        await rejectsWith(source({ maxBytes: 1000 }).load('/images/hotels/huge.jpg'), /over the 1000 byte limit/);
    });

    it('does not follow a redirect to another host', async () => {
        await rejectsWith(source().load('/images/hotels/redirect.jpg'), /HTTP 307 redirect to https:\/\/elsewhere\.example/);
    });
});

describe('client images: paths', () => {
    const bad = [
        '/images/../secret.jpg',
        '/images/hotels/../../secret.jpg',
        '../secret.jpg',
        'images/hotels/local.jpg',
        '/secret.jpg',
        '//evil.example/images/x.jpg',
        'https://evil.example/images/x.jpg',
        '/images/hotels/x.jpg?u=https://evil.example',
        '/images/hotels/%2e%2e/x.jpg',
        '/images\\hotels\\x.jpg',
        '/images/hotels/.hidden.jpg',
        '/images/hotels/script.svg',
        '',
        null
    ];

    for (const publicPath of bad) {
        it(`refuses ${JSON.stringify(publicPath)} before touching disk or network`, async () => {
            const before = hits.length;

            assert.throws(() => assertSafePublicPath(publicPath), ClientImageError);
            await rejectsWith(source().load(publicPath), /Invalid image path/);
            assert.equal(hits.length, before);
        });
    }

    it('accepts the paths the seed data actually uses', async () => {
        const { hotels } = await import('../db/seed/hotels.js');
        const paths = hotels.flatMap((hotel) => [...hotel.gallery.map((image) => image.src), ...hotel.rooms.map((room) => room.image)]);

        assert.ok(paths.length > 0);
        for (const publicPath of paths) assert.equal(assertSafePublicPath(publicPath), publicPath);
    });
});

describe('client images: preflight', () => {
    it('counts local and remote images without downloading anything', async () => {
        const before = hits.length;
        const plan = await source().preflight(['/images/hotels/local.jpg', '/images/hotels/remote.jpg', '/images/hotels/remote.jpg']);

        assert.deepEqual(plan, { local: 1, remote: 1 });
        assert.equal(hits.length, before);
    });

    it('fails before any write when an image is missing and APP_URL is not set', async () => {
        await rejectsWith(source({ appUrl: undefined }).preflight(['/images/hotels/local.jpg', '/images/hotels/remote.jpg']), /APP_URL is not set/);
    });

    it('passes without APP_URL when everything is on disk', async () => {
        assert.deepEqual(await source({ appUrl: undefined }).preflight(['/images/hotels/local.jpg']), { local: 1, remote: 0 });
    });

    it('fails on a malformed path', async () => {
        await rejectsWith(source().preflight(['/images/../secret.jpg']), /Invalid image path/);
    });
});
