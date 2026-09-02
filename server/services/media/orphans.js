import { logger } from '../../lib/logger.js';
import { removeObjectPrefix } from './storage.service.js';

/**
 * Assets left behind by a hard delete.
 *
 * When a car or a driver is removed, the join rows that pointed at their
 * photographs and documents cascade away with them. The assets themselves
 * do not: a file can be attached in more than one place, and only one that
 * is now referenced by nothing anywhere may go. `findOrphanedAssets` runs
 * inside the caller's transaction, after the cascade; `removeOrphanedObjects`
 * runs after the commit, because a failed storage call must not resurrect
 * the rows.
 */

/** Every relation through which something can still hold an asset. */
const UNREFERENCED = {
    hotelImages: { none: {} },
    roomTypeImages: { none: {} },
    hotelDocuments: { none: {} },
    featuredForHotels: { none: {} },
    fleetVehicleImages: { none: {} },
    fleetVehicleDocuments: { none: {} },
    mainImageForFleet: { none: {} },
    driverDocuments: { none: {} },
    driverPhotos: { none: {} }
};

export const findOrphanedAssets = (tx, assetIds) =>
    assetIds.length === 0
        ? Promise.resolve([])
        : tx.fileAsset.findMany({
              where: { id: { in: assetIds }, ...UNREFERENCED },
              select: { id: true, objectKey: true, visibility: true }
          });

/**
 * Bytes last and best-effort. An asset's original and every rendition share
 * one folder, so one prefix delete per asset clears them all; a failure is
 * logged with the prefix, because an object nothing references any more is
 * otherwise invisible — and paid for — until someone audits the bucket.
 */
export const removeOrphanedObjects = (assets, context = {}) =>
    Promise.all(
        assets.map((asset) => {
            const slash = asset.objectKey.lastIndexOf('/');
            const prefix = slash === -1 ? asset.objectKey : asset.objectKey.slice(0, slash);

            return removeObjectPrefix({ prefix, visibility: asset.visibility }).catch((err) =>
                logger.warn(
                    { err, prefix, visibility: asset.visibility, ...context },
                    'Could not remove the objects of a deleted record'
                )
            );
        })
    );
