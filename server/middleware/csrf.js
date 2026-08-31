import { config } from '../config.js';
import { ForbiddenError } from '../lib/errors.js';

/**
 * Refuses a state-changing request that a browser says came from somewhere else.
 *
 * The session cookie's `SameSite` attribute already stops the classic attack,
 * but `SameSite` is same-*site*, not same-origin: `evil.iamgeorgia.travel` is
 * the same site as `api.iamgeorgia.travel`, so a page hosted on any sibling
 * subdomain — or injected into one — can make credentialed requests that
 * `SameSite` happily allows. This closes that, and it needs nothing from the
 * client: the two headers it reads are set by the browser and cannot be
 * changed by the page making the request.
 *
 * `Sec-Fetch-Site` is the better signal where it exists (every browser since
 * 2023) because it describes the relationship rather than requiring us to
 * compare strings. `Origin` is the fallback.
 *
 * Absent both, the request is allowed. That is deliberate and not a hole: a
 * browser cannot suppress these headers on a cross-origin write, so a request
 * carrying neither did not come from a page. It came from curl, a server-side
 * integration or the test suite — none of which have an ambient cookie jar to
 * exploit in the first place.
 */

// GET and HEAD are not supposed to change anything, and OPTIONS is the
// preflight this middleware relies on. Everything else is a write.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// `same-origin` and `same-site` are both fine — the client app is a different
// origin from the API by design. `none` is a user typing the URL or opening a
// bookmark, which cannot be an attack because there is no attacker page.
const ALLOWED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);

/**
 * Origins whose writes are accepted.
 *
 * `clientOrigin` is the front end; `appUrl` is the same thing behind a proxy
 * when the two differ. Both, so that a deploy which terminates TLS on a
 * separate hostname does not have to choose.
 */
const allowedOrigins = () => new Set([config.clientOrigin, config.appUrl].filter(Boolean));

export const verifyRequestOrigin = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const fetchSite = req.get('sec-fetch-site');

    if (fetchSite) {
        if (!ALLOWED_FETCH_SITES.has(fetchSite)) {
            throw new ForbiddenError('Cross-site requests are not accepted');
        }

        // `same-site` still permits a sibling subdomain, so it falls through to
        // the origin comparison below rather than being trusted on its own.
        if (fetchSite !== 'same-site') {
            return next();
        }
    }

    const origin = req.get('origin');

    // No browser signal at all: not a page, so not a CSRF. See the note above.
    if (!origin) {
        return next();
    }

    if (!allowedOrigins().has(origin)) {
        throw new ForbiddenError('Cross-site requests are not accepted');
    }

    next();
};

export default verifyRequestOrigin;
