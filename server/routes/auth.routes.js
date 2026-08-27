import { Router } from 'express';

import { config } from '../config.js';
import { prisma } from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { authLimiter, tokenLookupLimiter } from '../middleware/rateLimit.js';
import {
    loginSchema,
    tokenParamSchema,
    setPasswordSchema,
    forgotPasswordSchema,
    changePasswordSchema
} from '../validation/auth.js';
import { toUser } from '../serializers/user.js';
import { toPartnerDetail } from '../serializers/partner.js';
import { findPartnerOr404 } from '../services/partner.service.js';
import { sendMailQuietly, passwordResetUrl } from '../lib/mailer/index.js';
import {
    login,
    logout,
    createSession,
    changePassword,
    setSessionCookie,
    clearSessionCookie,
    resolveAuthToken,
    consumeAuthToken,
    issueAuthToken
} from '../services/auth.service.js';

export const authRoutes = Router();

/** The one place the client learns who it is signed in as. */
const identity = async (user) => ({
    user: toUser(user),
    partner: user.partnerId ? toPartnerDetail(await findPartnerOr404(user.partnerId, user), user) : null
});

authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
    const { user, token } = await login(req.valid.body, req);

    setSessionCookie(res, token);
    res.json(await identity(user));
});

authRoutes.post('/logout', optionalAuthenticate, async (req, res) => {
    await logout(req.session);
    clearSessionCookie(res);

    // 204 whether or not there was a session to end: logging out of nothing has
    // succeeded by any definition the caller cares about.
    res.status(204).end();
});

authRoutes.get('/me', authenticate, async (req, res) => {
    res.json(await identity(req.user));
});

// --- Account activation -----------------------------------------------------

authRoutes.get(
    '/activation/:token',
    tokenLookupLimiter,
    validate({ params: tokenParamSchema }),
    async (req, res) => {
        const row = await resolveAuthToken(req.valid.params.token, 'ACCOUNT_ACTIVATION');

        // Enough to greet the holder by name and show which company they are
        // activating for. Nothing that would be worth guessing a token to read.
        res.json({
            email: row.user.email,
            firstName: row.user.firstName,
            lastName: row.user.lastName,
            companyName: row.user.partner?.name ?? null,
            expiresAt: row.expiresAt
        });
    }
);

authRoutes.post(
    '/activation/:token',
    tokenLookupLimiter,
    validate({ params: tokenParamSchema, body: setPasswordSchema }),
    async (req, res) => {
        const user = await consumeAuthToken(
            req.valid.params.token,
            'ACCOUNT_ACTIVATION',
            req.valid.body.password,
            req
        );

        // Signed in immediately: the alternative is to send someone who has
        // just proved control of the mailbox back to a login form to type the
        // password they typed a second ago.
        setSessionCookie(res, await createSession(user, req));

        res.json(await identity(user));
    }
);

// --- Password reset ---------------------------------------------------------

authRoutes.post(
    '/password/forgot',
    tokenLookupLimiter,
    validate({ body: forgotPasswordSchema }),
    async (req, res) => {
        const user = await prisma.user.findUnique({ where: { email: req.valid.body.email } });

        if (user?.isActive) {
            const { token, authToken } = await issueAuthToken(prisma, {
                userId: user.id,
                purpose: 'PASSWORD_RESET',
                ttlMs: config.auth.passwordResetTtlMs
            });

            await sendMailQuietly({
                to: user.email,
                template: 'passwordReset',
                data: { url: passwordResetUrl(token), expiresAt: authToken.expiresAt }
            });
        }

        // Always 204, and always after the same work. Answering differently for
        // an address that has no account would turn this endpoint into a way to
        // enumerate who is registered.
        res.status(204).end();
    }
);

/**
 * Changing a password while signed in.
 *
 * Answers with a fresh session cookie: the change ends every session the
 * account had, including this one, so the device doing the changing is handed
 * a new one rather than being signed out for its trouble.
 */
authRoutes.post(
    '/password/change',
    authenticate,
    authLimiter,
    validate({ body: changePasswordSchema }),
    async (req, res) => {
        const token = await changePassword(req.user, req.valid.body, req);

        setSessionCookie(res, token);
        res.status(204).end();
    }
);

authRoutes.post(
    '/password/reset/:token',
    tokenLookupLimiter,
    validate({ params: tokenParamSchema, body: setPasswordSchema }),
    async (req, res) => {
        await consumeAuthToken(req.valid.params.token, 'PASSWORD_RESET', req.valid.body.password, req);

        // No session here, unlike activation: a reset is the flow someone uses
        // when they suspect the account was reachable by someone else, so it
        // ends every session and makes them sign in deliberately.
        clearSessionCookie(res);
        res.status(204).end();
    }
);

export default authRoutes;
