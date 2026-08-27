import { randomBytes } from 'node:crypto';

import { prisma, disconnect } from '../db/index.js';
import { hashPassword } from '../lib/password.js';
import { emailField } from '../validation/normalize.js';

/**
 * Bootstraps an administrator.
 *
 * There is no sign-up for admins and there should not be: the first account has
 * to come from someone with shell access to the server, and every one after it
 * from an admin already inside the panel. Run as:
 *
 *   node scripts/create-admin.js tamar@iamgeorgia.travel Tamar Gelashvili [password]
 *
 * With no password one is generated and printed once. It is never printed again
 * and cannot be recovered — use the password reset flow if it is lost.
 */
const [, , rawEmail, firstName, lastName, rawPassword] = process.argv;

const usage = () => {
    console.error('Usage: node scripts/create-admin.js <email> <firstName> <lastName> [password]');
    process.exitCode = 1;
};

const run = async () => {
    if (!rawEmail || !firstName || !lastName) {
        return usage();
    }

    const parsed = emailField.safeParse(rawEmail);

    if (!parsed.success) {
        console.error(`Not a valid email address: ${rawEmail}`);
        process.exitCode = 1;
        return;
    }

    const email = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
        console.error(`An account already exists for ${email} (role ${existing.role}).`);
        process.exitCode = 1;
        return;
    }

    // 24 random bytes, not a memorable phrase: this is a bootstrap credential
    // meant to be pasted once and then changed.
    const password = rawPassword || randomBytes(24).toString('base64url');

    const user = await prisma.user.create({
        data: {
            email,
            firstName,
            lastName,
            role: 'SUPER_ADMIN',
            passwordHash: await hashPassword(password),
            // Admins carry no partnerId; the CHECK constraint on users enforces it.
            partnerId: null
        }
    });

    console.log(`Created SUPER_ADMIN ${user.email} (${user.id})`);

    if (!rawPassword) {
        console.log(`Password: ${password}`);
        console.log('This is the only time it will be shown.');
    }
};

try {
    await run();
} finally {
    await disconnect();
}
