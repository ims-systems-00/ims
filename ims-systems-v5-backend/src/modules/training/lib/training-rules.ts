/**
 * Pure Training & Competency rules (ported from prototype rules.js).
 * No I/O — operate on a TrainingModel snapshot.
 */
import { ValidationAppError, NotFoundError, ForbiddenError } from "../../../shared";
import type {
  CompetentResult,
  CreateCompetencyInput,
  CreateExternalPersonInput,
  CreatePersonInput,
  CreateRecordInput,
  CreateRoleInput,
  CreateSessionInput,
  SessionOutcome,
  TrainingAttachment,
  TrainingCellState,
  TrainingCompetency,
  TrainingHistoryEntry,
  TrainingInviteLog,
  TrainingLogEntry,
  TrainingModel,
  TrainingPerson,
  TrainingQuizQuestion,
  TrainingRecord,
  TrainingRequirementLevel,
  TrainingRole,
  TrainingRsvpStatus,
  TrainingSession,
  TrainingSettings,
  UpdateSessionInput,
  UpdateTrainingSettingsInput,
} from "../types";
import {
  TRAINING_EVIDENCE_TYPES,
  TRAINING_PERSON_STATUSES,
  TRAINING_RESULTS,
  TRAINING_RSVP_STATUSES,
} from "../types";

export const DEFAULT_SETTINGS: TrainingModel["settings"] = {
  leadDays: 60,
  inductionDays: 14,
  siteLabel: "Site",
  sites: [],
  requireVerification: true,
  allowSelfUpload: true,
  selfTokenDays: 90,
  providers: [],
  inviteSubject: "{{course}} · {{date}} · {{org}}",
  inviteBody:
    "Hello {{name}},\n\nYou are invited to {{course}} on {{date}}{{time}}{{location}}.\n{{materials}}\nPlease let us know whether you can attend:\n  Accept:  {{accept}}\n  Decline: {{decline}}\n\n{{org}} · Training & competency",
  organiserEmail: "training@ims-os.example",
  reminderDays: [14, 1],
};

export type DefaultCompetencySeed = {
  key: string;
  name: string;
  months: number;
  evidence: (typeof TRAINING_EVIDENCE_TYPES)[number];
  basis: string;
  covers: string[];
  quiz?: TrainingQuizQuestion[];
};

export const DEFAULT_COMPETENCIES: DefaultCompetencySeed[] = [
  {
    key: "induction",
    name: "Company induction",
    months: 0,
    evidence: "Attendance record",
    basis: "ISO 9001 7.2 · 45001 7.3",
    covers: [],
  },
  {
    key: "hs-awareness",
    name: "H&S awareness",
    months: 36,
    evidence: "Certificate",
    basis: "HSWA 1974 s.2 · ISO 45001 7.2",
    covers: [],
  },
  {
    key: "fire",
    name: "Fire safety & evacuation",
    months: 12,
    evidence: "Attendance record",
    basis: "RRFSO 2005 art. 21",
    covers: [],
  },
  {
    key: "manual-handling",
    name: "Manual handling",
    months: 36,
    evidence: "Certificate",
    basis: "MHOR 1992 reg 4",
    covers: [],
  },
  {
    key: "first-aid",
    name: "First aid at work",
    months: 36,
    evidence: "Certificate",
    basis: "First Aid Regs 1981",
    covers: [],
  },
  {
    key: "coshh",
    name: "COSHH awareness",
    months: 36,
    evidence: "Certificate",
    basis: "COSHH 2002 reg 12",
    covers: [],
  },
  {
    key: "face-fit",
    name: "RPE face-fit test",
    months: 24,
    evidence: "Certificate",
    basis: "COSHH reg 7 · HSE INDG479",
    covers: ["PPE & RPE"],
  },
  {
    key: "slinger",
    name: "Slinger / signaller",
    months: 60,
    evidence: "Licence / card",
    basis: "LOLER 1998 reg 8 · ACoP",
    covers: ["Lifting equipment"],
  },
  {
    key: "crane-op",
    name: "Overhead crane operator",
    months: 60,
    evidence: "Licence / card",
    basis: "LOLER 1998 reg 8 · PUWER reg 9",
    covers: ["Lifting equipment"],
  },
  {
    key: "flt",
    name: "Forklift (counterbalance)",
    months: 36,
    evidence: "Licence / card",
    basis: "PUWER reg 9 · L117",
    covers: ["Lifting equipment", "Vehicles"],
  },
  {
    key: "press-brake",
    name: "Press brake operation",
    months: 0,
    evidence: "Assessment",
    basis: "PUWER reg 9",
    covers: ["Production machinery"],
  },
  {
    key: "cnc",
    name: "CNC machining centre",
    months: 0,
    evidence: "Assessment",
    basis: "PUWER reg 9 · ISO 9001 7.2",
    covers: ["Production machinery"],
  },
  {
    key: "measuring",
    name: "Measuring equipment & calibration awareness",
    months: 36,
    evidence: "Assessment",
    basis: "ISO 9001 7.1.5 / 7.2",
    covers: ["Measuring & test equipment"],
  },
  {
    key: "competent-insp",
    name: "Competent person · lifting equipment examination",
    months: 36,
    evidence: "Certificate",
    basis: "LOLER reg 9 · LEEA",
    covers: ["Lifting equipment"],
  },
  {
    key: "driver",
    name: "Driving licence check",
    months: 12,
    evidence: "Licence / card",
    basis: "Road Traffic Act · FORS",
    covers: ["Vehicles"],
  },
  {
    key: "ig",
    name: "Information security awareness",
    months: 12,
    evidence: "Assessment",
    basis: "ISO 27001 A.6.3 · DSPT",
    covers: [],
  },
  {
    key: "gdpr",
    name: "Data protection (UK GDPR)",
    months: 12,
    evidence: "Assessment",
    basis: "UK GDPR art. 39 · ICO",
    covers: [],
  },
  {
    key: "env",
    name: "Environmental awareness & spill response",
    months: 36,
    evidence: "Attendance record",
    basis: "ISO 14001 7.2 / 7.3",
    covers: ["Environmental plant"],
  },
  {
    key: "internal-auditor",
    name: "Internal auditor",
    months: 0,
    evidence: "Certificate",
    basis: "ISO 9001 9.2 · ISO 19011",
    covers: [],
  },
  {
    key: "pol-hs",
    name: "Policy · Health & safety (read & understood)",
    months: 12,
    evidence: "Acknowledgement",
    basis: "ISO 45001 5.2 / 7.3",
    covers: ["policy:hs"],
    quiz: [
      {
        q: "Who is responsible for health and safety at work?",
        opts: ["Only the H&S manager", "Everyone", "Only supervisors"],
        a: 1,
      },
      {
        q: "You must report hazards:",
        opts: ["Only if someone is hurt", "As soon as you notice them", "At the annual review"],
        a: 1,
      },
    ],
  },
  {
    key: "pol-quality",
    name: "Policy · Quality (read & understood)",
    months: 12,
    evidence: "Acknowledgement",
    basis: "ISO 9001 5.2 / 7.3",
    covers: ["policy:quality"],
    quiz: [
      {
        q: "Quality is everyone's responsibility.",
        opts: ["True", "False"],
        a: 0,
      },
    ],
  },
  {
    key: "pol-infosec",
    name: "Policy · Information security (read & understood)",
    months: 12,
    evidence: "Acknowledgement",
    basis: "ISO 27001 5.2 / A.5.1",
    covers: ["policy:infosec"],
    quiz: [
      {
        q: "You should share passwords with colleagues when asked.",
        opts: ["Yes", "No"],
        a: 1,
      },
    ],
  },
  {
    key: "safeguarding",
    name: "Safeguarding adults (L2)",
    months: 36,
    evidence: "Certificate",
    basis: "Care Act 2014 · CQC",
    covers: [],
  },
];

export type DefaultRoleSeed = {
  key: string;
  name: string;
  mandatory: string[];
  desirable: string[];
};

export const DEFAULT_ROLES: DefaultRoleSeed[] = [
  {
    key: "all",
    name: "All staff",
    mandatory: [
      "induction",
      "hs-awareness",
      "fire",
      "ig",
      "gdpr",
      "pol-hs",
      "pol-quality",
      "pol-infosec",
    ],
    desirable: [],
  },
  {
    key: "operator",
    name: "Machine operator",
    mandatory: ["manual-handling", "coshh", "measuring"],
    desirable: ["first-aid"],
  },
  {
    key: "press-brake-op",
    name: "Press brake operator",
    mandatory: ["press-brake"],
    desirable: [],
  },
  {
    key: "cnc-op",
    name: "CNC operator",
    mandatory: ["cnc"],
    desirable: [],
  },
  {
    key: "welder",
    name: "Welder",
    mandatory: ["coshh", "face-fit", "manual-handling"],
    desirable: [],
  },
  {
    key: "crane",
    name: "Crane user",
    mandatory: ["slinger", "crane-op"],
    desirable: [],
  },
  {
    key: "flt-driver",
    name: "Forklift driver",
    mandatory: ["flt"],
    desirable: [],
  },
  {
    key: "driver",
    name: "Driver",
    mandatory: ["driver"],
    desirable: [],
  },
  {
    key: "inspector",
    name: "Quality inspector",
    mandatory: ["measuring"],
    desirable: ["internal-auditor"],
  },
  {
    key: "competent-person",
    name: "Competent person · lifting",
    mandatory: ["competent-insp", "slinger"],
    desirable: [],
  },
  {
    key: "manager",
    name: "Manager",
    mandatory: ["internal-auditor"],
    desirable: ["first-aid"],
  },
  {
    key: "first-aider",
    name: "Appointed first aider",
    mandatory: ["first-aid"],
    desirable: [],
  },
  {
    key: "yard",
    name: "Yard & environmental",
    mandatory: ["env"],
    desirable: [],
  },
];

export function isoDate(d: Date | string = new Date()): string {
  const x = d instanceof Date ? d : new Date(d);
  return (
    x.getUTCFullYear() +
    "-" +
    String(x.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(x.getUTCDate()).padStart(2, "0")
  );
}

export function todayUtc(): Date {
  const t = new Date();
  return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
}

export function addMonths(d: Date | string, n: number): Date {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}

export function addDays(d: Date | string, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function daysUntil(d: Date | string, from?: Date): number {
  return Math.round(
    (new Date(d).getTime() - (from || todayUtc()).getTime()) / 864e5
  );
}

export function slug(n: string): string {
  return (
    String(n || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "item"
  );
}

export function histStamp(now?: Date): string {
  return (now || new Date()).toISOString().slice(0, 16);
}

function byId<T extends { id: string }>(arr: T[] | undefined, id: string): T | undefined {
  return (arr || []).find((x) => x.id === id);
}

function byKey<T extends { key: string }>(
  arr: T[] | undefined,
  key: string
): T | undefined {
  return (arr || []).find((x) => x.key === key);
}

/** Resolve competency by Mongo id or stable key. */
export function findCompetency(
  M: TrainingModel,
  idOrKey: string
): TrainingCompetency | undefined {
  return byId(M.competencies, idOrKey) || byKey(M.competencies, idOrKey);
}

export function findRole(
  M: TrainingModel,
  idOrKey: string
): TrainingRole | undefined {
  return byId(M.roles, idOrKey) || byKey(M.roles, idOrKey);
}

export function activePeople(M: TrainingModel): TrainingPerson[] {
  return (M.people || []).filter((p) => p.status !== "Leaver");
}

export type Requirement = {
  cid: string;
  level: TrainingRequirementLevel;
  exempt: TrainingPerson["exempt"][number] | null;
  comp: TrainingCompetency;
};

export function requirements(
  M: TrainingModel,
  person: TrainingPerson
): Requirement[] {
  const out = new Map<string, TrainingRequirementLevel>();
  const roleKeys = ["all", ...(person.roles || [])];
  for (const rid of roleKeys) {
    const r = findRole(M, rid);
    if (!r) continue;
    for (const c of r.mandatory || []) out.set(c, "mandatory");
    for (const c of r.desirable || []) {
      if (!out.has(c)) out.set(c, "desirable");
    }
  }
  for (const c of person.extra || []) {
    if (!out.has(c)) out.set(c, "mandatory");
  }
  const ex = new Map((person.exempt || []).map((e) => [e.cid, e]));
  return [...out.entries()]
    .map(([cid, level]) => {
      const comp = findCompetency(M, cid);
      return {
        cid: comp?.id || cid,
        level: (ex.has(comp?.id || cid) || ex.has(cid)
          ? "exempt"
          : level) as TrainingRequirementLevel,
        exempt: ex.get(comp?.id || cid) || ex.get(cid) || null,
        comp: comp!,
      };
    })
    .filter((x) => x.comp && !x.comp.archived);
}

export function latestRecord(
  M: TrainingModel,
  personId: string,
  cid: string
): TrainingRecord | null {
  const comp = findCompetency(M, cid);
  const ids = new Set([cid, comp?.id, comp?.key].filter(Boolean) as string[]);
  return (
    (M.records || [])
      .filter(
        (r) =>
          r.personId === personId &&
          ids.has(r.cid) &&
          r.result !== "Fail" &&
          !r.toVerify
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null
  );
}

export type CellResult = {
  st: TrainingCellState;
  rec: TrainingRecord | null;
  next: string | null;
  days: number | null;
  reason?: string;
};

export function cell(
  M: TrainingModel,
  person: TrainingPerson,
  req: Requirement,
  now?: Date
): CellResult {
  const at = now || todayUtc();
  const lead = M.settings?.leadDays ?? 60;
  const rec = latestRecord(M, person.id, req.cid);
  if (req.level === "exempt") {
    return {
      st: "na",
      rec,
      next: null,
      days: null,
      reason: req.exempt?.reason,
    };
  }
  if (!rec) {
    const inductionDays = M.settings?.inductionDays ?? 14;
    const inStart =
      person.start && daysUntil(person.start, at) > -inductionDays;
    return {
      st: inStart ? "grace" : "none",
      rec: null,
      next: null,
      days: null,
    };
  }
  const expires = req.comp.months
    ? isoDate(addMonths(new Date(rec.date), req.comp.months))
    : null;
  const d = expires ? daysUntil(expires, at) : null;
  const st: TrainingCellState = !expires
    ? "ok"
    : (d as number) < 0
      ? "over"
      : (d as number) <= lead
        ? "soon"
        : "ok";
  return { st, rec, next: expires, days: d };
}

export type MatrixCell = CellResult & { req: Requirement };

export function matrixRow(
  M: TrainingModel,
  person: TrainingPerson,
  now?: Date
): MatrixCell[] {
  return requirements(M, person).map((req) => ({
    req,
    ...cell(M, person, req, now),
  }));
}

const SEVERITY: Record<string, number> = {
  none: 0,
  over: 1,
  soon: 2,
  grace: 3,
};

export type GapItem = {
  person: TrainingPerson;
  comp: TrainingCompetency;
  st: TrainingCellState;
  next: string | null;
  days: number | null;
};

export function gaps(M: TrainingModel, now?: Date): GapItem[] {
  const out: GapItem[] = [];
  for (const p of activePeople(M)) {
    for (const c of matrixRow(M, p, now)) {
      if (c.st !== "ok" && c.req.level === "mandatory") {
        out.push({
          person: p,
          comp: c.req.comp,
          st: c.st,
          next: c.next,
          days: c.days,
        });
      }
    }
  }
  return out.sort(
    (a, b) =>
      (SEVERITY[a.st] ?? 9) - (SEVERITY[b.st] ?? 9) ||
      ((a.next || "0") < (b.next || "0") ? -1 : 1)
  );
}

export function personSummary(
  M: TrainingModel,
  person: TrainingPerson,
  now?: Date
) {
  const row = matrixRow(M, person, now);
  const m = row.filter((c) => c.req.level === "mandatory");
  return {
    total: m.length,
    ok: m.filter((c) => c.st === "ok").length,
    soon: m.filter((c) => c.st === "soon").length,
    over: m.filter((c) => c.st === "over").length,
    none: m.filter((c) => c.st === "none").length,
    grace: m.filter((c) => c.st === "grace").length,
    compliant: m.every((c) => c.st === "ok" || c.st === "soon"),
  };
}

export function isCompetent(
  M: TrainingModel,
  personId: string,
  covers: string,
  now?: Date
): CompetentResult {
  const p = byId(M.people, personId);
  if (!p || p.status === "Leaver") {
    return { ok: false, reason: "not an active person" };
  }
  const comps = (M.competencies || []).filter((c) =>
    (c.covers || []).includes(covers)
  );
  if (!comps.length) {
    return { ok: true, reason: "no competency defined for " + covers };
  }
  const held = comps.filter((c) => {
    const r = latestRecord(M, personId, c.id);
    if (!r) return false;
    if (!c.months) return true;
    return daysUntil(isoDate(addMonths(new Date(r.date), c.months)), now) >= 0;
  });
  return held.length
    ? {
        ok: true,
        reason: "holds " + held.map((c) => c.name).join(", "),
        competencies: held.map((c) => c.id),
      }
    : {
        ok: false,
        reason: "no valid " + comps.map((c) => c.name).join(" / "),
        required: comps.map((c) => c.id),
      };
}

export function validateRecord(
  M: TrainingModel,
  input: CreateRecordInput,
  now?: Date
): { date: string; comp: TrainingCompetency } {
  if (!byId(M.people, input.personId)) {
    throw new NotFoundError("Person not found");
  }
  const c = findCompetency(M, input.cid);
  if (!c) {
    throw new ValidationAppError("Unknown competency", {
      code: "invalid_competency",
    });
  }
  const result = input.result || "Pass";
  if (!TRAINING_RESULTS.includes(result as (typeof TRAINING_RESULTS)[number])) {
    throw new ValidationAppError(
      "Result must be one of " + TRAINING_RESULTS.join(", "),
      { code: "invalid_result" }
    );
  }
  const date = input.date || isoDate(now || todayUtc());
  if (new Date(date) > addDays(now || todayUtc(), 1)) {
    throw new ValidationAppError("Date cannot be in the future", {
      code: "invalid_date",
    });
  }
  if (
    c.evidence === "Certificate" &&
    !(input.ref || input.fileId) &&
    result !== "Fail"
  ) {
    throw new ValidationAppError(
      `${c.name} needs a certificate reference or upload`,
      { code: "evidence_required" }
    );
  }
  return { date, comp: c };
}

export function appendPersonHistory(
  person: TrainingPerson,
  what: string,
  by?: string,
  now?: Date
): void {
  const entry: TrainingHistoryEntry = {
    t: histStamp(now),
    by: by || "system",
    what,
  };
  person.hist = [entry, ...(person.hist || [])];
}

export function appendLog(
  log: TrainingLogEntry[],
  what: string,
  by?: string,
  now?: Date
): TrainingLogEntry[] {
  const next = [
    { t: histStamp(now), by: by || "system", what },
    ...log,
  ];
  return next.slice(0, 500);
}

export function validatePerson(
  M: TrainingModel,
  p: Pick<
    TrainingPerson,
    "name" | "status" | "site" | "roles" | "email"
  >
): string[] {
  const pr: string[] = [];
  if (!p.name?.trim()) pr.push("name is required");
  if (!TRAINING_PERSON_STATUSES.includes(p.status)) pr.push("status: unknown");
  if (!p.site) pr.push("site is required");
  for (const r of p.roles || []) {
    if (!findRole(M, r)) pr.push("role: unknown " + r);
  }
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
    pr.push("email: invalid");
  }
  return pr;
}

export function validateCompetencyInput(input: CreateCompetencyInput): void {
  const pr: string[] = [];
  if (!input.name?.trim()) pr.push("name is required");
  const months = Number(input.months);
  if (!(months >= 0 && months <= 240)) {
    pr.push("renewal months must be 0–240 (0 = never expires)");
  }
  if (!TRAINING_EVIDENCE_TYPES.includes(input.evidence)) {
    pr.push("evidence must be one of " + TRAINING_EVIDENCE_TYPES.join(", "));
  }
  const quiz = Array.isArray(input.quiz) ? input.quiz : [];
  quiz.forEach((q, i) => {
    if (
      !q.q ||
      !Array.isArray(q.opts) ||
      q.opts.length < 2 ||
      !(q.a >= 0 && q.a < q.opts.length)
    ) {
      pr.push(
        `question ${i + 1}: needs text, 2+ options and a correct answer`
      );
    }
  });
  if (pr.length) throw new ValidationAppError(pr.join(" · "));
}

export function validateSettingsInput(
  current: TrainingModel["settings"],
  input: UpdateTrainingSettingsInput
): TrainingModel["settings"] {
  const S = { ...DEFAULT_SETTINGS, ...current };
  const pr: string[] = [];
  if (input.leadDays != null) {
    const v = Number(input.leadDays);
    if (!(v >= 0 && v <= 365)) pr.push("leadDays 0–365");
    else S.leadDays = v;
  }
  if (input.inductionDays != null) {
    const v = Number(input.inductionDays);
    if (!(v >= 0 && v <= 90)) pr.push("inductionDays 0–90");
    else S.inductionDays = v;
  }
  if (input.selfTokenDays != null) {
    const v = Number(input.selfTokenDays);
    if (!(v >= 1 && v <= 365)) pr.push("selfTokenDays 1–365");
    else S.selfTokenDays = v;
  }
  if (typeof input.siteLabel === "string") S.siteLabel = input.siteLabel;
  if (typeof input.inviteSubject === "string")
    S.inviteSubject = input.inviteSubject;
  if (typeof input.inviteBody === "string") S.inviteBody = input.inviteBody;
  if (typeof input.organiserEmail === "string")
    S.organiserEmail = input.organiserEmail;
  if (typeof input.allowSelfUpload === "boolean")
    S.allowSelfUpload = input.allowSelfUpload;
  if (typeof input.requireVerification === "boolean")
    S.requireVerification = input.requireVerification;
  if (Array.isArray(input.sites)) {
    S.sites = input.sites.map((x) => String(x).trim()).filter(Boolean);
  }
  if (Array.isArray(input.providers)) {
    S.providers = input.providers.map((x) => String(x).trim()).filter(Boolean);
  }
  if (Array.isArray(input.reminderDays)) {
    S.reminderDays = input.reminderDays
      .map(Number)
      .filter((n) => n >= 0 && n <= 90);
  }
  if (pr.length) throw new ValidationAppError(pr.join(" · "));
  return S;
}

export function rsvpOf(
  s: TrainingSession,
  pid: string
): TrainingRsvpStatus | "pending" | "not-invited" {
  const x = (s.rsvp || {})[pid];
  if (x) return x.status;
  return (s.invites || []).some((i) => i.personId === pid && i.status === "sent")
    ? "pending"
    : "not-invited";
}

export function rsvpSummary(s: TrainingSession) {
  const r = s.rsvp || {};
  const invited = new Set(
    (s.invites || []).filter((i) => i.status === "sent").map((i) => i.personId)
  );
  const out = {
    accepted: 0,
    declined: 0,
    tentative: 0,
    pending: 0,
    notInvited: 0,
  };
  for (const pid of s.attendees || []) {
    const x = r[pid];
    if (x) {
      if (x.status === "accepted") out.accepted++;
      else if (x.status === "declined") out.declined++;
      else if (x.status === "tentative") out.tentative++;
    } else if (invited.has(pid)) out.pending++;
    else out.notInvited++;
  }
  return out;
}

export type PlanGroup = {
  comp: TrainingCompetency;
  people: TrainingPerson[];
  soonest: string | null;
  unbooked: TrainingPerson[];
};

export function plan(M: TrainingModel, months = 3, now?: Date): PlanGroup[] {
  const at = now || todayUtc();
  const until = isoDate(addMonths(at, months));
  const need: Record<
    string,
    { comp: TrainingCompetency; people: TrainingPerson[]; soonest: string | null }
  > = {};
  for (const p of activePeople(M)) {
    for (const c of matrixRow(M, p, at)) {
      if (c.req.level !== "mandatory") continue;
      if (
        c.st === "none" ||
        c.st === "grace" ||
        c.st === "over" ||
        (c.next && c.next <= until)
      ) {
        const k = c.req.comp.id;
        need[k] = need[k] || {
          comp: c.req.comp,
          people: [],
          soonest: null,
        };
        need[k].people.push(p);
        if (!need[k].soonest || (c.next && c.next < need[k].soonest)) {
          need[k].soonest = c.next || isoDate(at);
        }
      }
    }
  }
  const booked = new Set(
    (M.sessions || [])
      .filter((s) => s.status === "Planned")
      .flatMap((s) =>
        s.attendees
          .filter(
            (pid) =>
              !(s.rsvp && s.rsvp[pid] && s.rsvp[pid].status === "declined")
          )
          .map((pid) => s.cid + ":" + pid)
      )
  );
  return Object.values(need)
    .map((n) => ({
      comp: n.comp,
      people: n.people,
      soonest: n.soonest,
      unbooked: n.people.filter((p) => !booked.has(n.comp.id + ":" + p.id)),
    }))
    .sort((a, b) => ((a.soonest || "0") < (b.soonest || "0") ? -1 : 1));
}

export type ReadinessCheck = {
  id: string;
  ok: boolean;
  text: string;
  basis: string;
  tag: string;
};

export function readiness(M: TrainingModel, now?: Date): ReadinessCheck[] {
  const at = now || todayUtc();
  const ppl = activePeople(M);
  const g = gaps(M, at);
  const inductionDays = M.settings?.inductionDays ?? 14;
  const starters = ppl.filter(
    (p) => p.start && daysUntil(p.start, at) < -inductionDays
  );
  const inductionComp = findCompetency(M, "induction");
  const inducted = starters.every(
    (p) => inductionComp && latestRecord(M, p.id, inductionComp.id)
  );
  const certs = (M.records || []).filter((r) => {
    const c = findCompetency(M, r.cid);
    return c && c.evidence === "Certificate" && r.result !== "Fail";
  });
  return [
    {
      id: "roles",
      ok: (M.roles || []).length > 0,
      text: "Competence requirements are defined per role",
      basis: "ISO 9001 7.2 a) · ISO 45001 7.2",
      tag: "7.2",
    },
    {
      id: "records",
      ok: !g.some(
        (x) => x.st === "none" && x.comp.evidence !== "Acknowledgement"
      ),
      text: "Every active person holds the mandatory competencies for their roles",
      basis: `${g.filter((x) => x.st === "none").length} missing`,
      tag: "7.2",
    },
    {
      id: "expiry",
      ok: !g.some((x) => x.st === "over"),
      text: "No expired mandatory training in use",
      basis: `${g.filter((x) => x.st === "over").length} expired`,
      tag: "7.2",
    },
    {
      id: "evidence",
      ok: certs.every((r) => r.ref || r.fileId),
      text: "Certificates are retained as evidence",
      basis: "ISO 9001 7.2 d) · 7.5.3",
      tag: "Records",
    },
    {
      id: "induction",
      ok: inducted,
      text: "New starters inducted within the induction window",
      basis: `${inductionDays} days · ISO 45001 7.3`,
      tag: "7.3",
    },
    {
      id: "policies",
      ok: ppl.every((p) =>
        matrixRow(M, p, at)
          .filter((c) => c.req.comp.evidence === "Acknowledgement")
          .every(
            (c) =>
              c.st === "ok" ||
              c.st === "soon" ||
              c.st === "grace" ||
              c.st === "na"
          )
      ),
      text: "Policies acknowledged by all staff within the year",
      basis: "ISO 9001 7.3 · 27001 A.5.1",
      tag: "7.3",
    },
    {
      id: "equipment",
      ok: ppl.every((p) =>
        (p.roles || []).every((r) => {
          const role = findRole(M, r);
          return (
            !role ||
            (role.mandatory || []).every((cid) => {
              const c = findCompetency(M, cid);
              if (!c || !c.covers.length || (p.exempt || []).some((e) => e.cid === c.id || e.cid === cid))
                return true;
              const st = cell(
                M,
                p,
                { cid: c.id, level: "mandatory", exempt: null, comp: c },
                at
              ).st;
              return st !== "over" && st !== "none";
            })
          );
        })
      ),
      text: "Nobody assigned to controlled equipment without a valid competence",
      basis: "PUWER reg 9 · LOLER reg 8",
      tag: "45001",
    },
    {
      id: "leavers",
      ok: (M.people || [])
        .filter((p) => p.status === "Leaver")
        .every((p) => p.end),
      text: "Leavers dated and removed from the matrix",
      basis: "ISO 27001 A.6.5",
      tag: "27001",
    },
    {
      id: "plan",
      ok: plan(M, 3, at).every((n) => n.unbooked.length === 0),
      text: "Training due in the next 90 days is booked",
      basis: "ISO 9001 7.2 b)",
      tag: "7.2",
    },
    {
      id: "trail",
      ok: (M.people || []).every((p) => p.hist && p.hist.length),
      text: "Training actions logged with who, when and what",
      basis: "Records · 7.5.3",
      tag: "Records",
    },
  ];
}

export type ReminderDue =
  | {
      kind: "session";
      days: number;
      sessionId: string;
      personId: string;
      rsvp: string;
    }
  | {
      kind: "expiring" | "expired";
      days: number;
      personId: string;
      cid: string;
      manager: string;
    };

export function remindersDue(M: TrainingModel, now?: Date): ReminderDue[] {
  const at = now || todayUtc();
  const S = { ...DEFAULT_SETTINGS, ...M.settings };
  const out: ReminderDue[] = [];
  for (const s of (M.sessions || []).filter((x) => x.status === "Planned")) {
    const d = daysUntil(s.date, at);
    if (S.reminderDays.includes(d)) {
      for (const pid of s.attendees) {
        const r = rsvpOf(s, pid);
        if (r !== "declined") {
          out.push({
            kind: "session",
            days: d,
            sessionId: s.id,
            personId: pid,
            rsvp: r,
          });
        }
      }
    }
  }
  for (const p of activePeople(M)) {
    for (const c of matrixRow(M, p, at)) {
      if (c.req.level !== "mandatory") continue;
      if (
        c.st === "soon" &&
        (c.days === S.leadDays || c.days === 14)
      ) {
        out.push({
          kind: "expiring",
          days: c.days as number,
          personId: p.id,
          cid: c.req.cid,
          manager: p.manager,
        });
      }
      if (c.st === "over" && c.days === -1) {
        out.push({
          kind: "expired",
          days: -1,
          personId: p.id,
          cid: c.req.cid,
          manager: p.manager,
        });
      }
    }
  }
  return out;
}

export function matrixCsv(M: TrainingModel, now?: Date): string {
  const comps = (M.competencies || []).filter((c) => !c.archived);
  const rows: string[][] = [
    ["Person", "Roles", "Site", ...comps.map((c) => c.name)],
  ];
  for (const p of activePeople(M)) {
    const row = matrixRow(M, p, now);
    rows.push([
      p.name,
      (p.roles || [])
        .map((r) => findRole(M, r)?.name)
        .filter(Boolean)
        .join("; "),
      p.site,
      ...comps.map((c) => {
        const x = row.find((y) => y.req.comp.id === c.id);
        if (!x) return "";
        if (x.st === "ok") return "OK" + (x.next ? " to " + x.next : "");
        if (x.st === "na") return "N/A";
        return x.st;
      }),
    ]);
  }
  return rows
    .map((r) =>
      r.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")
    )
    .join("\n");
}

export function renderTemplate(
  tpl: string,
  vars: Record<string, string>
): string {
  return String(tpl || "").replace(/\{\{(\w+)\}\}/g, (_m, k: string) =>
    vars[k] != null ? vars[k] : ""
  );
}

export function fmtDateLong(d: string): string {
  const x = new Date(d);
  return x.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function acknowledgePolicyAnswers(
  comp: TrainingCompetency,
  answers: number[] | undefined
): void {
  if (comp.evidence !== "Acknowledgement") {
    throw new ValidationAppError("Not an acknowledgement item", {
      code: "invalid_competency",
    });
  }
  const q = comp.quiz || [];
  if (q.length && (!answers || answers.length < q.length)) {
    throw new ValidationAppError("Answer all questions", {
      code: "quiz_required",
    });
  }
  const wrong = q.filter(
    (x, i) => answers && answers[i] != null && answers[i] !== x.a
  ).length;
  if (wrong) {
    throw new ValidationAppError(
      `${wrong} answer(s) incorrect — read the policy again`,
      { code: "quiz_failed" }
    );
  }
}

export function assertRsvp(
  session: TrainingSession,
  personId: string,
  status: string
): asserts status is TrainingRsvpStatus {
  if (!session.attendees.includes(personId)) {
    throw new ForbiddenError("Not invited to this session");
  }
  if (
    !TRAINING_RSVP_STATUSES.includes(status as TrainingRsvpStatus)
  ) {
    throw new ValidationAppError(
      "Response must be accepted, declined or tentative"
    );
  }
  if (session.status !== "Planned") {
    throw new ValidationAppError(
      "This session is " + session.status.toLowerCase()
    );
  }
}

export type { CreatePersonInput, CreateExternalPersonInput, CreateRoleInput, CreateSessionInput, UpdateSessionInput, SessionOutcome, TrainingAttachment, TrainingInviteLog, TrainingSettings };
