import { randomBytes } from 'node:crypto';

import { config } from '../config.js';
import {
    getObject,
    putObject,
    removeObjectPrefix,
    signedUrlForObject
} from '../services/media/storage.service.js';

/**
 * Round-trips one object through the configured storage driver.
 *
 *   node scripts/check-media-storage.js
 *
 * The test suite runs on the `local` driver on purpose — a suite that can reach
 * a real bucket is a suite that can leave objects in one — so the `s3` path is
 * never exercised by `npm test`. This is how you exercise it: run it once after
 * putting the R2 credentials in `.env`, and again after any change to bucket
 * names, tokens or endpoint.
 *
 * It writes to a throwaway prefix and deletes it afterwards, so it is safe to
 * run against a live bucket.
 */
const run = async () => {
    const folder = `_healthcheck/${randomBytes(8).toString('hex')}`;
    const key = `${folder}/probe.txt`;
    const body = Buffer.from(`storage probe ${new Date().toISOString()}\n`);

    console.log(`Driver:         ${config.media.driver}`);
    console.log(`Public bucket:  ${config.media.publicBucket}`);
    console.log(`Private bucket: ${config.media.privateBucket}`);
    console.log(`Endpoint:       ${config.media.endpoint ?? '(none — local driver)'}`);
    console.log(`Public base:    ${config.media.publicBaseUrl}`);
    console.log('');

    for (const visibility of ['PUBLIC', 'PRIVATE']) {
        try {
            await putObject({ key, body, contentType: 'text/plain', visibility });
            console.log(`  ${visibility}: write ok`);

            const read = await getObject({ key, visibility });

            if (!read.equals(body)) {
                throw new Error('the bytes read back do not match the bytes written');
            }

            console.log(`  ${visibility}: read ok, ${read.length} bytes match`);

            if (visibility === 'PRIVATE') {
                const url = await signedUrlForObject({ key, visibility });
                console.log(`  ${visibility}: signed url ok (${config.media.signedUrlTtlSeconds}s)`);
                console.log(`            ${url.slice(0, 110)}${url.length > 110 ? '…' : ''}`);
            }
        } finally {
            await removeObjectPrefix({ prefix: folder, visibility }).catch(() => {});
        }
    }

    console.log('\nStorage is configured correctly.');

    if (config.media.driver === 'local') {
        console.log(
            `\nNote: this exercised the local driver at ${config.media.localRoot}.\n` +
                'Set MEDIA_S3_ENDPOINT, MEDIA_S3_ACCESS_KEY_ID and MEDIA_S3_SECRET_ACCESS_KEY\n' +
                'in .env and run this again to exercise Cloudflare R2.'
        );
    }
};

run().catch((err) => {
    console.error(`\nStorage check FAILED: ${err.message}`);
    console.error('\nCheck MEDIA_S3_ENDPOINT, the access key pair, and that both buckets exist.');
    process.exitCode = 1;
});
