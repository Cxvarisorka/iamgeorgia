import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import { registrationLimiter, tokenLookupLimiter } from '../middleware/rateLimit.js';
import { tokenParamSchema } from '../validation/auth.js';
import { registrationSchema } from '../validation/partner.js';
import { sendMailQuietly } from '../lib/mailer/index.js';
import {
    resolveInvitation,
    toInvitationPreview,
    markRegistrationStarted,
    acceptInvitation
} from '../services/invitation.service.js';

/**
 * The only unauthenticated write path into the partner system.
 *
 * Holding the token is the entire proof, which is why it is 256 bits of
 * randomness, single-use, time-limited and bound to one email address.
 */
export const invitationRoutes = Router();

invitationRoutes.get('/:token', tokenLookupLimiter, validate({ params: tokenParamSchema }), async (req, res) => {
    const invitation = await resolveInvitation(req.valid.params.token);

    await markRegistrationStarted(invitation);

    res.json(toInvitationPreview(invitation));
});

invitationRoutes.post(
    '/:token/accept',
    registrationLimiter,
    validate({ params: tokenParamSchema, body: registrationSchema }),
    async (req, res) => {
        const { partner, contact } = await acceptInvitation(req.valid.params.token, req.valid.body, req);

        // Sent after the transaction has committed, and quietly: the
        // application exists whether or not the receipt arrives, and failing
        // the request would tell the applicant to submit it again.
        await sendMailQuietly({
            to: contact.email,
            template: 'registrationSubmitted',
            data: {
                companyName: partner.name,
                reference: partner.reference,
                contactName: [contact.firstName, contact.lastName].filter(Boolean).join(' ')
            }
        });

        res.status(201).json({
            reference: partner.reference,
            status: partner.status,
            companyName: partner.name
        });
    }
);

export default invitationRoutes;
