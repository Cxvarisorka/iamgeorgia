"use client";

import { DocumentsPanel } from "./DocumentsPanel";
import { driverDocumentTypeLabels } from "@/lib/admin/fleet";
import { attachDriverDocument, detachDriverDocument, getDriverDocumentUrl } from "@/lib/api/drivers";
import type { AttachedDocument, DriverDocumentType } from "@/types/driver";

const DOC_TYPES = (Object.keys(driverDocumentTypeLabels) as DriverDocumentType[]).map((value) => ({
  value,
  label: driverDocumentTypeLabels[value],
}));

/** Licence, ID, medical, background check — bound to one driver, never shown to them. */
export function DriverDocuments({ driverId, documents }: { driverId: string; documents: AttachedDocument[] }) {
  return (
    <DocumentsPanel<DriverDocumentType>
      title="Documents"
      description="Licence and ID scans. Private, staff-only, and never part of what the driver or a partner sees."
      documents={documents}
      docTypes={DOC_TYPES}
      category="DRIVER_DOCUMENT"
      attach={(body) => attachDriverDocument(driverId, body)}
      detach={(documentId) => detachDriverDocument(driverId, documentId)}
      link={(documentId) => getDriverDocumentUrl(driverId, documentId)}
    />
  );
}
