import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import {
    kosherCertificationParamSchema,
    kosherCertificationSchema,
    kosherProfileSchema,
    updateKosherCertificationSchema,
    verifyKosherCertificationSchema
} from '../validation/kosher.js';
import { hotelScopedParamSchema } from '../validation/ratePlan.js';
import {
    addCertification,
    archiveCertification,
    disableKosher,
    findKosherProfile,
    loadKosherView,
    upsertKosherProfile,
    updateCertification,
    verifyCertification
} from '../services/hotel/kosher.service.js';
import { toKosher } from '../serializers/kosher.js';

/**
 * Kosher administration.
 *
 * Mounted beneath `/admin/hotels/:hotelId`, so it inherits `authenticate` and
 * `requireAdmin` from the router above — the same reason room types and rate
 * plans are mounted there rather than at the top level. A sub-router that
 * re-applies its own guards is one somebody will eventually add without them.
 *
 * Two properties this file exists to guarantee:
 *
 *   1. **There is no way to reach `verification` except through
 *      `POST /certifications/:certId/verify`.** Not through a profile write,
 *      not through a certificate edit, not through a hotel PATCH — none of
 *      those schemas contain the field. The guarantee is structural rather than
 *      a check somebody has to remember, which is how `status` is already
 *      handled on a hotel.
 *   2. **Every mutation answers with the whole kosher block, re-derived.**
 *      `certified` is computed from certificates and from today's date, so a
 *      client that patched one field and merged the reply into its local copy
 *      would otherwise be able to keep showing a badge that is no longer true.
 */
export const adminKosherRoutes = Router({ mergeParams: true });

const reload = async (req) => toKosher(await loadKosherView(req.valid.params.hotelId), req.user);

adminKosherRoutes.get('/', validate({ params: hotelScopedParamSchema }), async (req, res) => {
    // 200 with null rather than 404: "this property does not offer kosher
    // services" is an answer, and the panel renders its switched-off state from
    // it. A 404 would make an ordinary absence look like a broken route.
    res.json(await reload(req));
});

/**
 * Switches kosher services on, and every later edit to the profile.
 *
 * PUT rather than PATCH because the form is written whole — the same treatment
 * the amenity checklist gets, and for the same reason: a stream of partial
 * writes to a record this small buys nothing and loses the ability to say what
 * the operator was actually looking at when they saved.
 */
adminKosherRoutes.put(
    '/',
    validate({ params: hotelScopedParamSchema, body: kosherProfileSchema }),
    async (req, res) => {
        const existing = await findKosherProfile(req.valid.params.hotelId);

        await upsertKosherProfile(req.valid.params.hotelId, req.valid.body, req.user, req);

        res.status(existing ? 200 : 201).json(await reload(req));
    }
);

/** 409 while a live certificate exists — archive that first. */
adminKosherRoutes.delete('/', validate({ params: hotelScopedParamSchema }), async (req, res) => {
    await disableKosher(req.valid.params.hotelId, req.user, req);

    res.status(204).end();
});

adminKosherRoutes.post(
    '/certifications',
    validate({ params: hotelScopedParamSchema, body: kosherCertificationSchema }),
    async (req, res) => {
        await addCertification(req.valid.params.hotelId, req.valid.body, req.user, req);

        res.status(201).json(await reload(req));
    }
);

/**
 * Editing a certificate.
 *
 * Changing any fact somebody verified against — the authority, the reference,
 * the scope, the dates, the scan — sends it back to PENDING_VERIFICATION and
 * clears the verifier. Verification attaches to a set of facts, not to a row
 * id, and leaving a name against facts they never saw is worse than having no
 * name at all.
 */
adminKosherRoutes.patch(
    '/certifications/:certId',
    validate({ params: kosherCertificationParamSchema, body: updateKosherCertificationSchema }),
    async (req, res) => {
        const { hotelId, certId } = req.valid.params;
        await updateCertification(hotelId, certId, req.valid.body, req.user, req);

        res.json(await reload(req));
    }
);

/**
 * The only path to VERIFIED.
 *
 * A transition with its own endpoint and its own rules, deliberately not a
 * field an admin may set to anything — the same treatment publishing and
 * archiving already get on a hotel.
 */
adminKosherRoutes.post(
    '/certifications/:certId/verify',
    validate({ params: kosherCertificationParamSchema, body: verifyKosherCertificationSchema }),
    async (req, res) => {
        const { hotelId, certId } = req.valid.params;
        await verifyCertification(hotelId, certId, req.valid.body, req.user, req);

        res.json(await reload(req));
    }
);

/** Archives a decided certificate; deletes one nobody ever looked at. */
adminKosherRoutes.delete(
    '/certifications/:certId',
    validate({ params: kosherCertificationParamSchema }),
    async (req, res) => {
        const { hotelId, certId } = req.valid.params;
        await archiveCertification(hotelId, certId, req.user, req);

        res.json(await reload(req));
    }
);
