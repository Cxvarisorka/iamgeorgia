import { ConflictError } from '../../lib/errors.js';
import { AUDIT_ENTITY } from '../../lib/audit.js';
import { createDocumentLibrary, documentInclude } from '../media/documentLibrary.js';

/**
 * The hotel document library.
 *
 * `HotelDocument` has been in the schema since the hotel module landed —
 * "contracts, rate sheets and anything else that must never have a public URL",
 * with a `docType` and a `validUntil` — and a kosher certificate is exactly
 * the thing it was modelled for: a private file, attached to a property, with
 * an expiry. The mechanics now live in `services/media/documentLibrary.js`,
 * shared with the fleet and driver libraries; what is specific to hotels is
 * the one rule below.
 *
 * Detaching is refused while a certificate that somebody verified still
 * points at the document. The foreign key is SetNull, so the delete would
 * succeed and quietly leave a verified certificate with no evidence behind it
 * — which is worse than an error, because nothing about the record would look
 * wrong afterwards.
 */
const library = createDocumentLibrary({
    documentDelegate: 'hotelDocument',
    ownerDelegate: 'hotel',
    ownerField: 'hotelId',
    ownerLabel: 'Hotel',
    ownerNoun: 'property',
    auditEntity: AUDIT_ENTITY.hotelDocument,
    auditActions: { attached: 'HOTEL_DOCUMENT_UPLOADED', detached: 'HOTEL_DOCUMENT_DELETED' },
    detachInclude: {
        kosherCertifications: {
            where: { archivedAt: null, verification: 'VERIFIED' },
            select: { id: true, authorityName: true }
        }
    },
    beforeDetach: (document) => {
        if (document.kosherCertifications.length > 0) {
            throw new ConflictError(
                'A verified certificate still points at this document — archive the certificate first',
                { certifications: document.kosherCertifications }
            );
        }
    }
});

export { documentInclude };
export const listDocuments = library.list;
export const findDocumentOr404 = library.findOr404;
export const attachDocument = library.attach;
export const detachDocument = library.detach;
