import { Router } from 'express';
import multer from 'multer';

import { config } from '../config.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, mediaQuerySchema, uploadSchema } from '../validation/media.js';
import {
    findFileOr404,
    issueSignedUrl,
    softDeleteFile,
    uploadFile
} from '../services/media/upload.service.js';
import { prisma } from '../db/index.js';
import { toImageAsset, toPrivateFile } from '../serializers/media.js';

/**
 * Media administration.
 *
 * Files are held in memory rather than spooled to disk: they are validated,
 * re-encoded and forwarded to object storage within the request, so a temporary
 * file would only be another thing to clean up. The multer limit is the larger
 * of the two configured ceilings; the per-category limit is applied in the
 * service, once the file's real type is known.
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: Math.max(config.media.maxImageBytes, config.media.maxDocumentBytes),
        files: 1
    }
});

export const adminMediaRoutes = Router();

adminMediaRoutes.use(authenticate, requireAdmin);

adminMediaRoutes.get('/', validate({ query: mediaQuerySchema }), async (req, res) => {
    const { category, partnerId, page, pageSize } = req.valid.query;
    const where = {
        deletedAt: null,
        ...(partnerId ? { partnerId } : {}),
        ...(category ? { category: { in: Array.isArray(category) ? category : [category] } } : {})
    };

    const [total, files] = await Promise.all([
        prisma.fileAsset.count({ where }),
        prisma.fileAsset.findMany({
            where,
            include: { variants: true },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize
        })
    ]);

    res.json({
        // A private file is never given a URL, even to an admin listing it. The
        // link is a separate, audited request.
        data: files.map((file) => (file.visibility === 'PUBLIC' ? toImageAsset(file) : toPrivateFile(file))),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
    });
});

adminMediaRoutes.post('/', upload.single('file'), validate({ body: uploadSchema }), async (req, res) => {
    const asset = await uploadFile(
        {
            buffer: req.file?.buffer,
            originalFilename: req.file?.originalname ?? 'upload',
            declaredMimeType: req.file?.mimetype,
            ...req.valid.body
        },
        req.user,
        req
    );

    res.status(201).json(asset.visibility === 'PUBLIC' ? toImageAsset(asset) : toPrivateFile(asset));
});

adminMediaRoutes.get('/:id', validate({ params: idParamSchema }), async (req, res) => {
    const asset = await findFileOr404(req.valid.params.id);

    res.json(asset.visibility === 'PUBLIC' ? toImageAsset(asset) : toPrivateFile(asset));
});

/**
 * The only way to reach a private file.
 *
 * Authorised, audited, and short-lived. There is no code path that turns a
 * private object key into a permanent URL.
 */
adminMediaRoutes.get('/:id/url', validate({ params: idParamSchema }), async (req, res) => {
    const { url, expiresAt } = await issueSignedUrl(req.valid.params.id, req.user, req);

    res.json({ url, expiresAt });
});

adminMediaRoutes.delete('/:id', validate({ params: idParamSchema }), async (req, res) => {
    await softDeleteFile(req.valid.params.id, req.user, req);

    res.status(204).end();
});
