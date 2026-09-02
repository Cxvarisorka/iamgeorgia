import { prisma } from '../../db/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { recordAudit } from '../../lib/audit.js';

/**
 * A private document library, for anything that has one.
 *
 * A hotel's contracts, a driver's licence and a car's insurance differ in the
 * join table and the column naming the owner, and in nothing that matters:
 * every one attaches an already-uploaded PRIVATE asset, carries a machine
 * `docType`, a label and an expiry, and offers no way whatsoever to read the
 * bytes — that goes through the media router's signed-link endpoint, which
 * checks authorization and writes an audit row. Written once, configured per
 * owner, exactly as `createGallery` is.
 */

export const documentInclude = {
    fileAsset: {
        select: {
            id: true,
            originalFilename: true,
            mimeType: true,
            sizeBytes: true,
            category: true,
            visibility: true,
            createdAt: true
        }
    },
    uploadedByUser: { select: { id: true, email: true, firstName: true, lastName: true } }
};

export const createDocumentLibrary = ({
    documentDelegate,
    ownerDelegate,
    ownerField,
    ownerLabel,
    /** What the owner is called in a conflict message: "this property". */
    ownerNoun = ownerLabel.toLowerCase(),
    ownerName = (owner) => owner.name,
    ownerSelect = { id: true, name: true },
    auditEntity,
    auditActions,
    /** Extra relations loaded on the document before `beforeDetach` runs. */
    detachInclude = {},
    /** May throw to refuse a detach — a verified certificate still pointing at it, say. */
    beforeDetach = null
}) => {
    const findOwner = async (tx, ownerId) => {
        const owner = await tx[ownerDelegate].findUnique({ where: { id: ownerId }, select: ownerSelect });

        if (!owner) {
            throw new NotFoundError(`${ownerLabel} not found`);
        }

        return owner;
    };

    const list = (ownerId, { docType } = {}) =>
        prisma[documentDelegate].findMany({
            where: { [ownerField]: ownerId, ...(docType ? { docType } : {}) },
            include: documentInclude,
            orderBy: [{ docType: 'asc' }, { createdAt: 'desc' }]
        });

    const findOr404 = async (ownerId, documentId) => {
        const document = await prisma[documentDelegate].findFirst({
            where: { id: documentId, [ownerField]: ownerId },
            include: documentInclude
        });

        if (!document) {
            throw new NotFoundError('Document not found');
        }

        return document;
    };

    /**
     * Attaches an uploaded asset.
     *
     * The asset has to be PRIVATE. Nothing about a document library is meant
     * to be publicly addressable, and letting a gallery image be filed as a
     * licence would give the impression of privacy without any of it.
     */
    const attach = (ownerId, input, actor, req) =>
        prisma.$transaction(async (tx) => {
            const owner = await findOwner(tx, ownerId);

            const asset = await tx.fileAsset.findFirst({
                where: { id: input.fileAssetId, deletedAt: null },
                select: { id: true, visibility: true, category: true, originalFilename: true }
            });

            if (!asset) {
                throw new BadRequestError('That file does not exist', { field: 'fileAssetId' });
            }

            if (asset.visibility !== 'PRIVATE') {
                throw new BadRequestError('Only a private file can be attached as a document', {
                    field: 'fileAssetId',
                    visibility: asset.visibility
                });
            }

            const existing = await tx[documentDelegate].findFirst({
                where: { [ownerField]: ownerId, fileAssetId: asset.id },
                select: { id: true }
            });

            if (existing) {
                throw new ConflictError(`That file is already attached to this ${ownerNoun}`, {
                    documentId: existing.id
                });
            }

            const document = await tx[documentDelegate].create({
                data: {
                    [ownerField]: ownerId,
                    fileAssetId: asset.id,
                    docType: input.docType,
                    label: input.label ?? null,
                    validUntil: input.validUntil ? new Date(`${input.validUntil}T00:00:00Z`) : null,
                    uploadedByUserId: actor?.id ?? null
                },
                include: documentInclude
            });

            await recordAudit(tx, {
                action: auditActions.attached,
                actor,
                entityType: auditEntity,
                entityId: document.id,
                summary: `Attached ${input.docType} "${asset.originalFilename}" to ${ownerName(owner)}`,
                metadata: { [ownerField]: ownerId, docType: input.docType, fileAssetId: asset.id },
                req
            });

            return document;
        });

    /**
     * Detaches a document. The bytes stay in the media library: removing them
     * is a media-library action with its own endpoint and its own audit row,
     * and an asset may be attached somewhere else.
     */
    const detach = (ownerId, documentId, actor, req) =>
        prisma.$transaction(async (tx) => {
            const owner = await findOwner(tx, ownerId);

            const document = await tx[documentDelegate].findFirst({
                where: { id: documentId, [ownerField]: ownerId },
                include: detachInclude
            });

            if (!document) {
                throw new NotFoundError('Document not found');
            }

            if (beforeDetach) {
                await beforeDetach(document, tx);
            }

            await tx[documentDelegate].delete({ where: { id: documentId } });

            await recordAudit(tx, {
                action: auditActions.detached,
                actor,
                entityType: auditEntity,
                entityId: documentId,
                summary: `Detached ${document.docType} from ${ownerName(owner)}`,
                metadata: { [ownerField]: ownerId, docType: document.docType, fileAssetId: document.fileAssetId },
                req
            });
        });

    return { list, findOr404, attach, detach };
};
