import { toImageAsset } from './media.js';
import { toContact } from './user.js';
import { toAttachedDocument, toFleetVehiclePublic } from './fleet.js';

/**
 * Three views of a driver, each an allow-list.
 *
 * Built by naming what goes out, never by deleting what must not, because
 * this table holds a licence number and a date of birth and the safe failure
 * for a column added tomorrow is that nobody sees it until someone lists it.
 *
 *   toDriverPublic — a partner, or a passenger, meeting this driver
 *   toDriverSelf   — the driver, in their own panel
 *   toDriverAdmin  — operations staff
 */

const lastInitial = (lastName) => (lastName ? `${lastName.trim().charAt(0).toUpperCase()}.` : null);

/**
 * What a partner or passenger may know.
 *
 * `revealPhone` is decided by the caller from the pick-up time, not here:
 * the serializer has no clock and no business having one. `fullName: false`
 * shows a passenger the surname's initial only.
 */
export const toDriverPublic = (driver, { revealPhone = false, fullName = true } = {}) =>
    driver
        ? {
              id: driver.id,
              firstName: driver.firstName,
              lastName: fullName ? driver.lastName : lastInitial(driver.lastName),
              photo: toImageAsset(driver.photo),
              languages: driver.languages ?? [],
              yearsExperience: driver.yearsExperience,
              bio: driver.bio ?? null,
              verified: driver.verificationStatus === 'VERIFIED',
              ratingAvg: driver.ratingAvg,
              ratingCount: driver.ratingCount,
              completedCount: driver.completedCount,
              ...(revealPhone ? { phone: driver.phone } : {})
          }
        : null;

const toLinkedVehicle = (link) => ({
    ...toFleetVehiclePublic(link.fleetVehicle),
    isPrimary: link.isPrimary
});

/** The driver's own view: public, plus contact and standing. */
export const toDriverSelf = (driver) =>
    driver
        ? {
              ...toDriverPublic(driver, { revealPhone: true }),
              email: driver.email ?? null,
              provider: driver.provider ? { id: driver.provider.id, name: driver.provider.name } : null,
              verificationStatus: driver.verificationStatus,
              isActive: driver.isActive,
              licenceExpiresOn: driver.licenceExpiresOn ?? null,
              homeBasePoint: driver.homeBasePoint
                  ? { id: driver.homeBasePoint.id, slug: driver.homeBasePoint.slug, name: driver.homeBasePoint.name }
                  : null,
              vehicles: (driver.vehicles ?? []).map(toLinkedVehicle)
          }
        : null;

/**
 * A driver a partner may ask for at checkout: the public profile plus the
 * cars, of the booked class and free for the journey, they could come in.
 */
export const toAvailableDriver = ({ driver, cars }) => ({
    ...toDriverPublic(driver),
    provider: driver.provider ? { id: driver.provider.id, name: driver.provider.name } : null,
    cars: cars.map(({ car, isPrimary }) => ({ ...toFleetVehiclePublic(car), isPrimary }))
});

/** Everything, for operations staff. */
export const toDriverAdmin = (driver) => ({
    ...toDriverSelf(driver),
    licenceNumber: driver.licenceNumber ?? null,
    dateOfBirth: driver.dateOfBirth ?? null,
    internalNotes: driver.internalNotes ?? null,
    verifiedAt: driver.verifiedAt ?? null,
    verifiedBy: toContact(driver.verifiedByUser),
    deactivatedAt: driver.deactivatedAt ?? null,
    deactivationReason: driver.deactivationReason ?? null,
    /** The login, when one has been created. `isPending` until they set a password. */
    user: toContact(driver.user),
    /** Facts about the documents on file. Never their bytes. */
    documents: (driver.documents ?? []).map(toAttachedDocument),
    provider: driver.provider
        ? { id: driver.provider.id, slug: driver.provider.slug, name: driver.provider.name }
        : null,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt
});
