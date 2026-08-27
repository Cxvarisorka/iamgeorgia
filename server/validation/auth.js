import { z } from 'zod';

import { emailField, passwordField } from './normalize.js';

export const loginSchema = z.object({
    email: emailField,
    // Deliberately not `passwordField`: the strength rules apply when a
    // password is chosen, not when one is offered. Validating strength at
    // login would answer a weak guess with a different error than a wrong one,
    // which tells an attacker their guess was at least well-formed.
    password: z.string().min(1).max(200)
});

// base64url of 32 bytes is 43 characters. The bound is a cheap way to reject
// obviously-not-a-token path segments before they reach a database lookup.
export const tokenParamSchema = z.object({
    token: z.string().min(20).max(200)
});

export const setPasswordSchema = z.object({
    password: passwordField
});

export const forgotPasswordSchema = z.object({
    email: emailField
});

/**
 * Changing a password from inside a session.
 *
 * The current password is required even though the caller is already
 * authenticated: a borrowed laptop with a live session should not be enough to
 * lock the owner out of their own account.
 */
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1).max(200),
        newPassword: passwordField
    })
    .refine((value) => value.currentPassword !== value.newPassword, {
        message: 'Choose a password you have not used here before',
        path: ['newPassword']
    });
