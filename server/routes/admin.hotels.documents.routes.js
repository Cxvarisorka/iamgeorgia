import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import { attachHotelDocumentSchema, hotelDocumentParamSchema } from '../validation/kosher.js';
import { hotelScopedParamSchema } from '../validation/ratePlan.js';
import { attachDocument, detachDocument, listDocuments } from '../services/hotel/document.service.js';
import { toHotelDocument } from '../serializers/kosher.js';

/**
 * The hotel document library.
 *
 * `HotelDocument` has been in the schema since the hotel module landed and
 * nothing has ever written one. These are those endpoints, built because a
 * kosher certificate is exactly what the model describes: a private file
 * attached to a property, with an expiry.
 *
 * Generic on purpose — `docType` is a free machine key, so a contract, a rate
 * sheet and a fire certificate all use this rather than each growing an
 * endpoint. Guards come from the hotel router above.
 *
 * Note what is absent: any way to read the bytes. A document response carries
 * no URL. Reaching one goes through the media router's signed-link endpoint,
 * which checks authorization and writes a PRIVATE_FILE_ACCESSED audit row —
 * and putting an address here would quietly route around both.
 */
export const adminHotelDocumentRoutes = Router({ mergeParams: true });

adminHotelDocumentRoutes.get('/', validate({ params: hotelScopedParamSchema }), async (req, res) => {
    const documents = await listDocuments(req.valid.params.hotelId);

    res.json({ data: documents.map(toHotelDocument) });
});

adminHotelDocumentRoutes.post(
    '/',
    validate({ params: hotelScopedParamSchema, body: attachHotelDocumentSchema }),
    async (req, res) => {
        const document = await attachDocument(
            req.valid.params.hotelId,
            req.valid.body,
            req.user,
            req
        );

        res.status(201).json(toHotelDocument(document));
    }
);

/**
 * Detaches a document. The bytes stay in the media library, which is a separate
 * thing with its own endpoint — an asset may be attached in more than one place
 * and deleting it from here would be deleting somebody else's file.
 *
 * 409 while a verified certificate still points at it: the foreign key is
 * SetNull, so the delete would otherwise succeed and quietly leave a verified
 * certificate with no evidence behind it.
 */
adminHotelDocumentRoutes.delete(
    '/:documentId',
    validate({ params: hotelDocumentParamSchema }),
    async (req, res) => {
        const { hotelId, documentId } = req.valid.params;
        await detachDocument(hotelId, documentId, req.user, req);

        res.status(204).end();
    }
);
