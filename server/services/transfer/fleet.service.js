import { prisma } from '../../db/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';
import { ACTIVE_ASSIGNMENT_STATUSES } from '../../lib/transfer/machines.js';
import { createGallery } from '../hotel/gallery.service.js';
import { createDocumentLibrary, documentInclude } from '../media/documentLibrary.js';
import { findOrphanedAssets, removeOrphanedObjects } from '../media/orphans.js';

/**
 * The fleet: physical cars.
 *
 * A car is sold as a class (`TransferVehicle`) and belongs to a provider. It
 * is never deleted — an assignment in the past names it — only archived, and
 * archiving is refused while a live assignment still depends on it.
 */

/** Upper-cased, with everything but letters and digits removed: "TB-123-AB" and "tb 123 ab" are one plate. */
export const normalisePlate = (plate) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

const imageWithVariants = { include: { variants: true } };

export const fleetInclude = {
    provider: { select: { id: true, slug: true, name: true } },
    vehicleClass: { select: { id: true, slug: true, name: true, vehicleClass: true, maxPassengers: true } },
    mainImage: imageWithVariants,
    images: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { fileAsset: imageWithVariants }
    },
    documents: {
        orderBy: [{ docType: 'asc' }, { createdAt: 'desc' }],
        include: documentInclude
    },
    drivers: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        include: {
            driver: {
                select: { id: true, firstName: true, lastName: true, isActive: true, verificationStatus: true }
            }
        }
    }
};

export const fleetVehicleLabel = (vehicle) => `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})`;

const findOr404InTx = async (tx, id) => {
    const vehicle = await tx.transferFleetVehicle.findUnique({ where: { id }, include: fleetInclude });

    if (!vehicle) {
        throw new NotFoundError('That car does not exist');
    }

    return vehicle;
};

export const findFleetVehicleOr404 = (id) => findOr404InTx(prisma, id);

export const listFleetVehicles = async (query) => {
    const { page, pageSize, providerId, vehicleClassId, status, search } = query;

    const where = {
        ...(providerId ? { providerId } : {}),
        ...(vehicleClassId ? { vehicleClassId } : {}),
        ...(status ? { status: Array.isArray(status) ? { in: status } : status } : {}),
        ...(search
            ? {
                  OR: [
                      { make: { contains: search, mode: 'insensitive' } },
                      { model: { contains: search, mode: 'insensitive' } },
                      { plateNumber: { contains: search, mode: 'insensitive' } },
                      { plateNormalized: { contains: normalisePlate(search) } }
                  ]
              }
            : {})
    };

    const [total, vehicles] = await Promise.all([
        prisma.transferFleetVehicle.count({ where }),
        prisma.transferFleetVehicle.findMany({
            where,
            include: fleetInclude,
            orderBy: [{ status: 'asc' }, { make: 'asc' }, { model: 'asc' }, { plateNumber: 'asc' }],
            skip: (page - 1) * pageSize,
            take: pageSize
        })
    ]);

    return { vehicles, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
};

/**
 * A registration may be on the road once. Checked here with a friendly
 * message; the partial unique index is what makes it true under concurrency.
 */
const assertPlateFree = async (tx, plateNormalized, exceptId = null) => {
    const clash = await tx.transferFleetVehicle.findFirst({
        where: {
            plateNormalized,
            status: { not: 'ARCHIVED' },
            ...(exceptId ? { NOT: { id: exceptId } } : {})
        },
        select: { id: true, plateNumber: true }
    });

    if (clash) {
        throw new ConflictError('A car with that registration is already in the fleet', {
            field: 'plateNumber',
            vehicleId: clash.id
        });
    }
};

const assertReferences = async (tx, { providerId, vehicleClassId }) => {
    if (providerId) {
        const provider = await tx.transferProvider.findUnique({ where: { id: providerId }, select: { id: true } });

        if (!provider) {
            throw new BadRequestError('That provider does not exist', { field: 'providerId' });
        }
    }

    if (vehicleClassId) {
        const vehicleClass = await tx.transferVehicle.findUnique({
            where: { id: vehicleClassId },
            select: { id: true, status: true }
        });

        if (!vehicleClass || vehicleClass.status === 'ARCHIVED') {
            throw new BadRequestError('That vehicle class does not exist', { field: 'vehicleClassId' });
        }
    }
};

export const createFleetVehicle = (input, actor, req) =>
    prisma.$transaction(async (tx) => {
        await assertReferences(tx, input);

        const plateNormalized = normalisePlate(input.plateNumber);
        await assertPlateFree(tx, plateNormalized);

        const vehicle = await tx.transferFleetVehicle.create({
            data: {
                providerId: input.providerId,
                vehicleClassId: input.vehicleClassId,
                make: input.make,
                model: input.model,
                year: input.year ?? null,
                colour: input.colour ?? null,
                body: input.body,
                plateNumber: input.plateNumber,
                plateNormalized,
                vin: input.vin ?? null,
                passengerCapacity: input.passengerCapacity,
                luggageCapacity: input.luggageCapacity,
                cabinBagCapacity: input.cabinBagCapacity,
                features: input.features,
                description: input.description ?? null,
                internalNotes: input.internalNotes ?? null,
                status: input.status === 'ARCHIVED' ? 'DRAFT' : input.status
            },
            include: fleetInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_FLEET_VEHICLE_CREATED',
            actor,
            entityType: AUDIT_ENTITY.transferFleetVehicle,
            entityId: vehicle.id,
            summary: `Added ${fleetVehicleLabel(vehicle)} to the fleet`,
            req
        });

        return vehicle;
    });

export const updateFleetVehicle = (id, input, actor, req) =>
    prisma.$transaction(async (tx) => {
        const existing = await findOr404InTx(tx, id);

        if (input.status === 'ARCHIVED') {
            throw new BadRequestError('Archive a car through its archive action, not by setting its status', {
                field: 'status'
            });
        }

        await assertReferences(tx, input);

        const data = { ...input };

        if (input.plateNumber !== undefined) {
            data.plateNormalized = normalisePlate(input.plateNumber);
            await assertPlateFree(tx, data.plateNormalized, id);
        }

        // A car coming back from the archive must not collide with its
        // replacement's plate either.
        if (existing.status === 'ARCHIVED' && input.status && input.status !== 'ARCHIVED') {
            await assertPlateFree(tx, data.plateNormalized ?? existing.plateNormalized, id);
        }

        const vehicle = await tx.transferFleetVehicle.update({ where: { id }, data, include: fleetInclude });

        await recordAudit(tx, {
            action: 'TRANSFER_FLEET_VEHICLE_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.transferFleetVehicle,
            entityId: id,
            summary: `Updated ${fleetVehicleLabel(vehicle)}`,
            metadata: { fields: Object.keys(input) },
            req
        });

        return vehicle;
    });

/** Live assignments that would be orphaned by taking this car off the road. */
const liveAssignmentsFor = (tx, fleetVehicleId) =>
    tx.transferAssignment.findMany({
        where: { fleetVehicleId, status: { in: ACTIVE_ASSIGNMENT_STATUSES }, windowEnd: { gt: new Date() } },
        select: { id: true, windowStart: true, booking: { select: { reference: true } } },
        orderBy: { windowStart: 'asc' }
    });

/**
 * Takes a car off the road for good.
 *
 * Refused while a live assignment still names it: the dispatcher reassigns
 * those first, deliberately, rather than discovering at the kerb that the
 * car was archived last week.
 */
export const archiveFleetVehicle = (id, actor, req) =>
    prisma.$transaction(async (tx) => {
        await findOr404InTx(tx, id);

        const live = await liveAssignmentsFor(tx, id);

        if (live.length > 0) {
            throw new ConflictError('This car still has upcoming assignments — reassign them first', {
                reason: 'ACTIVE_ASSIGNMENTS',
                assignments: live.map((row) => ({
                    id: row.id,
                    bookingReference: row.booking.reference,
                    windowStart: row.windowStart
                }))
            });
        }

        const vehicle = await tx.transferFleetVehicle.update({
            where: { id },
            data: { status: 'ARCHIVED' },
            include: fleetInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_FLEET_VEHICLE_ARCHIVED',
            actor,
            entityType: AUDIT_ENTITY.transferFleetVehicle,
            entityId: id,
            summary: `Archived ${fleetVehicleLabel(vehicle)}`,
            req
        });

        return vehicle;
    });

/** Puts a draft or an inactive car on the road. */
export const activateFleetVehicle = (id, actor, req) =>
    prisma.$transaction(async (tx) => {
        const existing = await findOr404InTx(tx, id);

        if (existing.status === 'ARCHIVED') {
            await assertPlateFree(tx, existing.plateNormalized, id);
        }

        const vehicle = await tx.transferFleetVehicle.update({
            where: { id },
            data: { status: 'ACTIVE' },
            include: fleetInclude
        });

        await recordAudit(tx, {
            action: 'TRANSFER_FLEET_VEHICLE_UPDATED',
            actor,
            entityType: AUDIT_ENTITY.transferFleetVehicle,
            entityId: id,
            summary: `Activated ${fleetVehicleLabel(vehicle)}`,
            metadata: { fields: ['status'], from: existing.status },
            req
        });

        return vehicle;
    });

/**
 * Removes a car for good — the one exception to "a car is never deleted",
 * and open only while no assignment, past or upcoming, names it. An
 * assignment is the record of who drove whom and holds its car with
 * Restrict, so a car that has ever been on a job is archived instead; the
 * refusal says so and carries the count.
 *
 * Gallery rows, documents, driver links and blocks cascade with the row.
 * The assets they pointed at go too, but only those now referenced by
 * nothing anywhere — rows in the transaction, bytes after the commit.
 */
export const deleteFleetVehicle = async (id, actor, req) => {
    const { vehicle, orphaned } = await prisma.$transaction(async (tx) => {
        const existing = await findOr404InTx(tx, id);

        const assignments = await tx.transferAssignment.count({ where: { fleetVehicleId: id } });

        if (assignments > 0) {
            throw new ConflictError('This car has been on jobs — archive it instead of deleting it', {
                reason: 'HAS_ASSIGNMENTS',
                assignments
            });
        }

        const assetIds = [
            ...new Set(
                [
                    ...existing.images.map((image) => image.fileAssetId),
                    ...existing.documents.map((document) => document.fileAssetId),
                    existing.mainImageId
                ].filter(Boolean)
            )
        ];

        await tx.transferFleetVehicle.delete({ where: { id } });

        const gone = await findOrphanedAssets(tx, assetIds);

        if (gone.length > 0) {
            await tx.fileAsset.deleteMany({ where: { id: { in: gone.map((asset) => asset.id) } } });
        }

        await recordAudit(tx, {
            action: 'TRANSFER_FLEET_VEHICLE_DELETED',
            actor,
            entityType: AUDIT_ENTITY.transferFleetVehicle,
            entityId: id,
            summary: `Deleted ${fleetVehicleLabel(existing)}`,
            // A snapshot of what was removed: after this commit the row is
            // gone and the audit entry is all that is left of it.
            metadata: {
                make: existing.make,
                model: existing.model,
                plateNumber: existing.plateNumber,
                providerId: existing.providerId,
                vehicleClassId: existing.vehicleClassId,
                status: existing.status,
                drivers: existing.drivers.map((link) => link.driver.id),
                assetsRemoved: gone.length
            },
            req
        });

        return { vehicle: existing, orphaned: gone };
    });

    await removeOrphanedObjects(orphaned, { fleetVehicleId: id });

    return vehicle;
};

/** The car's photographs. The cover is mirrored onto `mainImageId`. */
export const fleetGallery = createGallery({
    imageDelegate: 'transferFleetVehicleImage',
    ownerDelegate: 'transferFleetVehicle',
    ownerField: 'fleetVehicleId',
    ownerLabel: 'Car',
    auditEntity: AUDIT_ENTITY.transferFleetVehicle,
    auditAction: 'TRANSFER_FLEET_VEHICLE_UPDATED',
    ownerName: fleetVehicleLabel,
    mainImageField: 'mainImageId',
    syncMainImage: true
});

/** Registration, insurance, inspection. Private, like every other document. */
export const fleetDocuments = createDocumentLibrary({
    documentDelegate: 'transferFleetVehicleDocument',
    ownerDelegate: 'transferFleetVehicle',
    ownerField: 'fleetVehicleId',
    ownerLabel: 'Car',
    ownerNoun: 'car',
    ownerName: fleetVehicleLabel,
    ownerSelect: { id: true, make: true, model: true, plateNumber: true },
    auditEntity: AUDIT_ENTITY.transferFleetVehicle,
    auditActions: {
        attached: 'TRANSFER_VEHICLE_DOCUMENT_UPLOADED',
        detached: 'TRANSFER_VEHICLE_DOCUMENT_DELETED'
    }
});
