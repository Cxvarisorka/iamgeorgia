import type { Partner, PartnerKind, PartnerStatus } from "@/types";

/**
 * Prototype partner register.
 *
 * A partner is a supplier the studio resells — the hotel that owns the rooms,
 * the operator that runs the trek, the company that owns the vans. The panel's
 * job is the review queue: applications arrive, someone checks the paperwork,
 * and the partner becomes active or does not.
 */

export const partnerStatusLabels: Record<PartnerStatus, string> = {
  pending: "Awaiting review",
  "in-review": "In review",
  active: "Active",
  suspended: "Suspended",
  rejected: "Rejected",
};

export const partnerKindLabels: Record<PartnerKind, string> = {
  hotel: "Accommodation",
  "tour-operator": "Tour operator",
  transport: "Transport",
  experience: "Experience host",
};

/** The paperwork every applicant is asked for, in the order it is chased. */
export const requiredDocuments = [
  "Business registration",
  "Liability insurance",
  "Tax certificate",
  "Operating licence",
] as const;

export const partners: Partner[] = [
  {
    id: "pt-001",
    name: "Caucasus Trails",
    legalName: "Caucasus Trails LLC",
    kind: "tour-operator",
    status: "active",
    contactName: "Nino Kvaratskhelia",
    email: "nino@caucasustrails.ge",
    phone: "+995 599 12 45 80",
    city: "Tbilisi",
    taxId: "GE 404 512 889",
    website: "caucasustrails.ge",
    appliedOn: "2023-03-14",
    commissionRate: 18,
    listings: 7,
    revenue: 184_200,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: true },
      { label: "Tax certificate", received: true },
      { label: "Operating licence", received: true },
    ],
    notes: "Our longest-standing trekking partner. Runs the Svaneti and Kazbegi routes.",
  },
  {
    id: "pt-002",
    name: "Vera Hospitality Group",
    legalName: "Vera Hospitality Group JSC",
    kind: "hotel",
    status: "active",
    contactName: "Levan Abashidze",
    email: "l.abashidze@verahospitality.ge",
    phone: "+995 322 55 01 40",
    city: "Tbilisi",
    taxId: "GE 205 447 013",
    website: "verahospitality.ge",
    appliedOn: "2022-11-02",
    commissionRate: 15,
    listings: 3,
    revenue: 246_800,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: true },
      { label: "Tax certificate", received: true },
      { label: "Operating licence", received: true },
    ],
  },
  {
    id: "pt-003",
    name: "Highland Rooms",
    legalName: "Highland Rooms Ltd",
    kind: "hotel",
    status: "active",
    contactName: "Mariam Beridze",
    email: "mariam@highlandrooms.ge",
    phone: "+995 577 84 22 19",
    city: "Stepantsminda",
    taxId: "GE 412 883 550",
    appliedOn: "2024-05-21",
    commissionRate: 16,
    listings: 4,
    revenue: 97_400,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: true },
      { label: "Tax certificate", received: true },
      { label: "Operating licence", received: false },
    ],
    notes: "Mountain licence renewal is due in November — chase before the ski season.",
  },
  {
    id: "pt-004",
    name: "Georgian Transfer",
    legalName: "Georgian Transfer LLC",
    kind: "transport",
    status: "active",
    contactName: "Giorgi Tsereteli",
    email: "g.tsereteli@georgiantransfer.ge",
    phone: "+995 595 30 77 12",
    city: "Tbilisi",
    taxId: "GE 301 220 764",
    website: "georgiantransfer.ge",
    appliedOn: "2023-08-09",
    commissionRate: 12,
    listings: 6,
    revenue: 132_900,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: true },
      { label: "Tax certificate", received: true },
      { label: "Operating licence", received: true },
    ],
  },
  {
    id: "pt-005",
    name: "Tbilisi Premium Transfers",
    legalName: "TPT Group LLC",
    kind: "transport",
    status: "suspended",
    contactName: "Irakli Gogoladze",
    email: "irakli@tbilisipremium.ge",
    phone: "+995 591 44 08 63",
    city: "Tbilisi",
    taxId: "GE 445 190 227",
    appliedOn: "2024-02-18",
    commissionRate: 14,
    listings: 2,
    revenue: 41_600,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: false },
      { label: "Tax certificate", received: true },
      { label: "Operating licence", received: true },
    ],
    notes: "Suspended on 2 August — insurance certificate lapsed. Reinstate on receipt.",
  },
  {
    id: "pt-006",
    name: "Alaverdi Wine Estate",
    legalName: "Alaverdi Marani LLC",
    kind: "experience",
    status: "in-review",
    contactName: "Tamar Kipiani",
    email: "tamar@alaverdimarani.ge",
    phone: "+995 599 71 33 04",
    city: "Telavi",
    taxId: "GE 218 660 431",
    website: "alaverdimarani.ge",
    appliedOn: "2026-08-02",
    commissionRate: 20,
    listings: 0,
    revenue: 0,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: true },
      { label: "Tax certificate", received: false },
      { label: "Operating licence", received: false },
    ],
    notes: "Site visit done 8 August. Qvevri cellar and tasting room both suitable.",
  },
  {
    id: "pt-007",
    name: "Svaneti Guides Collective",
    legalName: "Svaneti Guides Collective LLC",
    kind: "tour-operator",
    status: "pending",
    contactName: "Zurab Kaldani",
    email: "z.kaldani@svanetiguides.ge",
    phone: "+995 577 22 41 90",
    city: "Mestia",
    taxId: "GE 509 118 342",
    appliedOn: "2026-08-10",
    commissionRate: 18,
    listings: 0,
    revenue: 0,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: false },
      { label: "Tax certificate", received: false },
      { label: "Operating licence", received: false },
    ],
  },
  {
    id: "pt-008",
    name: "Black Sea Boat Club",
    legalName: "BSBC Ltd",
    kind: "experience",
    status: "pending",
    contactName: "Dato Chkheidze",
    email: "dato@blackseaboatclub.ge",
    phone: "+995 593 60 15 27",
    city: "Batumi",
    taxId: "GE 337 902 118",
    appliedOn: "2026-08-09",
    commissionRate: 22,
    listings: 0,
    revenue: 0,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: true },
      { label: "Tax certificate", received: false },
      { label: "Operating licence", received: false },
    ],
  },
  {
    id: "pt-009",
    name: "Borjomi Spa Resorts",
    legalName: "Borjomi Spa Resorts JSC",
    kind: "hotel",
    status: "rejected",
    contactName: "Ana Melikishvili",
    email: "a.melikishvili@borjomispa.ge",
    phone: "+995 322 90 44 51",
    city: "Borjomi",
    taxId: "GE 660 214 807",
    appliedOn: "2026-06-27",
    commissionRate: 15,
    listings: 0,
    revenue: 0,
    documents: [
      { label: "Business registration", received: true },
      { label: "Liability insurance", received: false },
      { label: "Tax certificate", received: true },
      { label: "Operating licence", received: false },
    ],
    notes: "Declined on 14 July — could not evidence liability cover for the pool complex.",
  },
];

export function getPartnerById(id: string | undefined): Partner | undefined {
  if (!id) return undefined;
  return partners.find((partner) => partner.id === id);
}

/** Applications sitting in the queue, oldest first — the review order. */
export function partnersAwaitingReview(): Partner[] {
  return partners
    .filter((partner) => partner.status === "pending" || partner.status === "in-review")
    .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn));
}
