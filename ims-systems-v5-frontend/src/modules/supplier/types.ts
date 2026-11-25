/**
 * ASL Supplier frontend types — aligned with `/api/v1/supplier`.
 */

export const ASL_CRITICALITIES = ["Critical", "High", "Standard"] as const;
export type AslCriticality = (typeof ASL_CRITICALITIES)[number];

export const ASL_STATUSES = [
  "Prospective",
  "Approved",
  "Conditional",
  "Suspended",
  "Removed",
] as const;
export type AslStatus = (typeof ASL_STATUSES)[number];

export const ASL_CATEGORIES = [
  "Raw materials",
  "Subcontract process",
  "Contractor on site",
  "Transport",
  "Calibration / test",
  "IT / data processor",
  "Packaging",
  "Consumables",
  "Professional services",
] as const;
export type AslCategory = (typeof ASL_CATEGORIES)[number];

export const ASL_STANDARDS = [
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "ISO 27001",
] as const;

export const ASL_DOC_TYPES = [
  "Insurance (PL/EL)",
  "ISO certificate",
  "SSIP (CHAS/SafeContractor)",
  "RAMS",
  "Signed requirements / T&Cs",
  "Data processing agreement",
  "Cyber Essentials",
  "UKAS schedule",
  "Competence / trade card",
  "Other",
] as const;

export type AslDocState = "missing" | "expired" | "soon" | "ok";

export type AslFileMeta = {
  Name: string;
  Key: string;
  key?: string;
  Bucket: string;
  Size?: number;
};

export type AslDocument = {
  id: string;
  type: string;
  exp: string | null;
  ref: string;
  req: boolean;
  chased: string | null;
  file?: AslFileMeta | null;
};

export type AslEvaluation = {
  id: string;
  date: string;
  by: string;
  scores: Record<string, number>;
  note: string;
  score: number;
};

export type AslComm = {
  id: string;
  date: string;
  type: string;
  subject: string;
  by: string;
  outcome: string;
};

export type AslTrailEntry = {
  t: string;
  by: string;
  what: string;
};

export type AslCriterion = {
  k: string;
  n: string;
  w: number;
};

export type AslSettings = {
  id: string;
  organizationId: string;
  lead: number;
  follow: number;
  esc: number;
  from: string;
  interval: Record<AslCriticality, number>;
  criteria: AslCriterion[];
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AslSupplier = {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  cat: string;
  crit: AslCriticality;
  status: AslStatus;
  contact: string;
  email: string;
  stds: string[];
  scope: string;
  reqs: string;
  appby: string;
  appon: string | null;
  evalDue: string | null;
  evalDueNotifiedOn: string | null;
  docs: AslDocument[];
  evals: AslEvaluation[];
  comms: AslComm[];
  trail: AslTrailEntry[];
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAslSupplierInput = {
  name: string;
  cat?: string;
  crit?: AslCriticality;
  contact?: string;
  email?: string;
  stds?: string[];
  scope?: string;
  reqs?: string;
  evalDue?: string | null;
};

export type UpdateAslSupplierInput = {
  name?: string;
  cat?: string;
  crit?: AslCriticality;
  status?: AslStatus;
  contact?: string;
  email?: string;
  stds?: string[];
  scope?: string;
  reqs?: string;
  appby?: string;
  appon?: string | null;
  evalDue?: string | null;
};
export type UpsertAslDocumentInput = {
  type: string;
  exp?: string | null;
  ref?: string;
  req?: boolean;
  storageInfo?: AslFileMeta | null;
};

export type PublicAslUploadInput = {
  type?: string;
  exp?: string | null;
  ref?: string;
  storageInfo: AslFileMeta;
};

export type CreateAslEvaluationInput = {
  scores: Record<string, number>;
  note?: string;
};

export type UpdateAslSettingsInput = {
  lead?: number;
  follow?: number;
  esc?: number;
  from?: string;
  interval?: Partial<Record<AslCriticality, number>>;
  criteria?: AslCriterion[];
};

export type ListAslSuppliersParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  crit?: AslCriticality;
  status?: AslStatus;
  issue?: boolean;
  includeRemoved?: boolean;
};

export type PaginatedAslSuppliers = {
  items: AslSupplier[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AslIssue = {
  k: string;
  t: string;
  docId?: string;
};

export type AslOverview = {
  asOf: string;
  totals: {
    live: number;
    critical: number;
    approved: number;
    conditional: number;
    docsExpiring: number;
    evaluationsDue: number;
    chasedThisMonth: number;
  };
  attention: Array<{
    supplierId: string;
    name: string;
    crit: string;
    cat: string;
    status: string;
    issue: AslIssue;
  }>;
  readiness: Array<{
    label: string;
    pass: boolean;
    detail: string;
    clause: string;
  }>;
};

export type AslNotifyResult = {
  supplierId: string;
  name: string;
  email: string | null;
  sent: boolean;
  type: string;
  subject: string;
  error?: string;
};

export type AslShareResult = {
  token: string;
  url: string;
  expiresAt: string;
};

export type AslPublicSnapshot = {
  orgName: string;
  generatedAt: string;
  suppliers: AslSupplier[];
  settings: Pick<
    AslSettings,
    "lead" | "follow" | "esc" | "interval" | "criteria"
  >;
  overview: AslOverview;
};

export type AslUploadContext = {
  orgName: string;
  supplier: {
    id: string;
    name: string;
    missing: string[];
    expired: AslDocument[];
    soon: AslDocument[];
  };
  organizationId: string;
};
export type AslHubView =
  | "overview"
  | "asl"
  | "documents"
  | "evaluations"
  | "comms"
  | "auditor"
  | "settings";

export const ASL_HUB_VIEWS: AslHubView[] = [
  "overview",
  "asl",
  "documents",
  "evaluations",
  "comms",
  "auditor",
  "settings",
];

export const DEFAULT_ASL_CRITERIA: AslCriterion[] = [
  { k: "quality", n: "Quality of supply (conformance, NCRs)", w: 35 },
  { k: "delivery", n: "On-time delivery", w: 25 },
  { k: "hse", n: "H&S and environmental performance", w: 20 },
  { k: "resp", n: "Responsiveness and communication", w: 10 },
  { k: "comm", n: "Commercial (price stability, invoicing accuracy)", w: 10 },
];
