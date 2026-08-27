/**
 * Shapes a user for an API response.
 *
 * Built by listing what goes out rather than by deleting what must not: a
 * column added to the model tomorrow is invisible until someone adds it here,
 * which is the safe direction for a table that holds a password hash.
 */
export const toUser = (user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    position: user.position ?? null,
    phone: user.phone ?? null,
    isPrimaryContact: user.isPrimaryContact,
    isActive: user.isActive,
    partnerId: user.partnerId ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt
});

/** The contact block the admin panel shows on a partner row. */
export const toContact = (user) =>
    user
        ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              fullName: [user.firstName, user.lastName].filter(Boolean).join(' '),
              position: user.position ?? null,
              phone: user.phone ?? null,
              email: user.email,
              role: user.role,
              isPrimaryContact: user.isPrimaryContact,
              isActive: user.isActive,
              /** True until they have set a password through their link. */
              isPending: !user.passwordHash
          }
        : null;
