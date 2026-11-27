/**
 * Tender Autopilot domain types.
 * Product requirements: frontend/src/assets/ims-os-tender-module/SPECIFICATION.md
 */

export const TENDER_RESOURCE = "tender" as const;

/* ---------------- enums (const arrays + types) ---------------- */

export const TENDER_QUESTION_STATUSES = [
  "blank",
  "draft",
  "edited",
  "needs-input",
  "accepted",
  "approved",
] as const;
export type TenderQuestionStatus = (typeof TENDER_QUESTION_STATUSES)[number];

export const TENDER_QUESTIONNAIRE_STATUSES = [
  "new",
  "drafting",
  "review",
  "ready",
  "submitted",
] as const;
export type TenderQuestionnaireStatus =
  (typeof TENDER_QUESTIONNAIRE_STATUSES)[number];

export const TENDER_QUESTION_TYPES = [
  "text",
  "yesno",
  "number",
  "upload",
] as const;
export type TenderQuestionType = (typeof TENDER_QUESTION_TYPES)[number];

export const TENDER_REQUIREMENT_LEVELS = ["mandatory", "desirable"] as const;
export type TenderRequirementLevel =
  (typeof TENDER_REQUIREMENT_LEVELS)[number];

export const TENDER_REQUIREMENT_STATUSES = [
  "comply",
  "partial",
  "no",
  "unassessed",
] as const;
export type TenderRequirementStatus =
  (typeof TENDER_REQUIREMENT_STATUSES)[number];

export const TENDER_DOCUMENT_KINDS = [
  "document",
  "pricing",
  "questionnaire",
  "specification",
  "instructions",
] as const;
export type TenderDocumentKind = (typeof TENDER_DOCUMENT_KINDS)[number];

export const TENDER_GATE_VERDICTS = ["bid", "review", "no-bid-risk"] as const;
export type TenderGateVerdict = (typeof TENDER_GATE_VERDICTS)[number];

export const TENDER_QUESTIONNAIRE_KINDS = ["questionnaire", "tender"] as const;
export type TenderQuestionnaireKind =
  (typeof TENDER_QUESTIONNAIRE_KINDS)[number];

export const TENDER_LIMIT_KINDS = ["words", "chars", "pages"] as const;
export type TenderLimitKind = (typeof TENDER_LIMIT_KINDS)[number];

export const TENDER_SOURCE_KINDS = [
  "answer",
  "certificate",
  "policy",
  "service",
  "case",
  "rate",
] as const;
export type TenderSourceKind = (typeof TENDER_SOURCE_KINDS)[number];

export const TENDER_LIBRARY_KINDS = [
  "answers",
  "certificates",
  "policies",
  "services",
  "cases",
  "rates",
] as const;
export type TenderLibraryKind = (typeof TENDER_LIBRARY_KINDS)[number];

export const TENDER_QUESTIONNAIRE_SOURCES = [
  "xlsx",
  "docx",
  "portal",
  "csv",
  "pdf",
  "text",
  "manual",
] as const;
export type TenderQuestionnaireSource =
  (typeof TENDER_QUESTIONNAIRE_SOURCES)[number];

/* ---------------- history / log / file meta ---------------- */

export type TenderHistoryEntry = {
  t: string;
  by: string;
  what: string;
};

export type TenderLogEntry = {
  t: string;
  by: string;
  what: string;
};

/** Storage metadata — same shape as TrainingFileMeta. */
export type TenderFileMeta = {
  Name: string;
  Key?: string;
  key?: string;
  Bucket: string;
  Size?: number;
};

/* ---------------- settings & facts ---------------- */

export type TenderSettings = {
  reviewMonths: number;
  approvers: string[];
  tone: string;
  minConfidence: number;
  certWarnDays: number;
  learn: boolean;
  submissionCc: string;
  fromEmail: string;
};

export const DEFAULT_SETTINGS: TenderSettings = {
  reviewMonths: 12,
  approvers: [],
  tone: 'Formal, first person plural ("we"), concrete and evidenced. British English.',
  minConfidence: 0.55,
  certWarnDays: 60,
  learn: true,
  submissionCc: "",
  fromEmail: "",
};

/** Free-form company facts used for {{fact}} substitution and factAnswer(). */
export type TenderFacts = Record<string, string>;

/* ---------------- library entities ---------------- */

export type TenderEvidenceRef = {
  kind: TenderSourceKind | string;
  id: string;
  label?: string;
};

export type TenderLibraryAnswer = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  standards: string[];
  owner: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewBy?: string;
  uses: number;
  source?: { qid: string; buyer: string };
  evidence: TenderEvidenceRef[];
  hist: TenderHistoryEntry[];
};

export type TenderCertificate = {
  id: string;
  name: string;
  body?: string;
  number?: string;
  standard?: string;
  scope?: string;
  issued?: string;
  expires?: string;
  fileId?: string | null;
  fileName?: string | null;
  /** Platform object-storage metadata for download on submit. */
  fileMeta?: TenderFileMeta | null;
  hist?: TenderHistoryEntry[];
};

export type TenderPolicy = {
  id: string;
  name: string;
  ref?: string;
  version?: string;
  reviewed?: string;
  nextReview?: string;
  owner?: string;
  fileId?: string | null;
  fileName?: string | null;
  fileMeta?: TenderFileMeta | null;
  summary?: string;
  tags?: string[];
  hist?: TenderHistoryEntry[];
};

export type TenderService = {
  id: string;
  name: string;
  description: string;
  method?: string;
  people?: string[];
  tags?: string[];
  hist?: TenderHistoryEntry[];
};

export type TenderCaseStudy = {
  id: string;
  client: string;
  title: string;
  sector?: string;
  year?: string;
  value?: string;
  summary?: string;
  outcome?: string;
  tags?: string[];
  hist?: TenderHistoryEntry[];
};

export type TenderRate = {
  id: string;
  item: string;
  unit: string;
  rate: number;
  category?: string;
};

export type TenderLibrary = {
  answers: TenderLibraryAnswer[];
  certificates: TenderCertificate[];
  policies: TenderPolicy[];
  services: TenderService[];
  cases: TenderCaseStudy[];
  rates: TenderRate[];
};

export type TenderPerson = {
  id: string;
  name: string;
  role?: string;
  title?: string;
  email?: string;
};

/* ---------------- limits, sources, questions ---------------- */

export type TenderResponseLimit = {
  kind: TenderLimitKind;
  n: number;
  spaces: "incl" | "excl" | null;
  text?: string;
  clean?: string;
  inherited?: boolean;
};

export type TenderSourceHit = {
  kind: TenderSourceKind | string;
  id: string;
  label: string;
  score: number;
};

export type TenderQuestionMeta = {
  row?: number;
  answerCol?: number | null;
  refCol?: number;
  questionCol?: number;
};

export type TenderQuestion = {
  id: string;
  ref: string;
  section: string;
  text: string;
  type: TenderQuestionType;
  wordLimit: number | null;
  limit?: TenderResponseLimit | null;
  answer: string;
  status: TenderQuestionStatus;
  confidence: number;
  sources: TenderSourceHit[];
  assignee?: string | null;
  note?: string;
  approvedBy?: string;
  approvedAt?: string;
  hist: TenderHistoryEntry[];
  meta?: TenderQuestionMeta;
  docId?: string;
};

/* ---------------- requirements, criteria, dates, pricing ---------------- */

export type TenderRequirement = {
  id: string;
  ref: string;
  section: string;
  text: string;
  level: TenderRequirementLevel;
  status: TenderRequirementStatus;
  evidence: TenderEvidenceRef[];
  note: string;
  docId?: string;
  auto?: boolean;
  by?: string;
  t?: string;
};

export type TenderCriterion = {
  name: string;
  weight: number;
};

export type TenderDates = {
  deadline?: string | null;
  clarifications?: string | null;
  contractStart?: string | null;
  [key: string]: string | null | undefined;
};

export type TenderPricingLine = {
  id: string;
  description: string;
  unit: string;
  qty: number;
  rate: number | null;
  category: string;
  buyerRow?: number;
  note?: string;
  rateId?: string;
  suggested?: boolean;
};

export type TenderPricing = {
  lines: TenderPricingLine[];
  overheadPct: number;
  marginPct: number;
  vatPct: number;
  currency: string;
  notes?: string;
  basis?: string;
  suggested?: number;
  buyerSheet?: {
    docId?: string;
    header?: number;
    cols?: Record<string, number>;
  };
};

export type TenderPriceTotals = {
  sub: number;
  byCat: Record<string, number>;
  overhead: number;
  margin: number;
  net: number;
  vat: number;
  gross: number;
  lines: number;
  unpriced: number;
};

export type TenderPackDocument = {
  id: string;
  t: string;
  by: string;
  kind?: TenderDocumentKind | string;
  name?: string;
  source?: string;
  fileId?: string | null;
  fileName?: string | null;
  requirements?: TenderRequirement[];
  questions?: TenderQuestion[];
  criteria?: TenderCriterion[];
  dates?: TenderDates;
  pricing?: {
    lines: TenderPricingLine[];
    header?: number;
    cols?: Record<string, number>;
  };
  [key: string]: unknown;
};

export type TenderExportRecord = {
  t: string;
  by: string;
  format: string;
  questions: number;
  approved: number;
};

/* ---------------- questionnaire / bid ---------------- */

export type TenderQuestionnaire = {
  id: string;
  kind: TenderQuestionnaireKind;
  buyer: string;
  title: string;
  reference: string;
  submissionEmail: string;
  buyerContact: string;
  portalUrl: string;
  source: TenderQuestionnaireSource | string;
  fileName: string | null;
  fileId: string | null;
  received: string;
  due: string | null;
  owner: string;
  status: TenderQuestionnaireStatus | string;
  notes?: string;
  questions: TenderQuestion[];
  documents: TenderPackDocument[];
  requirements: TenderRequirement[];
  criteria: TenderCriterion[];
  dates: TenderDates;
  pricing: TenderPricing | null;
  priceTotals?: TenderPriceTotals;
  layout?: { header: number; answerCol: number };
  exports: TenderExportRecord[];
  submitted?: string;
  submittedVia?: string;
  submission?: {
    t: string;
    to: string;
    by: string;
    attachments: string[];
    mode: string;
    id?: string;
  };
  hist: TenderHistoryEntry[];
};

/* ---------------- library health, stats, gate ---------------- */

export type TenderLibraryHealth = {
  answers: number;
  approved: number;
  stale: string[];
  certificates: number;
  certsExpiring: string[];
  certsExpired: string[];
  policies: number;
  policiesOverdue: string[];
};

export type TenderStats = {
  open: number;
  dueSoon: number;
  questions: number;
  approved: number;
  accepted: number;
  draft: number;
  needsInput: number;
  blank: number;
  library: TenderLibraryHealth;
};

export type TenderCoverage = {
  n: number;
  approved: number;
  accepted: number;
  draft: number;
  needsInput: number;
  blank: number;
  pct: number;
  avgConf: number;
};

export type TenderGateIssue = {
  sev: "bad" | "warn";
  text: string;
};

export type TenderGateCheck = {
  ok: boolean;
  text: string;
};

export type TenderGateResult = {
  score: number;
  verdict: TenderGateVerdict;
  issues: TenderGateIssue[];
  checks: TenderGateCheck[];
};

export type TenderLimitUsage = {
  n: number;
  max: number | null;
  over: boolean;
  pct: number;
  unit: "words" | "chars";
};

export type TenderDraftResult = {
  answer: string;
  confidence: number;
  sources: TenderSourceHit[];
  type: TenderQuestionType;
  trimmed: boolean;
  usage: TenderLimitUsage;
  status: TenderQuestionStatus;
};

export type TenderSubmissionPackage = {
  to: string;
  subject: string;
  body: string;
  attachments: string[];
};

export type TenderCanSubmitResult = {
  ok: boolean;
  errs: string[];
};

/* ---------------- parse / document analysis helpers ---------------- */

export type TenderParsedRows = {
  questions: TenderQuestion[];
  header: number;
  answerCol: number;
};

export type TenderParagraph = {
  text?: string;
  table?: boolean;
  cells?: string[];
};

export type TenderAnalysedDocument = {
  name: string;
  source: string;
  kind: TenderDocumentKind | string;
  criteria: TenderCriterion[];
  dates: TenderDates;
  pricing?: {
    lines: TenderPricingLine[];
    header: number;
    cols: Record<string, number>;
  };
  questions?: TenderQuestion[];
  answerCol?: number;
  requirements?: TenderRequirement[];
};

export type TenderBidBlock =
  | { h1: string }
  | { h: string }
  | { p: string }
  | { meta: string };

/* ---------------- in-memory rules model ---------------- */

/** In-memory model snapshot for pure rules (no I/O). */
export type TenderRulesModel = {
  org: string;
  settings: TenderSettings;
  facts: TenderFacts;
  library: TenderLibrary;
  questionnaires: TenderQuestionnaire[];
  people?: TenderPerson[];
  log: TenderLogEntry[];
};
