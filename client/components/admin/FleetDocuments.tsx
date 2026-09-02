"use client";

import { DocumentsPanel } from "./DocumentsPanel";
import { vehicleDocumentTypeLabels } from "@/lib/admin/fleet";
import { attachFleetDocument, detachFleetDocument, getFleetDocumentUrl } from "@/lib/api/fleet";
import type { AttachedDocument, VehicleDocumentType } from "@/types/driver";

const DOC_TYPES = (Object.keys(vehicleDocumentTypeLabels) as VehicleDocumentType[]).map((value) => ({
  value,
  label: vehicleDocumentTypeLabels[value],
}));

/** Registration, insurance, inspection — bound to one car. */
export function FleetDocuments({ vehicleId, documents }: { vehicleId: string; documents: AttachedDocument[] }) {
  return (
    <DocumentsPanel<VehicleDocumentType>
      title="Documents"
      documents={documents}
      docTypes={DOC_TYPES}
      category="VEHICLE_DOCUMENT"
      attach={(body) => attachFleetDocument(vehicleId, body)}
      detach={(documentId) => detachFleetDocument(vehicleId, documentId)}
      link={(documentId) => getFleetDocumentUrl(vehicleId, documentId)}
    />
  );
}
