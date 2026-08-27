import { prisma } from '../../db/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit, AUDIT_ENTITY } from '../../lib/audit.js';

/**
 * Galleries, for anything that has one.
 *
 * A hotel's gallery and a room type's gallery differ in exactly two ways — the
 * join table and the column naming the owner — and in none of the ways that
 * matter: both attach an existing public image, both keep at most one cover,
 * both promote a replacement when the cover is removed, and both reorder as a
 * whole rather than a row at a time. Writing that twice would mean fixing the
 * cover-promotion bug twice, so it is written once and configured.
 *
 * Attaching is deliberately separate from uploading. An asset is uploaded once
 * to the media library and may then be attached, detached and re-attached
 * without the bytes moving or its key changing, which is also why the join
 * carries `onDelete: Restrict` to the file: detaching is editorial, deleting
 * the file is not, and they should not be the same request.
 */
export const createGallery = ({ imageDelegate, ownerDelegate, ownerField, ownerLabel, auditEntity }) => {
    const findOwner = async (tx, ownerId) => {
        const owner = await tx[ownerDelegate].findUnique({ where: { id: ownerId } });

        if (!owner) {
            throw new NotFoundError(`${ownerLabel} not found`);
        }

        return owner;
    };

    /**
     * Clears the cover flag before a new one is set.
     *
     * The partial unique index would reject a second cover outright, so without
     * this the only way to change cover would be two requests with a window in
     * between where there is none. Both inside one transaction means no window.
     */
    const clearCover = (tx, ownerId, exceptId) =>
        tx[imageDelegate].updateMany({
            where: {
                [ownerField]: ownerId,
                isCover: true,
                ...(exceptId ? { NOT: { id: exceptId } } : {})
            },
            data: { isCover: false }
        });

    const auditOwner = (tx, owner, actor, req, summary, metadata) =>
        recordAudit(tx, {
            action: auditEntity === AUDIT_ENTITY.hotel ? 'HOTEL_UPDATED' : 'ROOM_TYPE_UPDATED',
            actor,
            entityType: auditEntity,
            entityId: owner.id,
            summary,
            metadata,
            req
        });

    const attach = (ownerId, input, actor, req) =>
        prisma.$transaction(async (tx) => {
            const owner = await findOwner(tx, ownerId);
            const { fileAssetId, ...rest } = input;

            const asset = await tx.fileAsset.findFirst({ where: { id: fileAssetId, deletedAt: null } });

            if (!asset) {
                throw new BadRequestError('That file does not exist', { field: 'fileAssetId' });
            }

            // A gallery is public, so only a public asset may join one. This is
            // what stops a contract being attached and served from a CDN.
            if (asset.visibility !== 'PUBLIC') {
                throw new BadRequestError('Only public images can be added to a gallery', {
                    field: 'fileAssetId',
                    visibility: asset.visibility
                });
            }

            if (!asset.mimeType.startsWith('image/')) {
                throw new BadRequestError('That file is not an image', { field: 'fileAssetId' });
            }

            const existing = await tx[imageDelegate].count({ where: { [ownerField]: ownerId } });
            // The first image becomes the cover unless told otherwise: a
            // gallery with no cover renders as a grey box, and nobody wants
            // that as a default.
            const isCover = input.isCover ?? existing === 0;

            if (isCover) {
                await clearCover(tx, ownerId);
            }

            const image = await tx[imageDelegate].create({
                data: {
                    ...rest,
                    [ownerField]: ownerId,
                    fileAssetId: asset.id,
                    caption: input.caption ?? null,
                    sortOrder: input.sortOrder ?? existing,
                    isCover
                },
                include: { fileAsset: { include: { variants: true } } }
            });

            await auditOwner(tx, owner, actor, req, `Added an image to ${owner.name}`, {
                fileAssetId: asset.id,
                isCover
            });

            return image;
        });

    const update = (ownerId, imageId, input, actor, req) =>
        prisma.$transaction(async (tx) => {
            const owner = await findOwner(tx, ownerId);
            const current = await tx[imageDelegate].findFirst({
                where: { id: imageId, [ownerField]: ownerId }
            });

            if (!current) {
                throw new NotFoundError('Image not found in this gallery');
            }

            if (input.isCover === true) {
                await clearCover(tx, ownerId, imageId);
            }

            // Refuse to unset the only cover rather than silently leaving the
            // gallery without one — pick a different cover instead.
            if (input.isCover === false && current.isCover) {
                const others = await tx[imageDelegate].count({
                    where: { [ownerField]: ownerId, NOT: { id: imageId } }
                });

                if (others > 0) {
                    throw new ConflictError('Choose another cover image instead of removing this one');
                }
            }

            const image = await tx[imageDelegate].update({
                where: { id: imageId },
                data: input,
                include: { fileAsset: { include: { variants: true } } }
            });

            await auditOwner(tx, owner, actor, req, `Updated an image on ${owner.name}`, {
                imageId,
                fields: Object.keys(input)
            });

            return image;
        });

    const detach = (ownerId, imageId, actor, req) =>
        prisma.$transaction(async (tx) => {
            const owner = await findOwner(tx, ownerId);
            const image = await tx[imageDelegate].findFirst({
                where: { id: imageId, [ownerField]: ownerId }
            });

            if (!image) {
                throw new NotFoundError('Image not found in this gallery');
            }

            await tx[imageDelegate].delete({ where: { id: imageId } });

            // If the cover went, promote whatever now sorts first rather than
            // leaving the gallery coverless.
            if (image.isCover) {
                const next = await tx[imageDelegate].findFirst({
                    where: { [ownerField]: ownerId },
                    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
                });

                if (next) {
                    await tx[imageDelegate].update({ where: { id: next.id }, data: { isCover: true } });
                }
            }

            // A hotel may also point at this asset explicitly as its featured
            // image; room types have no such field.
            if (owner.featuredImageId && owner.featuredImageId === image.fileAssetId) {
                await tx[ownerDelegate].update({ where: { id: ownerId }, data: { featuredImageId: null } });
            }

            await auditOwner(tx, owner, actor, req, `Removed an image from ${owner.name}`, {
                imageId,
                wasCover: image.isCover
            });

            return image;
        });

    const reorder = (ownerId, order, actor, req) =>
        prisma.$transaction(async (tx) => {
            const owner = await findOwner(tx, ownerId);
            const images = await tx[imageDelegate].findMany({
                where: { [ownerField]: ownerId },
                select: { id: true }
            });
            const known = new Set(images.map(({ id }) => id));

            // The order must name every image exactly once. A partial list
            // would leave the rest at whatever sortOrder they had, which is a
            // subtly wrong gallery rather than an obvious error.
            const unknown = order.filter((id) => !known.has(id));

            if (unknown.length > 0 || order.length !== images.length) {
                throw new BadRequestError('The order must list every image in this gallery exactly once', {
                    unknown,
                    expected: images.length,
                    received: order.length
                });
            }

            await Promise.all(
                order.map((id, index) =>
                    tx[imageDelegate].update({ where: { id }, data: { sortOrder: index } })
                )
            );

            await auditOwner(tx, owner, actor, req, `Reordered the gallery on ${owner.name}`, {
                count: order.length
            });

            return order.length;
        });

    return { attach, update, detach, reorder };
};

export const hotelGallery = createGallery({
    imageDelegate: 'hotelImage',
    ownerDelegate: 'hotel',
    ownerField: 'hotelId',
    ownerLabel: 'Hotel',
    auditEntity: AUDIT_ENTITY.hotel
});

export const roomTypeGallery = createGallery({
    imageDelegate: 'roomTypeImage',
    ownerDelegate: 'roomType',
    ownerField: 'roomTypeId',
    ownerLabel: 'Room type',
    auditEntity: AUDIT_ENTITY.roomType
});
