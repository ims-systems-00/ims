/**
 * Tender Autopilot frontend types — aligned with `/api/v1/tender`.
 */

export const TENDER_HUB_VIEWS = [
  "inbox",
  "library",
  "evidence",
  "facts",
  "audit",
  "settings",
  "auditor",
] as const;
export type TenderHubView = (typeof TENDER_HUB_VIEWS)[number];

export const TENDER_BID_TABS = [
  "overview",
  "pack",
  "requirements",
  "questions",
  "pricing",
  "submit",
] as const;
export type TenderBidTab = (typeof TENDER_BID_TABS)[number];

export const TENDER_VIEW_LABELS: Record<TenderHubView, string> = {
  inbox: "Inbox",
  library: "Library",
  evidence: "Evidence",
  facts: "Facts",
  audit: "Audit log",
  settings: "Settings",
  auditor: "Auditor pack",
};

export const TENDER_BID_TAB_LABELS: Record<TenderBidTab, string> = {
  overview: "Overview",
  pack: "Pack",
  requirements: "Requirements",
  questions: "Questions",
  pricing: "Pricing",
  submit: "Submit",
};

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

export const TENDER_GATE_VERDICTS = ["bid", "review", "no-bid-risk"] as const;
export type TenderGateVerdict = (typeof TENDER_GATE_VERDICTS)[number];

export const TENDER_LIBRARY_KINDS = [
  "answers",
  "certificates",
  "policies",
  "services",
  "cases",
  "rates",
] as const;
export type TenderLibraryKind = (typeof TENDER_LIBRARY_KINDS)[number];

export const TENDER_LIBRARY_SUBTABS = [
  "answers",
  "services",
  "cases",
  "rates",
] as const;
export type TenderLibrarySubtab = (typeof TENDER_LIBRARY_SUBTABS)[number];

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

export type TenderFileMeta = {
  Name: string;
  Key?: string;
  key?: string;
  Bucket: string;
  Size?: number;
};

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

export type TenderFacts = Record<string, string>;

export type TenderSettingsResponse = TenderSettings & {
  facts: TenderFacts;
};

export type UpdateTenderSettingsInput = Partial<TenderSettings>;

export type TenderEvidenceRef = {
  kind: string;
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

export type UpsertAnswerInput = {
  id?: string;
  question: string;
  answer?: string;
  tags?: string[];
  standards?: string[];
  owner?: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewBy?: string;
  evidence?: TenderEvidenceRef[];
};

export type UpsertCertificateInput = {
  id?: string;
  name: string;
  body?: string;
  number?: string;
  standard?: string;
  scope?: string;
  issued?: string;
  expires?: string;
  fileId?: string | null;
  fileName?: string | null;
  fileMeta?: TenderFileMeta | null;
};

export type UpsertPolicyInput = {
  id?: string;
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
};

export type UpsertServiceInput = {
  id?: string;
  name: string;
  description?: string;
  method?: string;
  people?: string[];
  tags?: string[];
};

export type UpsertCaseInput = {
  id?: string;
  client: string;
  title: string;
  sector?: string;
  year?: string;
  value?: string;
  summary?: string;
  outcome?: string;
  tags?: string[];
};

export type UpsertRateInput = {
  id?: string;
  item: string;
  unit?: string;
  rate: number;
  category?: string;
};

export type TenderSourceHit = {
  kind: string;
  id: string;
  label: string;
  score: number;
};

export type TenderResponseLimit = {
  kind: "words" | "chars" | "pages";
  n: number;
  spaces: "incl" | "excl" | null;
  text?: string;
  clean?: string;
  inherited?: boolean;
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
  docId?: string;
};

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
  kind?: string;
  name?: string;
  source?: string;
  fileId?: string | null;
  fileName?: string | null;
  requirements?: TenderRequirement[];
  questions?: TenderQuestion[];
  criteria?: TenderCriterion[];
  dates?: TenderDates;
  [key: string]: unknown;
};

export type TenderExportRecord = {
  t: string;
  by: string;
  format: string;
  questions: number;
  approved: number;
};

export type TenderQuestionnaire = {
  id: string;
  kind: string;
  buyer: string;
  title: string;
  reference: string;
  submissionEmail: string;
  buyerContact: string;
  portalUrl: string;
  source: string;
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
  exports: TenderExportRecord[];
  submitted?: string;
  submittedVia?: string;
  hist: TenderHistoryEntry[];
};

export type UpdateBidInput = {
  buyer?: string;
  title?: string;
  reference?: string;
  submissionEmail?: string;
  buyerContact?: string;
  portalUrl?: string;
  due?: string | null;
  owner?: string;
  notes?: string;
  kind?: string;
  status?: string;
};

export type CreateQuestionnaireInput = {
  text?: string;
  parsed?: {
    questions: Record<string, unknown>[];
    header?: number;
    answerCol?: number;
  };
  meta?: {
    buyer?: string;
    title?: string;
    reference?: string;
    submissionEmail?: string;
    buyerContact?: string;
    portalUrl?: string;
    source?: string;
    fileName?: string | null;
    fileId?: string | null;
    due?: string | null;
    owner?: string;
    kind?: string;
    allowEmpty?: boolean;
  };
  draft?: boolean;
};

export type ParseUploadInput = {
  name: string;
  data: string;
};

export type ParseUploadResult = {
  questions?: TenderQuestion[];
  header?: number;
  answerCol?: number;
  name?: string;
  source?: string;
  kind?: string;
  criteria?: TenderCriterion[];
  dates?: TenderDates;
  requirements?: TenderRequirement[];
  pricing?: {
    lines: TenderPricingLine[];
    header?: number;
    cols?: Record<string, number>;
  };
  [key: string]: unknown;
};

export type AddDocumentInput = {
  name?: string;
  data?: string;
  doc?: Record<string, unknown>;
  draft?: boolean;
  fileId?: string | null;
  fileName?: string | null;
};

export type AssessRequirementInput = {
  status?: TenderRequirementStatus;
  note?: string;
  evidence?: TenderEvidenceRef[];
  level?: TenderRequirementLevel;
};

export type SetPricingInput = Partial<TenderPricing> & {
  lines?: Array<Partial<TenderPricingLine> & { description: string }>;
  /** When true, fill missing rates from the library (backend `suggest`). */
  suggest?: boolean;
};

export type SetAnswerInput = {
  answer?: string;
  status?: TenderQuestionStatus;
  type?: TenderQuestionType;
  assignee?: string | null;
  note?: string;
  confidence?: number;
};

export type DraftQuestionnaireInput = {
  only?: string[];
};

export type ApproveInput = {
  questionIds?: string[] | null;
};

export type SubmitInput = {
  force?: boolean;
  cc?: string;
};

export type MarkSubmittedInput = {
  how?: string;
};

export type StandaloneDraftInput = {
  question: string;
  wordLimit?: number | null;
};

export type FileUploadUrlInput = {
  fileName: string;
  contentType?: string;
  fileSize?: number;
};

export type FileUploadUrlResult = {
  uploadUrl?: string;
  fileId?: string;
  key?: string;
  [key: string]: unknown;
};

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

export type TenderCanSubmitResult = {
  ok: boolean;
  errs: string[];
};

export type TenderGateResponse = TenderGateResult & {
  submit: TenderCanSubmitResult;
};

export type TenderDraftResult = {
  answer: string;
  confidence: number;
  sources: TenderSourceHit[];
  type: TenderQuestionType;
  trimmed: boolean;
  usage: {
    n: number;
    max: number | null;
    over: boolean;
    pct: number;
    unit: "words" | "chars";
  };
  status: TenderQuestionStatus;
};

export type TenderSubmissionResult = {
  to?: string;
  subject?: string;
  body?: string;
  attachments?: string[];
  [key: string]: unknown;
};
