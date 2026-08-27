import { config } from '../config.js';
import { prisma } from '../db/index.js';
import { createToken, hashToken, expiresIn } from '../lib/tokens.js';
import { hashPassword } from '../lib/password.js';
import { recordAudit, AUDIT_ENTITY } from '../lib/audit.js';
import { nextPartnerReference } from '../lib/reference.js';
import { NotFoundError, ConflictError, GoneError, ForbiddenError } from '../lib/errors.js';

/**
 * Creates an invitation and returns the plaintext token exactly once.
 *
 * The token is never stored and never read back — only its hash goes to the
 * database — so this return value is the single opportunity to put it into an
 * email. A caller that loses it has to issue a new invitation.
 */
export const issueInvitation = async (client, { email, partnerId = null, invitedByUserId = null, prefill = {} }) => {
    const token = createToken();

    const invitation = await client.invitation.create({
        data: {
            tokenHash: hashToken(token),
            email,
            partnerId,
            invitedByUserId,
            prefill,
            expiresAt: expiresIn(config.auth.invitationTtlMs)
        }
    });

    return { token, invitation };
};

/**
 * Retires every live invitation for an address or a partner.
 *
 * Reissuing has to kill the previous link in the same breath, or an invitee
 * with both emails open could complete registration through the old one after
 * the admin believed they had replaced it.
 */
export const revokeOpenInvitations = (client, { email, partnerId }) =>
    client.invitation.updateMany({
        where: {
            ...(email ? { email } : {}),
            ...(partnerId ? { partnerId } : {}),
            acceptedAt: null,
            revokedAt: null
        },
        data: { revokedAt: new Date() }
    });

/**
 * Resolves a raw token, refusing it with the reason it failed.
 *
 * Four outcomes rather than one, because the registration page has four
 * different things to tell the person holding the link.
 */
export const resolveInvitation = async (token) => {
    const invitation = await prisma.invitation.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { partner: true }
    });

    if (!invitation) {
        throw new NotFoundError('This invitation link is not valid');
    }

    if (invitation.revokedAt) {
        throw new GoneError('This invitation has been withdrawn', { canRequestNew: true });
    }

    if (invitation.acceptedAt) {
        throw new ConflictError('This invitation has already been used');
    }

    if (invitation.expiresAt <= new Date()) {
        throw new GoneError('This invitation has expired', { canRequestNew: true });
    }

    return invitation;
};

/**
 * What the registration page may know before anyone has proved anything.
 *
 * Only the invited address and whatever the admin pre-filled. Notably not the
 * partner's id or status: holding a link is not authorization to read a record.
 */
export const toInvitationPreview = (invitation) => ({
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    company: invitation.partner
        ? {
              name: invitation.partner.name,
              kind: invitation.partner.kind,
              legalName: invitation.partner.legalName ?? null,
              registrationNumber: invitation.partner.registrationNumber ?? null,
              legalAddress: invitation.partner.legalAddress ?? null,
              city: invitation.partner.city ?? null,
              country: invitation.partner.country ?? null,
              phone: invitation.partner.phone ?? null,
              email: invitation.partner.email ?? null,
              website: invitation.partner.website ?? null
          }
        : null,
    prefill: invitation.prefill ?? {}
});

/**
 * Marks a drafted partner as having been opened.
 *
 * A GET that changes state is unusual, but this is the only signal that exists
 * for it: without it an admin cannot tell an invitation nobody has looked at
 * from one somebody is halfway through, which is exactly what
 * REGISTRATION_IN_PROGRESS is for. Idempotent, and it only ever moves a partner
 * off INVITED.
 */
export const markRegistrationStarted = async (invitation) => {
    if (invitation.partner?.status !== 'INVITED') {
        return;
    }

    await prisma.partner.updateMany({
        where: { id: invitation.partnerId, status: 'INVITED' },
        data: { status: 'REGISTRATION_IN_PROGRESS' }
    });
};

/**
 * Turns an invitation into a partner company, an owner account and a submitted
 * application, or fails without leaving any of the three behind.
 */
export const acceptInvitation = async (token, payload, req) => {
    const invitation = await resolveInvitation(token);
    const { company, contact, financial, password } = payload;

    // The invitation belongs to one address. Registering under a different one
    // would let a forwarded email be claimed by whoever received it.
    if (contact.email !== invitation.email) {
        throw new ForbiddenError('This invitation can only be completed by its invited email address', {
            invitedEmail: invitation.email
        });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: contact.email } });

    if (existingUser) {
        throw new ConflictError('An account already exists for this email address');
    }

    const duplicate = await prisma.partner.findFirst({
        where: {
            registrationNumber: company.registrationNumber,
            ...(invitation.partnerId ? { NOT: { id: invitation.partnerId } } : {})
        }
    });

    if (duplicate) {
        throw new ConflictError('A partner with this registration number already exists');
    }

    const passwordHash = await hashPassword(password);

    const partner = await prisma.$transaction(async (tx) => {
        // Spent first, and conditionally, so that two submissions of the same
        // link cannot both get past this point. The loser's transaction rolls
        // back before it has created a company or an account.
        const claimed = await tx.invitation.updateMany({
            where: { id: invitation.id, acceptedAt: null, revokedAt: null },
            data: { acceptedAt: new Date() }
        });

        if (claimed.count === 0) {
            throw new ConflictError('This invitation has already been used');
        }

        const companyData = {
            ...company,
            status: 'PENDING_APPROVAL',
            submittedAt: new Date()
        };

        const saved = invitation.partnerId
            ? await tx.partner.update({ where: { id: invitation.partnerId }, data: companyData })
            : await tx.partner.create({
                  data: { ...companyData, reference: await nextPartnerReference(tx) }
              });

        await tx.user.create({
            data: {
                email: contact.email,
                passwordHash,
                role: 'PARTNER_OWNER',
                firstName: contact.firstName,
                lastName: contact.lastName,
                position: contact.position ?? null,
                phone: contact.phone ?? null,
                isPrimaryContact: true,
                partnerId: saved.id
            }
        });

        await tx.partnerFinancialDetail.upsert({
            where: { partnerId: saved.id },
            create: { partnerId: saved.id, ...financial },
            update: financial
        });

        await recordAudit(tx, {
            action: 'PARTNER_REGISTRATION_SUBMITTED',
            actor: { id: null, email: contact.email },
            entityType: AUDIT_ENTITY.partner,
            entityId: saved.id,
            summary: `${saved.name} submitted a partner application`,
            metadata: { reference: saved.reference, invitationId: invitation.id },
            req
        });

        return saved;
    });

    return { partner, contact };
};
