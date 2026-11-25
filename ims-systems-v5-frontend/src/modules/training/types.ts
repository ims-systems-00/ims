/**
 * Training & Competency frontend types — aligned with `/api/v1/training`.
 */

export const TRAINING_EVIDENCE_TYPES = [
  "Certificate",
  "Attendance record",
  "Assessment",
  "Acknowledgement",
  "Licence / card",
  "Observation",
] as const;
export type TrainingEvidenceType = (typeof TRAINING_EVIDENCE_TYPES)[number];

export const TRAINING_RESULTS = [
  "Pass",
  "Pass with observations",
  "Fail",
  "Absent",
] as const;
export type TrainingResult = (typeof TRAINING_RESULTS)[number];

export const TRAINING_PERSON_STATUSES = [
  "Active",
  "Leaver",
  "Pre-start",
] as const;
export type TrainingPersonStatus = (typeof TRAINING_PERSON_STATUSES)[number];

export const TRAINING_SESSION_STATUSES = [
  "Planned",
  "Completed",
  "Cancelled",
] as const;
export type TrainingSessionStatus = (typeof TRAINING_SESSION_STATUSES)[number];

export const TRAINING_RSVP_STATUSES = [
  "accepted",
  "declined",
  "tentative",
] as const;
export type TrainingRsvpStatus = (typeof TRAINING_RSVP_STATUSES)[number];

export const TRAINING_CELL_STATES = [
  "ok",
  "soon",
  "over",
  "none",
  "grace",
  "na",
] as const;
export type TrainingCellState = (typeof TRAINING_CELL_STATES)[number];

export const TRAINING_REQUIREMENT_LEVELS = [
  "mandatory",
  "desirable",
  "exempt",
] as const;
export type TrainingRequirementLevel =
  (typeof TRAINING_REQUIREMENT_LEVELS)[number];

export type TrainingHistoryEntry = {
  t: string;
  by: string;
  what: string;
};

export type TrainingLogEntry = {
  t: string;
  by: string;
  what: string;
};

export type TrainingQuizQuestion = {
  q: string;
  opts: string[];
  a: number;
};

export type TrainingExemption = {
  cid: string;
  reason: string;
  by: string;
  date: string;
};

export type TrainingAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  fileId: string | null;
  url: string | null;
  shared: boolean;
  note: string;
  by: string;
  t: string;
};

export type TrainingInviteLog = {
  personId: string;
  to: string;
  status: "sent" | "no-email" | "error";
  t: string;
  by?: string;
  error?: string;
};

export type TrainingRsvpEntry = {
  status: TrainingRsvpStatus;
  note: string;
  t: string;
};

export type TrainingCompetency = {
  id: string;
  organizationId: string;
  key: string;
  name: string;
  months: number;
  evidence: TrainingEvidenceType;
  basis: string;
  covers: string[];
  quiz: TrainingQuizQuestion[];
  description: string;
  provider: string;
  archived: boolean;
  custom: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TrainingRole = {
  id: string;
  organizationId: string;
  key: string;
  name: string;
  mandatory: string[];
  desirable: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type TrainingPerson = {
  id: string;
  organizationId: string;
  name: string;
  roles: string[];
  site: string;
  manager: string;
  start: string;
  email: string;
  status: TrainingPersonStatus;
  end: string;
  extra: string[];
  exempt: TrainingExemption[];
  external: boolean;
  company: string;
  userId: string | null;
  hist: TrainingHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type TrainingRecord = {
  id: string;
  organizationId: string;
  personId: string;
  cid: string;
  date: string;
  result: Exclude<TrainingResult, "Absent">;
  provider: string;
  ref: string;
  fileId: string | null;
  verifiedBy: string;
  note: string;
  toVerify: boolean;
  t: string;
  createdAt: string;
  updatedAt: string;
};

export type TrainingSession = {
  id: string;
  organizationId: string;
  cid: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  trainer: string;
  provider: string;
  cost: number;
  note: string;
  attendees: string[];
  materials: TrainingAttachment[];
  outputs: TrainingAttachment[];
  invites: TrainingInviteLog[];
  rsvp: Record<string, TrainingRsvpEntry>;
  status: TrainingSessionStatus;
  cancelReason: string;
  completedBy: string | null;
  completedAt: string | null;
  createdBy: string;
  createdOn: string;
  createdAt: string;
  updatedAt: string;
};

export type TrainingSettings = {
  id: string;
  organizationId: string;
  orgName: string;
  leadDays: number;
  inductionDays: number;
  siteLabel: string;
  sites: string[];
  providers: string[];
  allowSelfUpload: boolean;
  requireVerification: boolean;
  selfTokenDays: number;
  reminderDays: number[];
  inviteSubject: string;
  inviteBody: string;
  organiserEmail: string;
  log: TrainingLogEntry[];
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCompetencyInput = {
  key?: string;
  name: string;
  months: number;
  evidence: TrainingEvidenceType;
  basis?: string;
  covers?: string[];
  quiz?: TrainingQuizQuestion[];
  description?: string;
  provider?: string;
};

export type UpdateCompetencyInput = Partial<CreateCompetencyInput> & {
  archived?: boolean;
};

export type CreateRoleInput = {
  key?: string;
  name: string;
  mandatory?: string[];
  desirable?: string[];
  description?: string;
};

export type UpdateRoleInput = Partial<CreateRoleInput>;

export type CreatePersonInput = {
  name: string;
  roles?: string[];
  site: string;
  manager?: string;
  start?: string;
  email?: string;
  status?: TrainingPersonStatus;
  extra?: string[];
  external?: boolean;
  company?: string;
  userId?: string | null;
};

export type UpdatePersonInput = Partial<CreatePersonInput> & {
  end?: string;
};

export type CreateExternalPersonInput = {
  name: string;
  email: string;
  company?: string;
};

export type CreateRecordInput = {
  personId: string;
  cid: string;
  date?: string;
  result?: Exclude<TrainingResult, "Absent">;
  provider?: string;
  ref?: string;
  fileId?: string | null;
  note?: string;
};

export type CreateSessionInput = {
  cid: string;
  date: string;
  time?: string;
  duration?: number;
  location?: string;
  trainer?: string;
  provider?: string;
  cost?: number;
  note?: string;
  attendees?: string[];
};

export type UpdateSessionInput = Partial<CreateSessionInput>;

export type SessionOutcome = {
  result?: TrainingResult;
  ref?: string;
  fileId?: string | null;
  note?: string;
};

export type UpdateTrainingSettingsInput = {
  orgName?: string;
  leadDays?: number;
  inductionDays?: number;
  siteLabel?: string;
  sites?: string[];
  providers?: string[];
  allowSelfUpload?: boolean;
  requireVerification?: boolean;
  selfTokenDays?: number;
  reminderDays?: number[];
  inviteSubject?: string;
  inviteBody?: string;
  organiserEmail?: string;
};

export type TrainingOverview = {
  peopleActive: number;
  peopleLeavers: number;
  competencies: number;
  roles: number;
  gapsMissing: number;
  gapsOver: number;
  gapsSoon: number;
  sessionsPlanned: number;
  readinessOk: number;
  readinessTotal: number;
  compliantPeople: number;
};

export type PersonSummary = {
  total: number;
  ok: number;
  soon: number;
  over: number;
  none: number;
  grace: number;
  compliant: boolean;
};

export type TrainingRequirement = {
  cid: string;
  level: TrainingRequirementLevel;
  exempt: TrainingExemption | null;
  comp: TrainingCompetency;
};

export type MatrixCell = {
  req: TrainingRequirement;
  st: TrainingCellState;
  rec: TrainingRecord | null;
  next: string | null;
  days: number | null;
  reason?: string;
};

export type MatrixPersonRow = {
  person: TrainingPerson;
  summary: PersonSummary;
  cells: MatrixCell[];
};

export type TrainingMatrix = {
  competencies: TrainingCompetency[];
  roles: TrainingRole[];
  people: MatrixPersonRow[];
};

export type TrainingGapItem = {
  personId: string;
  person: string;
  cid: string;
  competency: string;
  st: TrainingCellState;
  next: string | null;
  days: number | null;
};

export type TrainingPlanGroup = {
  cid: string;
  competency: string;
  soonest: string | null;
  people: string[];
  unbooked: string[];
};

export type TrainingReadinessCheck = {
  id: string;
  ok: boolean;
  text: string;
  basis: string;
  tag: string;
};

export type SelfTokenResult = {
  token: string;
  url: string;
  expiresInDays: number;
};

export type TrainingSelfView = {
  organizationId: string;
  orgName: string;
  person: TrainingPerson;
  summary: PersonSummary;
  cells: MatrixCell[];
  booked: TrainingSession[];
  settings: {
    allowSelfUpload: boolean;
    requireVerification: boolean;
  };
  competencies: TrainingCompetency[];
};

export type TrainingRsvpView = {
  organizationId: string;
  orgName: string;
  session: TrainingSession;
  person: TrainingPerson;
  competency: TrainingCompetency | null;
  current: TrainingRsvpEntry | null;
  materials: TrainingAttachment[];
};

export type ListPeopleParams = {
  status?: TrainingPersonStatus;
  site?: string;
  role?: string;
  search?: string;
  gapsOnly?: boolean;
};

export type TrainingFileMeta = {
  Name: string;
  Key?: string;
  key?: string;
  Bucket: string;
  Size?: number;
};

export const TRAINING_HUB_VIEWS = [
  "overview",
  "matrix",
  "people",
  "plan",
  "sessions",
  "courses",
  "roles",
  "auditor",
  "settings",
  "log",
] as const;
export type TrainingHubView = (typeof TRAINING_HUB_VIEWS)[number];
