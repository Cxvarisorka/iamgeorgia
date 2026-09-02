import { toDateOnly } from '../lib/time.js';
import { toImageAsset } from './media.js';

/** One gallery image of a car: the asset plus where it sits. */
export const toFleetImage = (image) => ({
    ...toImageAsset(image.fileAsset),
    imageId: image.id,
    caption: image.caption ?? null,
    sortOrder: image.sortOrder,
    isCover: image.isCover
});

/**
 * A document attached to a car or a driver. Deliberately carries no URL:
 * reaching the bytes is a separate, audited request.
 */
export const toAttachedDocument = (document) => ({
    id: document.id,
    docType: document.docType,
    label: document.label ?? null,
    validUntil: document.validUntil ? toDateOnly(document.validUntil) : null,
    fileAssetId: document.fileAssetId,
    file: document.fileAsset
        ? {
              id: document.fileAsset.id,
              originalFilename: document.fileAsset.originalFilename,
              mimeType: document.fileAsset.mimeType,
              sizeBytes: document.fileAsset.sizeBytes,
              category: document.fileAsset.category
          }
        : null,
    uploadedBy: document.uploadedByUser
        ? {
              id: document.uploadedByUser.id,
              email: document.uploadedByUser.email,
              fullName: [document.uploadedByUser.firstName, document.uploadedByUser.lastName]
                  .filter(Boolean)
                  .join(' ')
          }
        : null,
    createdAt: document.createdAt
});

/**
 * A physical car, as a partner or a passenger may see it once it has been
 * assigned to their transfer: enough to recognise it at the kerb, nothing
 * about how it is run.
 */
export const toFleetVehiclePublic = (vehicle) =>
    vehicle
        ? {
              id: vehicle.id,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year ?? null,
              colour: vehicle.colour ?? null,
              body: vehicle.body,
              plateNumber: vehicle.plateNumber,
              passengerCapacity: vehicle.passengerCapacity,
              luggageCapacity: vehicle.luggageCapacity,
              cabinBagCapacity: vehicle.cabinBagCapacity,
              features: vehicle.features ?? [],
              description: vehicle.description ?? null,
              mainImage: toImageAsset(vehicle.mainImage),
              ...(vehicle.images ? { images: vehicle.images.map(toFleetImage) } : {})
          }
        : null;

const toLinkedDriver = (link) => ({
    id: link.driver.id,
    firstName: link.driver.firstName,
    lastName: link.driver.lastName,
    isActive: link.driver.isActive,
    verified: link.driver.verificationStatus === 'VERIFIED',
    isPrimary: link.isPrimary
});

/** Everything, for operations staff. */
export const toFleetVehicleAdmin = (vehicle) => ({
    ...toFleetVehiclePublic(vehicle),
    images: (vehicle.images ?? []).map(toFleetImage),
    vin: vehicle.vin ?? null,
    internalNotes: vehicle.internalNotes ?? null,
    status: vehicle.status,
    provider: vehicle.provider
        ? { id: vehicle.provider.id, slug: vehicle.provider.slug, name: vehicle.provider.name }
        : null,
    vehicleClass: vehicle.vehicleClass
        ? {
              id: vehicle.vehicleClass.id,
              slug: vehicle.vehicleClass.slug,
              name: vehicle.vehicleClass.name,
              vehicleClass: vehicle.vehicleClass.vehicleClass
          }
        : null,
    drivers: (vehicle.drivers ?? []).map(toLinkedDriver),
    documents: (vehicle.documents ?? []).map(toAttachedDocument),
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt
});
