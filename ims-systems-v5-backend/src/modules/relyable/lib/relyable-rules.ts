/**
 * Relyable Standard v1.1 — pure scope, score, and module contribution rules.
 * Ported from the prototype (product rules only; no storage/IO).
 */
import type {
  RelyableApplicabilityState,
  RelyableAttrs,
  RelyableAttr,
  RelyableBand,
  RelyableCap,
  RelyableCapFacts,
  RelyableEvidenceStatus,
  RelyableExplainRow,
  RelyableFamily,
  RelyableModuleContribution,
  RelyableNextRisk,
  RelyableRaiseItItem,
  RelyableScope,
  RelyableSizeBand,
} from "../types";
import { RELYABLE_ATTRS } from "../types";

export const MODEL_VERSION = "2026.11";

export const BANDS: Array<[RelyableBand, number, string]> = [
  ["A", 850, "Assured"],
  ["B", 700, "Strong"],
  ["C", 550, "Developing"],
  ["D", 400, "At risk"],
  ["E", 0, "Unverified"],
];

const VF: Record<number, number> = { 3: 1.0, 2: 0.85, 1: 0.6, 0: 0.85 };
const DAY = 86_400_000;

export type EvidenceTypeDef = {
  dom: string;
  w: number;
  kind: "cert" | "periodic" | "event" | "public";
  halfLife?: number;
  core?: boolean;
  rule: (a: RelyableAttrs) => RelyableApplicabilityState;
};

export const DOMAINS = [
  { id: "cert", name: "Certification & accreditation", w: 20 },
  { id: "people", name: "People & competence", w: 15 },
  { id: "safety", name: "Safety performance", w: 15 },
  { id: "assets", name: "Assets & inspections", w: 15 },
  { id: "gov", name: "Policies & governance", w: 10 },
  { id: "supply", name: "Supply chain", w: 10 },
  { id: "fin", name: "Financial & insurance", w: 10 },
  { id: "infosec", name: "Information security", w: 5 },
] as const;

export const TYPES: Record<string, EvidenceTypeDef> = {
  "cert.iso45001": {
    dom: "cert",
    w: 10,
    kind: "cert",
    rule: (a) =>
      a.contractor || a.lifting
        ? "required"
        : a.employs
          ? "expected"
          : "optional",
  },
  "cert.iso9001": {
    dom: "cert",
    w: 7,
    kind: "cert",
    rule: (a) =>
      a.contractor || a.food || a.regulated ? "expected" : "optional",
  },
  "cert.iso14001": {
    dom: "cert",
    w: 5,
    kind: "cert",
    rule: (a) => (a.contractor ? "expected" : "optional"),
  },
  "cert.ssip": {
    dom: "cert",
    w: 10,
    kind: "cert",
    rule: (a) => (a.contractor || a.sites ? "required" : "na"),
  },
  "cert.regulator": {
    dom: "cert",
    w: 8,
    kind: "cert",
    rule: (a) => (a.regulated ? "required" : "na"),
  },
  "cert.cyberessentials": {
    dom: "infosec",
    w: 6,
    kind: "cert",
    rule: (a) => (a.data ? "expected" : "optional"),
  },
  "training.competence": {
    dom: "people",
    w: 10,
    kind: "periodic",
    halfLife: 30,
    rule: (a) => (a.employs ? "required" : "na"),
  },
  "training.licence": {
    dom: "people",
    w: 6,
    kind: "periodic",
    halfLife: 30,
    rule: (a) => (a.lifting || a.vehicles ? "required" : "na"),
  },
  "training.induction": {
    dom: "people",
    w: 4,
    kind: "periodic",
    halfLife: 30,
    rule: (a) => (a.employs ? "expected" : "na"),
  },
  "safety.riddor": {
    dom: "safety",
    w: 8,
    kind: "event",
    rule: (a) => (a.employs ? "required" : "na"),
  },
  "safety.inspection": {
    dom: "safety",
    w: 6,
    kind: "periodic",
    halfLife: 30,
    rule: (a) => (a.premises || a.sites ? "expected" : "na"),
  },
  "fire.risk.assessment": {
    dom: "safety",
    w: 8,
    kind: "cert",
    rule: (a) => (a.premises ? "required" : "na"),
  },
  "fire.test": {
    dom: "safety",
    w: 4,
    kind: "periodic",
    halfLife: 7,
    rule: (a) => (a.premises ? "expected" : "na"),
  },
  "food.hygiene": {
    dom: "safety",
    w: 8,
    kind: "cert",
    rule: (a) => (a.food ? "required" : "na"),
  },
  "asset.loler": {
    dom: "assets",
    w: 8,
    kind: "cert",
    rule: (a) => (a.lifting ? "required" : "na"),
  },
  "asset.puwer": {
    dom: "assets",
    w: 5,
    kind: "periodic",
    halfLife: 180,
    rule: (a) => (a.lifting || a.premises ? "expected" : "na"),
  },
  "fleet.olicence": {
    dom: "assets",
    w: 6,
    kind: "cert",
    rule: (a) => (a.vehicles ? "required" : "na"),
  },
  "fleet.driver.checks": {
    dom: "assets",
    w: 5,
    kind: "periodic",
    halfLife: 90,
    rule: (a) => (a.vehicles ? "required" : "na"),
  },
  "asset.calibration": {
    dom: "assets",
    w: 3,
    kind: "cert",
    rule: () => "optional",
  },
  "policy.hs": {
    dom: "gov",
    w: 8,
    kind: "cert",
    rule: (a) => (a.employs ? "required" : "expected"),
  },
  "policy.review": {
    dom: "gov",
    w: 5,
    kind: "periodic",
    halfLife: 365,
    rule: () => "expected",
  },
  "policy.ack": {
    dom: "gov",
    w: 4,
    kind: "periodic",
    halfLife: 365,
    rule: (a) => (a.employs ? "expected" : "na"),
  },
  "gov.management.review": {
    dom: "gov",
    w: 3,
    kind: "periodic",
    halfLife: 365,
    rule: () => "optional",
  },
  "supplier.approved": {
    dom: "supply",
    w: 6,
    kind: "periodic",
    halfLife: 365,
    rule: (a) =>
      a.contractor || a.food || a.lifting || a.sites ? "required" : "na",
  },
  "supplier.modern-slavery": {
    dom: "supply",
    w: 4,
    kind: "cert",
    rule: (a) => (a.contractor || a.food ? "expected" : "optional"),
  },
  "fin.accounts": {
    dom: "fin",
    w: 6,
    kind: "public",
    core: true,
    rule: () => "required",
  },
  "fin.insurance.el": {
    dom: "fin",
    w: 8,
    kind: "cert",
    core: true,
    rule: (a) => (a.employs ? "required" : "na"),
  },
  "fin.insurance.pl": {
    dom: "fin",
    w: 5,
    kind: "cert",
    rule: (a) =>
      a.sites || a.contractor || a.premises ? "required" : "expected",
  },
  "infosec.mfa": {
    dom: "infosec",
    w: 4,
    kind: "periodic",
    halfLife: 90,
    rule: () => "expected",
  },
  "infosec.dpo": {
    dom: "infosec",
    w: 3,
    kind: "cert",
    rule: (a) => (a.data ? "expected" : "optional"),
  },
  "register.companies-house": {
    dom: "fin",
    w: 0,
    kind: "public",
    core: true,
    rule: () => "required",
  },
  "register.directors": {
    dom: "gov",
    w: 0,
    kind: "public",
    core: true,
    rule: () => "required",
  },
  "register.gazette": {
    dom: "fin",
    w: 0,
    kind: "public",
    core: true,
    rule: () => "required",
  },
  "register.hse": {
    dom: "safety",
    w: 0,
    kind: "public",
    core: true,
    rule: () => "required",
  },
};

const TYPE_LABELS: Record<string, string> = {
  "cert.iso45001": "ISO 45001",
  "cert.iso9001": "ISO 9001",
  "cert.iso14001": "ISO 14001",
  "cert.ssip": "SSIP",
  "cert.regulator": "Regulator registration",
  "cert.cyberessentials": "Cyber Essentials",
  "training.competence": "Mandatory competencies in date",
  "training.licence": "Licences (forklift, etc.)",
  "training.induction": "Inductions",
  "safety.riddor": "RIDDOR record",
  "safety.inspection": "Safety inspections",
  "fire.risk.assessment": "Fire risk assessment",
  "fire.test": "Weekly fire test",
  "food.hygiene": "Food hygiene",
  "asset.loler": "LOLER examinations",
  "asset.puwer": "PUWER inspections",
  "fleet.olicence": "Operator licence",
  "fleet.driver.checks": "Driver checks",
  "asset.calibration": "Calibration",
  "policy.hs": "Health and safety policy",
  "policy.review": "Policy reviews",
  "policy.ack": "Policy acknowledgements",
  "gov.management.review": "Management review",
  "supplier.approved": "Approved suppliers",
  "supplier.modern-slavery": "Modern slavery statement",
  "fin.accounts": "Accounts filed",
  "fin.insurance.el": "Employers' liability insurance",
  "fin.insurance.pl": "Public liability insurance",
  "infosec.mfa": "MFA coverage",
  "infosec.dpo": "Data protection officer",
  "register.companies-house": "Companies House status",
  "register.directors": "Director disqualifications",
  "register.gazette": "Gazette notices",
  "register.hse": "HSE enforcement",
};

export function evidenceLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

export function fillAttrs(partial: Partial<RelyableAttrs> = {}): RelyableAttrs {
  const out = {} as RelyableAttrs;
  for (const k of RELYABLE_ATTRS) out[k] = partial[k] ? 1 : 0;
  return out;
}

export function sizeBand(employees: number | null | undefined): RelyableSizeBand {
  if (employees == null) return "unknown";
  if (employees <= 10) return "1-10";
  if (employees <= 50) return "11-50";
  if (employees <= 250) return "51-250";
  return "251+";
}

type SicMapRow = [RegExp, RelyableFamily, Partial<RelyableAttrs>];

const SIC_MAP: SicMapRow[] = [
  [/^4[1-3]/, "construction", { employs: 1, sites: 1, contractor: 1, vehicles: 1, lifting: 1 }],
  [/^(2[4-9]|3[0-3])/, "engineering", { employs: 1, premises: 1, lifting: 1 }],
  [/^(49|52|53)/, "transport", { employs: 1, premises: 1, vehicles: 1, lifting: 1, regulated: 1 }],
  [/^(81|80)/, "facilities", { employs: 1, sites: 1, contractor: 1, vehicles: 1 }],
  [/^8[6-8]/, "care", { employs: 1, premises: 1, lifting: 1, food: 1, regulated: 1, data: 1 }],
  [/^(10|11)/, "food", { employs: 1, premises: 1, vehicles: 1, lifting: 1, food: 1, regulated: 1 }],
  [/^5[5-6]/, "hospitality", { employs: 1, premises: 1, food: 1 }],
  [/^(6[2-9]|7[0-4])/, "professional", { employs: 1, premises: 1, data: 1 }],
  [/^85/, "education", { employs: 1, premises: 1, regulated: 1, data: 1 }],
  [/^(94|88)/, "charity", { employs: 1, premises: 1 }],
];

export function fromSic(sics: string[] = []): {
  family: RelyableFamily;
  attrs: RelyableAttrs;
} {
  for (const code of sics) {
    for (const [re, fam, attrs] of SIC_MAP) {
      if (re.test(String(code))) return { family: fam, attrs: fillAttrs(attrs) };
    }
  }
  return { family: "other", attrs: fillAttrs({ employs: 1, premises: 1 }) };
}

export function defaultScope(input?: {
  sic?: string[];
  employees?: number | null;
}): RelyableScope {
  const base = fromSic(input?.sic ?? []);
  return {
    family: base.family,
    sizeBand: sizeBand(input?.employees),
    attrs: base.attrs,
    confirmed: false,
    declarations: [],
  };
}

export type Applicability = {
  items: Record<string, RelyableApplicabilityState>;
  domains: Record<string, boolean>;
};

export function applicability(scope: RelyableScope): Applicability {
  const a = scope.attrs || fillAttrs();
  const items: Record<string, RelyableApplicabilityState> = {};
  for (const [t, def] of Object.entries(TYPES)) {
    const state = def.rule(a);
    items[t] = def.core && state === "required" ? "required" : state;
  }
  const domains: Record<string, boolean> = {};
  for (const d of DOMAINS) {
    domains[d.id] = Object.entries(TYPES).some(
      ([t, def]) =>
        def.dom === d.id &&
        def.w > 0 &&
        (items[t] === "required" || items[t] === "expected")
    );
  }
  return { items, domains };
}

export function checkDeclaration(
  declared: RelyableAttrs,
  evidence: {
    olicence?: boolean;
    vehicleSic?: boolean;
    vehicleRiddor?: boolean;
    ssip?: boolean;
    employees?: number;
    regulator?: string | null;
  } = {}
): Array<{ attr: RelyableAttr; reason: string }> {
  const contradictions: Array<{ attr: RelyableAttr; reason: string }> = [];
  if (
    !declared.vehicles &&
    (evidence.olicence || evidence.vehicleSic || evidence.vehicleRiddor)
  ) {
    contradictions.push({
      attr: "vehicles",
      reason: evidence.olicence
        ? "O-licence on the Traffic Commissioner register"
        : evidence.vehicleSic
          ? "vehicle-related SIC code"
          : "vehicle RIDDOR entry",
    });
  }
  if (!declared.contractor && evidence.ssip) {
    contradictions.push({
      attr: "contractor",
      reason: "SSIP membership on the public register",
    });
  }
  if (!declared.employs && (evidence.employees ?? 0) > 0) {
    contradictions.push({
      attr: "employs",
      reason: `${evidence.employees} employees in filed accounts`,
    });
  }
  if (!declared.regulated && evidence.regulator) {
    contradictions.push({
      attr: "regulated",
      reason: `${evidence.regulator} registration found`,
    });
  }
  return contradictions;
}

export type ScoreEvidenceItem = {
  type: string;
  status: RelyableEvidenceStatus;
  observedAt: string;
  validUntil?: string | null;
  payload?: { ok?: number; total?: number; [k: string]: unknown };
  level: 0 | 1 | 2 | 3;
  disputed?: boolean;
};

function validity(
  def: EvidenceTypeDef,
  e: ScoreEvidenceItem,
  now: Date
): number {
  if (
    e.status === "fail" ||
    e.status === "expired" ||
    e.status === "adverse"
  ) {
    return 0;
  }
  if (e.validUntil && new Date(e.validUntil) < now) return 0;
  let v = 1;
  if (def.kind === "periodic") {
    const age = (now.getTime() - new Date(e.observedAt).getTime()) / DAY;
    const h = def.halfLife || 30;
    v = age <= h ? 1 : Math.max(0, 1 - (age - h) / h);
  }
  if (e.status === "partial") {
    const total = e.payload?.total;
    const ok = e.payload?.ok || 0;
    v *= total ? Math.max(0.25, ok / total) : 0.5;
  }
  return v;
}

export type ScoreResult = {
  score: number;
  raw: number;
  band: RelyableBand;
  bandName: string;
  tier: number;
  verifiedRatio: number;
  domains: Record<string, number | null>;
  caps: RelyableCap[];
  applicability: Applicability;
  explain: RelyableExplainRow[];
  modelVersion: string;
  computedAt: string;
};

export function compute(args: {
  scope: RelyableScope;
  items: ScoreEvidenceItem[];
  now?: Date;
  facts?: RelyableCapFacts;
}): ScoreResult {
  const now = args.now ?? new Date();
  const facts = args.facts ?? {};
  const ap = applicability(args.scope);
  const byType: Record<string, ScoreEvidenceItem[]> = {};
  for (const e of args.items) {
    if (e.disputed) continue;
    (byType[e.type] = byType[e.type] || []).push(e);
  }

  const domains: Record<string, number | null> = {};
  const explain: RelyableExplainRow[] = [];
  let wVerified = 0;
  let wAll = 0;
  const missingRequired: string[] = [];

  for (const d of DOMAINS) {
    if (!ap.domains[d.id]) {
      domains[d.id] = null;
      continue;
    }
    let num = 0;
    let den = 0;
    for (const [t, def] of Object.entries(TYPES)) {
      if (def.dom !== d.id || def.w === 0) continue;
      const st = ap.items[t] ?? "optional";
      if (st === "na") continue;
      const es = byType[t] || [];
      let best = 0;
      let lvl: number | null = null;
      for (const e of es) {
        const v = validity(def, e, now) * (VF[e.level] ?? 0);
        if (v > best) {
          best = v;
          lvl = e.level;
        }
      }
      if (st === "optional" && !es.length) continue;
      den += def.w;
      num += def.w * best;
      wAll += def.w;
      if (lvl != null && (lvl >= 2 || lvl === 0) && best > 0) wVerified += def.w;
      if (st === "required" && best === 0) missingRequired.push(t);
      explain.push({
        type: t,
        domain: d.id,
        state: st,
        weight: def.w,
        score: Math.round(best * 100),
        level: lvl,
        count: es.length,
      });
    }
    domains[d.id] = den ? Math.round((num / den) * 100) : 0;
  }

  const appl = DOMAINS.filter((d) => domains[d.id] != null);
  const ws = appl.reduce((a, d) => a + d.w, 0) || 1;
  let raw = Math.round(
    appl.reduce((s, d) => s + (d.w / ws) * (domains[d.id] as number), 0) * 10
  );
  const verifiedRatio = wAll ? Math.round((wVerified / wAll) * 100) : 0;
  const caps: RelyableCap[] = [];
  let score = raw;
  const cap = (n: number, why: string) => {
    caps.push({ limit: n, reason: why });
    score = Math.min(score, n);
  };
  if (facts.accountsOverdue) cap(399, "Accounts overdue at Companies House");
  if (facts.insolvency)
    cap(399, "Insolvency or strike-off notice in The Gazette");
  if (facts.enforcement)
    cap(549, "Open HSE enforcement notice or prosecution within 5 years");
  if (facts.disqualifiedDirector) cap(549, "Disqualified director");
  if (missingRequired.length) {
    cap(
      699,
      "Missing or expired mandatory evidence: " + missingRequired.join(", ")
    );
  }
  if (verifiedRatio < 50) cap(749, "Verified-evidence ratio below 50%");
  if (facts.riddorOpen && domains.safety != null) {
    domains.safety = Math.min(domains.safety, 40);
    caps.push({
      limit: null,
      reason:
        "RIDDOR specified injury, investigation open: Safety domain ≤ 40 for 90 days",
    });
  }

  const tierW: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const x of explain) {
    if (x.level != null && x.score > 0) {
      for (let l = 0; l <= x.level; l++) {
        tierW[l] = (tierW[l] ?? 0) + x.weight;
      }
    }
  }
  let tier = 0;
  for (const l of [3, 2, 1] as const) {
    if (wAll && (tierW[l] ?? 0) / wAll >= 0.5) {
      tier = l;
      break;
    }
  }
  const b = BANDS.find((row) => score >= row[1]) ?? BANDS[BANDS.length - 1]!;
  return {
    score,
    raw,
    band: b[0],
    bandName: b[2],
    tier,
    verifiedRatio,
    domains,
    caps,
    applicability: ap,
    explain,
    modelVersion: MODEL_VERSION,
    computedAt: now.toISOString(),
  };
}

export function whatIf(
  args: {
    scope: RelyableScope;
    items: ScoreEvidenceItem[];
    now?: Date;
    facts?: RelyableCapFacts;
  },
  type: string,
  level: 0 | 1 | 2 | 3 = 2
): RelyableRaiseItItem {
  const now = args.now ?? new Date();
  const base = compute(args);
  const items = args.items.concat([
    {
      type,
      status: "valid",
      observedAt: now.toISOString(),
      level,
      validUntil: null,
    },
  ]);
  const after = compute({ ...args, items, now });
  return {
    type,
    level,
    from: base.score,
    to: after.score,
    delta: after.score - base.score,
    afterCap: after.caps.length < base.caps.length,
    label: evidenceLabel(type),
  };
}

export function nextRisks(args: {
  scope: RelyableScope;
  items: ScoreEvidenceItem[];
  now?: Date;
}): RelyableNextRisk[] {
  const now = args.now ?? new Date();
  const out: RelyableNextRisk[] = [];
  for (const e of args.items) {
    const def = TYPES[e.type];
    if (!def) continue;
    if (e.validUntil) {
      const d = Math.round(
        (new Date(e.validUntil).getTime() - now.getTime()) / DAY
      );
      if (d <= 90) {
        out.push({
          type: e.type,
          in: d,
          what: d < 0 ? "expired" : "expires",
          validUntil: e.validUntil,
          label: evidenceLabel(e.type),
        });
      }
    } else if (def.kind === "periodic") {
      const age =
        (now.getTime() - new Date(e.observedAt).getTime()) / DAY;
      const left = Math.round((def.halfLife || 30) - age);
      if (left <= 14) {
        out.push({
          type: e.type,
          in: left,
          what: "decays",
          halfLife: def.halfLife,
          label: evidenceLabel(e.type),
        });
      }
    }
  }
  return out.sort((a, b) => a.in - b.in);
}

export function raiseIt(args: {
  scope: RelyableScope;
  items: ScoreEvidenceItem[];
  now?: Date;
  facts?: RelyableCapFacts;
}): RelyableRaiseItItem[] {
  const ap = applicability(args.scope);
  const have = new Set(
    args.items.filter((e) => e.status === "valid").map((e) => e.type)
  );
  return Object.keys(TYPES)
    .filter(
      (t) =>
        (TYPES[t]?.w ?? 0) > 0 &&
        ap.items[t] !== "na" &&
        !have.has(t)
    )
    .map((t) => whatIf(args, t, 2))
    .filter((w) => w.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
}

export const MODULES: Record<
  string,
  { name: string; types: string[]; emits: string }
> = {
  documents: {
    name: "Document Management",
    types: [
      "policy.hs",
      "policy.review",
      "policy.ack",
      "fire.risk.assessment",
      "cert.iso45001",
      "cert.iso9001",
      "cert.iso14001",
      "cert.cyberessentials",
      "cert.regulator",
      "fin.insurance.el",
      "fin.insurance.pl",
      "supplier.modern-slavery",
      "infosec.dpo",
    ],
    emits:
      "on publish, on acknowledgement, on review date, on certificate upload",
  },
  training: {
    name: "Training & Competency",
    types: ["training.competence", "training.licence", "training.induction"],
    emits: "on record save, on session completion, nightly matrix aggregate",
  },
  inventory: {
    name: "Inventory & Assets",
    types: [
      "asset.loler",
      "asset.puwer",
      "asset.calibration",
      "fleet.olicence",
      "fleet.driver.checks",
    ],
    emits: "on inspection result, on QR sighting, nightly aggregate",
  },
  suppliers: {
    name: "Supplier Management",
    types: ["supplier.approved", "cert.ssip"],
    emits: "on approval, on certificate update",
  },
  incidents: {
    name: "Incidents & Inspections",
    types: [
      "safety.riddor",
      "safety.inspection",
      "fire.test",
      "food.hygiene",
    ],
    emits: "on incident status change, on inspection complete",
  },
  audits: {
    name: "Audits & Management Review",
    types: ["gov.management.review", "infosec.mfa"],
    emits: "on audit closed, security posture nightly",
  },
  registry: {
    name: "Public record",
    types: [
      "fin.accounts",
      "register.companies-house",
      "register.directors",
      "register.gazette",
      "register.hse",
    ],
    emits: "public-record ingest jobs",
  },
};

export function contributions(
  snapshot: ScoreResult,
  scope: RelyableScope
): {
  rating: number;
  band: RelyableBand;
  tier: number;
  caps: RelyableCap[];
  modules: RelyableModuleContribution[];
} {
  const ap = applicability(scope);
  const appl = DOMAINS.filter((d) => snapshot.domains[d.id] != null);
  const ws = appl.reduce((a, d) => a + d.w, 0) || 1;
  const den: Record<string, number> = {};
  for (const x of snapshot.explain) {
    den[x.domain] = (den[x.domain] || 0) + x.weight;
  }
  const byType: Record<string, RelyableExplainRow> = {};
  for (const x of snapshot.explain) byType[x.type] = x;

  const out: RelyableModuleContribution[] = [];
  let totalMax = 0;

  for (const [id, m] of Object.entries(MODULES)) {
    let nowPts = 0;
    let max = 0;
    const items: RelyableModuleContribution["items"] = [];
    for (const t of m.types) {
      const def = TYPES[t];
      if (!def || def.w === 0) continue;
      const st = ap.items[t] ?? "optional";
      if (st === "na") {
        items.push({
          type: t,
          label: evidenceLabel(t),
          state: "na",
          points: 0,
          max: 0,
          score: null,
          tier: null,
          count: 0,
        });
        continue;
      }
      const x = byType[t];
      const domain = DOMAINS.find((d) => d.id === def.dom);
      const dw = (domain?.w ?? 0) / ws;
      const domainDen = den[def.dom] || 1;
      const maxPts = x
        ? Math.round(((dw * def.w) / domainDen) * 1000 * 10) / 10
        : 0;
      const pts = x ? Math.round(((maxPts * x.score) / 100) * 10) / 10 : 0;
      if (x) {
        nowPts += pts;
        max += maxPts;
      }
      items.push({
        type: t,
        label: evidenceLabel(t),
        state: st,
        points: pts,
        max: maxPts,
        score: x ? x.score : null,
        tier: x ? x.level : null,
        count: x ? x.count : 0,
      });
    }
    totalMax += max;
    out.push({
      id,
      name: m.name,
      emits: m.emits,
      points: Math.round(nowPts),
      max: Math.round(max),
      share: 0,
      gap: Math.round(max - nowPts),
      items: items.sort((a, b) => b.max - b.points - (a.max - a.points)),
    });
  }
  for (const m of out) {
    m.share = totalMax ? Math.round((m.max / totalMax) * 100) : 0;
  }
  return {
    rating: snapshot.score,
    band: snapshot.band,
    tier: snapshot.tier,
    caps: snapshot.caps,
    modules: out,
  };
}

/** Register-fact evidence derived from settings facts (Tier 0). */
export function registerEvidenceFromFacts(
  facts: RelyableCapFacts,
  observedAt: string
): ScoreEvidenceItem[] {
  const items: ScoreEvidenceItem[] = [
    {
      type: "register.companies-house",
      status: facts.accountsOverdue ? "adverse" : "clear",
      observedAt,
      level: 0,
      payload: { accountsOverdue: !!facts.accountsOverdue },
    },
    {
      type: "register.directors",
      status: facts.disqualifiedDirector ? "adverse" : "clear",
      observedAt,
      level: 0,
      payload: { disqualified: !!facts.disqualifiedDirector },
    },
    {
      type: "register.gazette",
      status: facts.insolvency ? "adverse" : "clear",
      observedAt,
      level: 0,
      payload: { insolvency: !!facts.insolvency },
    },
    {
      type: "register.hse",
      status: facts.enforcement ? "adverse" : "clear",
      observedAt,
      level: 0,
      payload: { enforcement: !!facts.enforcement },
    },
    {
      type: "fin.accounts",
      status: facts.accountsOverdue ? "fail" : "valid",
      observedAt,
      level: 0,
      payload: {},
    },
  ];
  if (facts.riddorOpen) {
    items.push({
      type: "safety.riddor",
      status: "adverse",
      observedAt,
      level: 0,
      payload: { open: 1 },
    });
  } else {
    items.push({
      type: "safety.riddor",
      status: "clear",
      observedAt,
      level: 0,
      payload: { open: 0 },
    });
  }
  return items;
}
