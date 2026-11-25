/**
 * Pure Tender Autopilot rules (ported from prototype rules.js).
 * No I/O — operate on a TenderRulesModel snapshot.
 */
import { randomUUID } from "node:crypto";
import {
  ValidationAppError,
  NotFoundError,
  ForbiddenError,
} from "../../../shared";
import type {
  TenderAnalysedDocument,
  TenderBidBlock,
  TenderCanSubmitResult,
  TenderCaseStudy,
  TenderCertificate,
  TenderCoverage,
  TenderCriterion,
  TenderDates,
  TenderDocumentKind,
  TenderDraftResult,
  TenderExportRecord,
  TenderFacts,
  TenderGateResult,
  TenderHistoryEntry,
  TenderLibraryAnswer,
  TenderLibraryHealth,
  TenderLibraryKind,
  TenderLimitUsage,
  TenderLogEntry,
  TenderPackDocument,
  TenderParagraph,
  TenderParsedRows,
  TenderPolicy,
  TenderPriceTotals,
  TenderPricing,
  TenderPricingLine,
  TenderQuestion,
  TenderQuestionnaire,
  TenderQuestionStatus,
  TenderQuestionType,
  TenderRate,
  TenderRequirement,
  TenderResponseLimit,
  TenderRulesModel,
  TenderService,
  TenderSettings,
  TenderSourceHit,
  TenderSourceKind,
  TenderStats,
  TenderSubmissionPackage,
} from "../types";
import {
  DEFAULT_SETTINGS,
  TENDER_QUESTION_STATUSES,
  TENDER_REQUIREMENT_STATUSES,
} from "../types";

export { DEFAULT_SETTINGS };
export const STATUS = TENDER_QUESTION_STATUSES;

/* ---------------- date / id helpers ---------------- */

export const pad = (n: number): string => String(n).padStart(2, "0");

export const iso = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export const parse = (s: string): Date => {
  const parts = String(s).slice(0, 10).split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, m - 1, d));
};

export const today = (): Date =>
  new Date(
    Date.UTC(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    )
  );

export const addDays = (d: Date, n: number): Date =>
  new Date(d.getTime() + n * 864e5);

export const daysBetween = (a: string, b: string): number =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);

export const addMonths = (d: Date, n: number): Date => {
  const x = new Date(d.getTime());
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
};

export const uid = (p: string): string =>
  `${p}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

export function byId<T extends { id: string }>(
  arr: T[] | null | undefined,
  id: string
): T | undefined {
  return (arr || []).find((x) => x.id === id);
}

type HistBearer = { hist?: TenderHistoryEntry[] };

export function history(
  obj: HistBearer,
  what: string,
  by?: string,
  now?: Date | null
): void {
  (obj.hist = obj.hist || []).push({
    t: (now || new Date()).toISOString(),
    by: by || "system",
    what,
  });
  if (obj.hist.length > 60) obj.hist.splice(0, obj.hist.length - 60);
}

export function log(
  M: { log?: TenderLogEntry[] },
  what: string,
  by?: string,
  now?: Date | null
): void {
  (M.log = M.log || []).unshift({
    t: (now || new Date()).toISOString(),
    by: by || "system",
    what,
  });
  if (M.log.length > 400) M.log.length = 400;
}

/* ---------------- text matching ---------------- */

const STOP = new Set(
  "a an the and or of to in on for with by is are be as at from your you our we do does have has that this it its their there will can please provide describe detail details any all how what which who where when if not no yes".split(
    " "
  )
);

const SYN: Record<string, string> = {
  "h&s": "health safety",
  hs: "health safety",
  ohs: "health safety",
  gdpr: "data protection",
  infosec: "information security",
  cyber: "information security",
  bcp: "business continuity",
  dr: "business continuity",
  esg: "environment social governance",
  csr: "social responsibility",
  eq: "equality diversity",
  edi: "equality diversity",
  iso9001: "iso 9001 quality",
  iso14001: "iso 14001 environment",
  iso45001: "iso 45001 health safety",
  iso27001: "iso 27001 information security",
  subcontractor: "supplier subcontractor",
  subcontractors: "supplier subcontractor",
  insurance: "insurance liability",
  modern: "modern slavery",
  slavery: "modern slavery",
  bribery: "anti bribery",
  kpi: "performance kpi",
  kpis: "performance kpi",
  riddor: "accident incident reporting",
  coshh: "hazardous substances",
  rams: "risk assessment method statement",
};

export function tokens(s: string | null | undefined): string[] {
  const out: string[] = [];
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, " ")
    .split(" ")
    .forEach((w) => {
      if (!w) return;
      const x = SYN[w];
      if (x) out.push(...x.split(" "));
      else if (!STOP.has(w) && w.length > 1)
        out.push(w.replace(/(ies)$/, "y").replace(/(s|ing|ed)$/, ""));
    });
  return out;
}

function tf(toks: string[]): Map<string, number> {
  const m = new Map<string, number>();
  toks.forEach((t) => m.set(t, (m.get(t) || 0) + 1));
  return m;
}

type IndexDoc = {
  kind: TenderSourceKind | string;
  id: string;
  label: string;
  toks: string[];
  tf: Map<string, number>;
  norm: number;
  nums?: Set<string>;
};

export type TenderIndex = {
  docs: IndexDoc[];
  idf: (t: string) => number;
};

export function buildIndex(M: TenderRulesModel): TenderIndex {
  const docs: IndexDoc[] = [];
  (M.library.answers || []).forEach((a) =>
    docs.push({
      kind: "answer",
      id: a.id,
      label: a.question,
      toks: tokens(
        a.question +
          " " +
          (a.tags || []).join(" ") +
          " " +
          (a.standards || []).join(" ") +
          " " +
          a.answer.slice(0, 300)
      ),
      tf: new Map(),
      norm: 1,
    })
  );
  (M.library.policies || []).forEach((p) =>
    docs.push({
      kind: "policy",
      id: p.id,
      label: p.name,
      toks: tokens(
        p.name + " " + (p.summary || "") + " " + (p.tags || []).join(" ")
      ),
      tf: new Map(),
      norm: 1,
    })
  );
  (M.library.certificates || []).forEach((c) =>
    docs.push({
      kind: "certificate",
      id: c.id,
      label: c.name,
      toks: tokens(
        c.name +
          " " +
          (c.body || "") +
          " " +
          (c.scope || "") +
          " " +
          (c.standard || "")
      ),
      tf: new Map(),
      norm: 1,
    })
  );
  (M.library.services || []).forEach((s) =>
    docs.push({
      kind: "service",
      id: s.id,
      label: s.name,
      toks: tokens(
        s.name +
          " " +
          (s.tags || []).join(" ") +
          " " +
          (s.description || "").slice(0, 400) +
          " " +
          (s.method || "").slice(0, 400)
      ),
      tf: new Map(),
      norm: 1,
    })
  );
  (M.library.cases || []).forEach((c) =>
    docs.push({
      kind: "case",
      id: c.id,
      label: c.client + " · " + c.title,
      toks: tokens(
        c.title +
          " " +
          c.client +
          " " +
          (c.sector || "") +
          " " +
          (c.tags || []).join(" ") +
          " " +
          (c.summary || "").slice(0, 400)
      ),
      tf: new Map(),
      norm: 1,
    })
  );

  const df = new Map<string, number>();
  docs.forEach((d) =>
    new Set(d.toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1))
  );
  const N = docs.length || 1;
  const idf = (t: string) => Math.log(1 + N / (1 + (df.get(t) || 0)));
  docs.forEach((d) => {
    d.tf = tf(d.toks);
    d.norm =
      Math.sqrt(
        [...d.tf].reduce((s, [t, c]) => s + Math.pow(c * idf(t), 2), 0)
      ) || 1;
  });
  return { docs, idf };
}

const NUMS = (s: string): Set<string> =>
  new Set(String(s).match(/\b\d{4,5}\b/g) || []);

export function match(
  index: TenderIndex,
  question: string,
  limit = 5
): TenderSourceHit[] {
  const q = tf(tokens(question));
  const qn =
    Math.sqrt(
      [...q].reduce((s, [t, c]) => s + Math.pow(c * index.idf(t), 2), 0)
    ) || 1;
  const qnums = NUMS(question);
  return index.docs
    .map((d) => {
      let dot = 0;
      q.forEach((c, t) => {
        const dc = d.tf.get(t);
        if (dc) dot += c * index.idf(t) * dc * index.idf(t);
      });
      let score = dot / (qn * d.norm);
      if (qnums.size) {
        const dn = d.nums || (d.nums = NUMS(d.label + " " + d.toks.join(" ")));
        if (dn.size) {
          const inter = [...qnums].some((n) => dn.has(n));
          score *= inter ? 1.15 : 0.3;
        }
      }
      return {
        kind: d.kind,
        id: d.id,
        label: d.label,
        score: Math.round(Math.min(1, score) * 1000) / 1000,
      };
    })
    .filter((x) => x.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ---------------- drafting ---------------- */

const YESNO =
  /^(do|does|are|is|have|has|can|will|did)\b.*\?$|\b(yes\s*\/\s*no|y\/n)\b/i;

export function classify(text: string): TenderQuestionType {
  if (/upload|attach|provide a copy|copy of your/i.test(text)) return "upload";
  if (
    /how many|number of|turnover|headcount|what is your .*(rate|score|percentage)/i.test(
      text
    )
  )
    return "number";
  if (YESNO.test(text.trim())) return "yesno";
  return "text";
}

export function fillFacts(
  text: string,
  facts: TenderFacts | null | undefined
): string {
  return String(text).replace(/\{\{(\w+)\}\}/g, (m, k: string) =>
    facts && facts[k] != null ? facts[k] : m
  );
}

const FACTS: Array<[RegExp, (f: TenderFacts) => string | false | undefined]> = [
  [
    /registered (company )?name|company number|companies house|incorporat|year (of )?(establish|found)/i,
    (f) =>
      f.company &&
      `${f.company}${f.companyNumber ? ", company number " + f.companyNumber : ""}${f.founded ? ", incorporated in " + f.founded : ""}.`,
  ],
  [
    /how many (employees|staff|people)|headcount|number of employees|turnover|annual revenue/i,
    (f) =>
      (f.employees || f.turnover) &&
      `${f.employees ? "We employ " + f.employees + " people" : ""}${f.employees && f.turnover ? " and our" : f.turnover ? "Our" : ""}${f.turnover ? " turnover in the last financial year was " + f.turnover : ""}${f.sites ? ", operating from " + f.sites : ""}.`,
  ],
  [
    /riddor|accident (statistics|frequency|rate)|lost[- ]time/i,
    (f) =>
      f.accidentRate &&
      `Our RIDDOR-reportable accident frequency rate is ${f.accidentRate}${f.lostTimeIncidents ? " with " + f.lostTimeIncidents + " lost-time incident(s)" : ""}. Three-year figures are held in our incident register in iMS OS and can be provided. [Confirm the three-year figures before submission.]`,
  ],
  [
    /(where|which) (sites|locations|offices)|registered (office|address)/i,
    (f) => f.sites && `We operate from ${f.sites}.`,
  ],
];

export function factAnswer(
  text: string,
  facts: TenderFacts | null | undefined
): { answer: string; confidence: number } | null {
  for (const [re, fn] of FACTS) {
    if (re.test(text)) {
      const s = fn(facts || {});
      if (s) return { answer: s, confidence: /confirm/i.test(s) ? 0.5 : 0.8 };
    }
  }
  return null;
}

export function draft(
  M: TenderRulesModel,
  q: TenderQuestion,
  index?: TenderIndex
): TenderDraftResult {
  const idx = index || buildIndex(M);
  const hits = match(idx, q.text, 6);
  const type = q.type || classify(q.text);
  const facts = M.facts || {};
  const best = hits.find((h) => h.kind === "answer");
  const bestA = best && byId(M.library.answers, best.id);
  const certs = hits
    .filter((h) => h.kind === "certificate")
    .map((h) => byId(M.library.certificates, h.id))
    .filter((c): c is TenderCertificate => Boolean(c));
  const pols = hits
    .filter((h) => h.kind === "policy")
    .map((h) => byId(M.library.policies, h.id))
    .filter((p): p is TenderPolicy => Boolean(p));
  const svcs = hits
    .filter((h) => h.kind === "service")
    .map((h) => byId(M.library.services, h.id))
    .filter((s): s is TenderService => Boolean(s));
  const cases = hits
    .filter((h) => h.kind === "case")
    .map((h) => byId(M.library.cases, h.id))
    .filter((c): c is TenderCaseStudy => Boolean(c));

  const NARR =
    /describe|explain|outline|demonstrate|method|approach|how (would|will|do) you|experience|mobilis|deliver|manage|propose|case stud|examples? of|references?|track record|provide (two|three|details)/i;
  let answer = "";
  let confidence = 0;
  const NEG =
    /enforcement|prosecut|improvement notice|prohibition notice|conviction|breach|claim|dispute|litigation|insolven|terminat|fine|penalt|disqualif|blacklist|investigation by/i;
  const F = factAnswer(q.text, facts);

  if (F) {
    answer = F.answer;
    confidence = F.confidence;
  } else if (type === "yesno" && NEG.test(q.text)) {
    answer = `No. ${facts.company || "We"} ${/last\s+(\d+)\s+years?/i.test(q.text) ? "have had none in the period stated" : "have had none"}. [Confirm with the responsible manager before submission.]`;
    confidence = 0.4;
  } else if (bestA && best && best.score >= 0.25) {
    answer = fillFacts(bestA.answer, facts);
    confidence = Math.min(0.97, 0.45 + best.score * 0.6);
    if (bestA.approvedAt) confidence += 0.05;
    if (isStale(M, bestA)) confidence -= 0.15;
  } else if (
    NARR.test(q.text) &&
    (svcs.length || cases.length) &&
    !(bestA && best && best.score >= 0.25)
  ) {
    const parts: string[] = [];
    const s = svcs[0];
    const wantsCases =
      /case stud|examples? of|references?|track record|similar contracts/i.test(
        q.text
      );
    if (wantsCases) {
      cases.slice(0, 2).forEach((c) =>
        parts.push(
          `${c.client} — ${c.title}${c.value ? " (" + c.value + ")" : ""}${c.year ? ", " + c.year : ""}: ${c.summary}${c.outcome ? " " + c.outcome : ""}`
        )
      );
    }
    if (s) {
      parts.push(fillFacts(s.description, facts));
      if (s.method) parts.push(fillFacts(s.method, facts));
      if (s.people && s.people.length)
        parts.push(
          "This work is led by " + s.people.slice(0, 2).join(" and ") + "."
        );
    }
    if (!wantsCases)
      cases.slice(0, 2).forEach((c) =>
        parts.push(
          `${c.client} — ${c.title}${c.value ? " (" + c.value + ")" : ""}${c.year ? ", " + c.year : ""}: ${c.summary}${c.outcome ? " " + c.outcome : ""}`
        )
      );
    if (pols.length) {
      const pol = pols[0]!;
      parts.push(
        `Delivery is governed by our ${pol.name} (${pol.ref || "policy"} v${pol.version || "1"}).`
      );
    }
    answer = parts.join("\n\n");
    const top = Math.max(
      ...hits
        .filter((h) => h.kind === "service" || h.kind === "case")
        .map((h) => h.score)
    );
    confidence = Math.min(
      0.9,
      (wantsCases && cases.length >= 2 ? 0.55 : 0.45) + top * 0.6
    );
  } else if (type === "upload" && (certs.length || pols.length)) {
    const firstKind = (hits.find((h) => h.kind !== "answer") || {}).kind;
    const items =
      firstKind === "policy"
        ? pols.map(
            (p) =>
              `${p.name} (${p.ref || "policy"} v${p.version || "1"}, reviewed ${p.reviewed})`
          )
        : certs.map(
            (c) =>
              `${c.name} (${c.body || "issuer"}${c.number ? ", no. " + c.number : ""}, valid to ${c.expires})`
          );
    answer = `Please see attached: ${items
      .slice(0, /copies|certificates|policies|all /i.test(q.text) ? 3 : 1)
      .join("; ")}.`;
    confidence = 0.7;
  } else if (type === "yesno" && (certs.length || pols.length)) {
    const ev = [
      ...certs.map((c) => `${c.name} (valid to ${c.expires})`),
      ...pols.map(
        (p) =>
          `${p.name} (${p.ref || "ref"} v${p.version || "1"}, reviewed ${p.reviewed})`
      ),
    ];
    answer = `Yes. ${ev.length ? "This is evidenced by " + ev.join(" and ") + "." : ""}`;
    confidence = 0.6;
  } else if (pols.length) {
    const p = pols[0]!;
    answer = `${p.summary ? fillFacts(p.summary, facts) : `We operate a documented ${p.name}`} (${p.ref || "policy"} v${p.version || "1"}, last reviewed ${p.reviewed}, owner ${p.owner || "the Compliance Lead"}). A copy can be provided on request.`;
    confidence = 0.5;
  } else {
    answer = "";
    confidence = 0;
  }

  const L: TenderResponseLimit | null =
    q.limit ||
    (q.wordLimit ? { kind: "words", n: q.wordLimit, spaces: null } : null);
  let trimmed = false;
  if (L && answer) {
    if (NARR.test(q.text) && limitUsage(answer, L).pct < 45) {
      const extra: string[] = [];
      svcs.slice(1, 2).forEach((s) => extra.push(fillFacts(s.description, facts)));
      cases
        .filter((c) => !answer.includes(c.client))
        .slice(0, 2)
        .forEach((c) =>
          extra.push(
            `${c.client} — ${c.title}${c.year ? ", " + c.year : ""}: ${c.summary}${c.outcome ? " " + c.outcome : ""}`
          )
        );
      for (const e of extra) {
        const cand = answer + "\n\n" + e;
        if (limitUsage(cand, L).over) break;
        answer = cand;
      }
    }
    const f = fitToLimit(answer, L);
    answer = f.answer;
    trimmed = f.trimmed;
    if (trimmed) confidence -= 0.05;
  }

  confidence = Math.max(0, Math.min(0.97, Math.round(confidence * 100) / 100));
  const sources = hits.slice(0, 4);
  const minConf = M.settings.minConfidence ?? 0.55;
  return {
    answer,
    confidence,
    sources,
    type,
    trimmed,
    usage: limitUsage(answer, L),
    status: answer
      ? confidence >= minConf
        ? "draft"
        : "needs-input"
      : "needs-input",
  };
}

export function draftAll(
  M: TenderRulesModel,
  qid: string,
  by?: string,
  now?: Date | null,
  only?: string[] | null
): { drafted: number; questionnaire: TenderQuestionnaire } {
  const Q = byId(M.questionnaires, qid);
  if (!Q) throw new NotFoundError("Questionnaire not found");
  const index = buildIndex(M);
  let n = 0;
  Q.questions.forEach((q) => {
    if (only && !only.includes(q.id)) return;
    if (["accepted", "approved", "edited"].includes(q.status)) return;
    const d = draft(M, q, index);
    Object.assign(q, {
      answer: d.answer,
      confidence: d.confidence,
      sources: d.sources,
      type: q.type || d.type,
      status: d.status,
    });
    history(
      q,
      d.answer
        ? `Drafted (${Math.round(d.confidence * 100)}%)${d.trimmed ? " · fitted to " + limitLabel(q.limit || { kind: "words", n: q.wordLimit || 0, spaces: null }) : ""}`
        : "No match in library · needs input",
      by,
      now
    );
    n++;
  });
  Q.status = qStatus(Q);
  log(M, `Drafted ${n} answers for ${Q.buyer} · ${Q.title}`, by, now);
  return { drafted: n, questionnaire: Q };
}

/* ---------------- questionnaire import ---------------- */

const REFRE =
  /^\s*((?:[A-Z]{0,3}\d{1,3}(?:[.\-]\d{1,3}){0,3}[a-z]?)|(?:[A-Z]\d{0,2}))[.)\s:-]+/;

export function looksLikeQuestion(t: string | null | undefined): boolean {
  const s = String(t || "").trim();
  if (s.length < 12) return false;
  if (/\?$/.test(s)) return true;
  if (
    /^(please|describe|provide|confirm|detail|explain|outline|state|list|give|demonstrate|do you|does your|are you|is your|have you|has your|how|what|which|when|where|who)\b/i.test(
      s
    )
  )
    return true;
  return false;
}

/* ---------------- response limits ---------------- */

const LIMIT_RE =
  /(?:\(|\[|\b)(?:(?:max(?:imum)?|limit(?:ed)?(?: to)?|no more than|not (?:to )?exceed(?:ing)?|up to|within|a maximum of|maximum of|restricted to|response limit:?|limit:?)\s*(?:of\s*)?)?(\d{1,3}(?:[,.]\d{3})*|\d+)\s*(?:x\s*)?(words?|characters?|chars?|pages?|sides?)(?:\s*(?:of\s*)?A4)?(?:\s*(?:max(?:imum)?|limit|including spaces|incl\.? spaces|excluding spaces|excl\.? spaces))?(?:\)|\])?/i;
const LIMIT_WORD =
  /\b(max(?:imum)?|limit|no more than|not (?:to )?exceed|up to|within|restricted to)\b/i;
const LIMIT_RE2 =
  /(?:\(|\[)?\s*(word|character|char|page)s?\s*(?:limit|count|max(?:imum)?)\s*(?:of|:|-|–)?\s*(\d{1,3}(?:[,.]\d{3})*|\d+)\s*(?:(words?|characters?|chars?|pages?))?\s*(?:\)|\])?/i;

export function parseLimit(
  text: string | null | undefined,
  lenient?: boolean
): TenderResponseLimit | null {
  const s = String(text || "");
  let m = s.match(LIMIT_RE) as
    | (RegExpMatchArray & { index: number })
    | null;
  if (!m) {
    const m2 = s.match(LIMIT_RE2) as
      | (RegExpMatchArray & { index: number })
      | null;
    if (!m2) return null;
    m = [m2[0], m2[2], m2[1]] as unknown as RegExpMatchArray & {
      index: number;
    };
    m.index = m2.index;
  } else {
    const around = s.slice(
      Math.max(0, m.index - 25),
      m.index + m[0].length + 25
    );
    if (
      !lenient &&
      !LIMIT_WORD.test(m[0]) &&
      !LIMIT_WORD.test(around) &&
      !/\(|\[|limit/i.test(m[0])
    )
      return null;
  }
  const n = Number(String(m[1] ?? "").replace(/[,.](?=\d{3})/g, ""));
  const unit = String(m[2] ?? "").toLowerCase();
  const kind: TenderResponseLimit["kind"] = /^page|^side/.test(unit)
    ? "pages"
    : /^char/.test(unit)
      ? "chars"
      : "words";
  const spaces: TenderResponseLimit["spaces"] = /incl/i.test(m[0])
    ? "incl"
    : /excl/i.test(m[0])
      ? "excl"
      : null;
  if (
    !n ||
    (kind === "words" && n < 10) ||
    (kind === "chars" && n < 50) ||
    (kind === "pages" && n > 20)
  )
    return null;
  let clean = s
    .replace(m[0], "")
    .replace(/^\s*(per|for each)\s+(question|answer|response|section)\s*[\)\]]?/i, "")
    .replace(/\s*(per|for each)\s+(question|answer|response|section)\s*[\)\]]/gi, "")
    .replace(/\s*[\(\[]\s*[\)\]]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  clean = clean.replace(/^[\)\]\s\-–—:,]+|[\s\-–—:,\(\[]+$/g, "").trim();
  return { kind, n, spaces, text: m[0].trim(), clean };
}

export const wordsOf = (s: string | null | undefined): number =>
  (String(s || "").trim().match(/\S+/g) || []).length;

export const charsOf = (
  s: string | null | undefined,
  spaces?: "incl" | "excl" | null
): number =>
  spaces === "excl"
    ? String(s || "").replace(/\s/g, "").length
    : String(s || "").length;

export function limitWords(L: TenderResponseLimit | null | undefined): number | null {
  if (!L) return null;
  return L.kind === "words"
    ? L.n
    : L.kind === "chars"
      ? Math.floor(L.n / 6.5)
      : L.n * 500;
}

export function limitLabel(L: TenderResponseLimit | null | undefined): string {
  if (!L) return "";
  return L.kind === "pages"
    ? `max ${L.n} page${L.n > 1 ? "s" : ""} (≈${L.n * 500} words)`
    : `max ${L.n.toLocaleString("en-GB")} ${
        L.kind === "chars"
          ? "characters" +
            (L.spaces
              ? " " + (L.spaces === "incl" ? "incl." : "excl.") + " spaces"
              : "")
          : "words"
      }`;
}

export function limitUsage(
  answer: string | null | undefined,
  L: TenderResponseLimit | null | undefined
): TenderLimitUsage {
  if (!L)
    return { n: wordsOf(answer), max: null, over: false, pct: 0, unit: "words" };
  if (L.kind === "chars") {
    const n = charsOf(answer, L.spaces);
    return {
      n,
      max: L.n,
      over: n > L.n,
      pct: Math.round((n / L.n) * 100),
      unit: "chars",
    };
  }
  const max = limitWords(L)!;
  const n = wordsOf(answer);
  return {
    n,
    max,
    over: n > max,
    pct: Math.round((n / max) * 100),
    unit: "words",
  };
}

export function fitToLimit(
  answer: string | null | undefined,
  L: TenderResponseLimit | null | undefined
): { answer: string; trimmed: boolean } {
  if (!L || !answer) return { answer: answer || "", trimmed: false };
  const over = () => limitUsage(answer, L).over;
  if (!over()) return { answer, trimmed: false };
  const sentences = answer.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const s of sentences) {
    const cand = out ? out + " " + s : s;
    if (limitUsage(cand, L).over) break;
    out = cand;
  }
  if (!out || limitUsage(out, L).n < limitUsage(answer, L).max! * 0.5) {
    const w = answer.split(/\s+/);
    out = "";
    for (const x of w) {
      const cand = out ? out + " " + x : x;
      if (limitUsage(cand, L).over) break;
      out = cand;
    }
    out = out.replace(/[,;:\-–]$/, "") + (/[.!?]$/.test(out) ? "" : ".");
  }
  return { answer: out, trimmed: true };
}

type RowCells = string[] & { _yn?: boolean; _L?: TenderResponseLimit | null };

/** rows → questions. Detects header row (columns named ref/no/question/response/answer/section/word limit). */
export function fromRows(
  rows: unknown[][],
  _opts: Record<string, unknown> = {}
): TenderParsedRows {
  const hdrIdx = rows.findIndex(
    (r) =>
      r.some((c) => /question|requirement|criteria/i.test(String(c))) &&
      r.filter((c) => String(c).trim()).length >= 2
  );
  let qc = -1,
    rc = -1,
    ac = -1,
    sc = -1,
    wc = -1,
    tc = -1,
    lc = -1;
  if (hdrIdx >= 0) {
    (rows[hdrIdx] || []).forEach((c, i) => {
      const h = String(c).toLowerCase();
      if (qc < 0 && /question|requirement|criteria|description/.test(h)) qc = i;
      else if (rc < 0 && /^(ref|no\.?|id|number|#|q)/.test(h)) rc = i;
      else if (ac < 0 && /answer|response|supplier|bidder|your/.test(h)) ac = i;
      else if (sc < 0 && /section|category|area|theme/.test(h)) sc = i;
      else if (lc < 0 && /char|limit|max|length/.test(h) && !/word/.test(h))
        lc = i;
      else if (wc < 0 && /word/.test(h)) wc = i;
      else if (tc < 0 && /type|format/.test(h)) tc = i;
    });
  }
  const out: TenderQuestion[] = [];
  let section = "";
  let sectionLimit: TenderResponseLimit | null = null;
  let n = 0;

  rows.forEach((r, i) => {
    if (i <= hdrIdx) return;
    const cells = r.map((c) =>
      String(c == null ? "" : c).trim()
    ) as RowCells;
    if (!cells.some(Boolean)) return;

    if (
      cells.filter(Boolean).length === 1 &&
      out.length &&
      /^\s*[\(\[]?\s*(max|limit|word|char|no more|not exceed|response)/i.test(
        cells.find(Boolean)!
      ) &&
      cells.find(Boolean)!.length < 90
    ) {
      const L = parseLimit(cells.find(Boolean)!);
      const prev = out[out.length - 1];
      if (L && prev && (!prev.limit || prev.limit.inherited)) {
        prev.limit = L;
        prev.wordLimit = limitWords(L);
        return;
      }
    }

    let text =
      qc >= 0
        ? cells[qc]
        : cells.find((c) => looksLikeQuestion(c.replace(REFRE, ""))) || "";
    let ref = rc >= 0 ? cells[rc] : "";

    if (!text) {
      const first = cells.find(Boolean);
      if (first && cells.filter(Boolean).length === 1) {
        const L = parseLimit(first);
        if (
          L &&
          (L.clean!.length > 40 ||
            /^(all |your |each )?(responses?|answers?)\b/i.test(first))
        ) {
          sectionLimit = L;
          return;
        }
        section = (L ? L.clean! : first).replace(/^\s*section\s+/i, "").trim();
        sectionLimit = L;
      }
      return;
    }

    if (!ref) {
      const m = text.match(REFRE);
      if (m) {
        ref = m[1];
        text = text.slice(m[0].length).trim();
      }
    }

    let L = parseLimit(text);
    if (L) text = L.clean!;
    text = text
      .replace(/\s*yes\s*\/\s*no\s*$/i, () => {
        cells._yn = true;
        return "";
      })
      .trim();

    if (!L && lc >= 0 && cells[lc]) {
      const lcVal = String(cells[lc]);
      L =
        parseLimit(lcVal, true) ||
        (/^\d+$/.test(lcVal)
          ? {
              kind: /char/i.test(String((rows[hdrIdx] || [])[lc]))
                ? "chars"
                : "words",
              n: Number(lcVal),
              spaces: null,
              text: lcVal,
            }
          : null);
    }
    if (!L && wc >= 0 && cells[wc]) {
      const wcVal = String(cells[wc]);
      L =
        parseLimit(wcVal, true) ||
        (/^\d+$/.test(wcVal)
          ? {
              kind: "words",
              n: Number(wcVal),
              spaces: null,
              text: wcVal,
            }
          : null);
    }
    if (!L && sectionLimit) L = Object.assign({}, sectionLimit, { inherited: true });
    cells._L = L;

    if (!looksLikeQuestion(text) && qc < 0) {
      if (cells.filter(Boolean).length === 1) section = text;
      return;
    }

    n++;
    const wl = limitWords(cells._L);
    out.push({
      id: "q" + n,
      ref: ref || String(n),
      section: sc >= 0 ? String(cells[sc] ?? "") || section : section,
      text,
      type:
        (tc >= 0 && /yes|y\/n/i.test(String(cells[tc] ?? ""))) || cells._yn
          ? "yesno"
          : classify(text),
      wordLimit: wl,
      limit: cells._L || null,
      answer: ac >= 0 ? String(cells[ac] ?? "") : "",
      status: ac >= 0 && cells[ac] ? "edited" : "blank",
      confidence: 0,
      sources: [],
      hist: [],
      meta: {
        row: i,
        answerCol: ac >= 0 ? ac : null,
        refCol: rc,
        questionCol: qc,
      },
    });
  });

  return { questions: out, header: hdrIdx, answerCol: ac };
}

export function fromParagraphs(paras: TenderParagraph[]): TenderParsedRows {
  const rows = paras.map((p) => (p.table ? p.cells || [] : [p.text || ""]));
  return fromRows(rows);
}

export function fromText(text: string): TenderParsedRows {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim());
  const rows: string[][] = [];
  let buf = "";
  lines.forEach((l) => {
    if (!l) {
      if (buf) rows.push([buf]);
      buf = "";
      return;
    }
    if (
      (REFRE.test(l) ||
        /^(section|part|lot|schedule)\b/i.test(l) ||
        (/^[\(\[]?\s*(max|limit|word|char|no more|not exceed|response limit)/i.test(
          l
        ) &&
          l.length < 90)) &&
      buf
    ) {
      rows.push([buf]);
      buf = l;
    } else buf = buf ? buf + " " + l : l;
  });
  if (buf) rows.push([buf]);
  return fromRows(rows);
}

export type NewQuestionnaireMeta = {
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
  kind?: "questionnaire" | "tender";
  allowEmpty?: boolean;
};

export function newQuestionnaire(
  M: TenderRulesModel,
  meta: NewQuestionnaireMeta,
  parsed: TenderParsedRows | null | undefined,
  by?: string,
  now?: Date | null
): TenderQuestionnaire {
  const p = parsed || { questions: [], header: -1, answerCol: -1 };
  if (!p.questions.length && !meta.allowEmpty)
    throw new ValidationAppError(
      "No questions were recognised. Check the file has a question column or numbered questions."
    );
  const Q: TenderQuestionnaire = {
    id: uid("tq"),
    buyer: meta.buyer || "Unknown buyer",
    title: meta.title || "Questionnaire",
    reference: meta.reference || "",
    submissionEmail: meta.submissionEmail || "",
    buyerContact: meta.buyerContact || "",
    portalUrl: meta.portalUrl || "",
    source: meta.source || "portal",
    fileName: meta.fileName || null,
    fileId: meta.fileId || null,
    received: iso(now || today()),
    due: meta.due || null,
    owner: meta.owner || by || "",
    status: "new",
    kind: meta.kind || "questionnaire",
    requirements: [],
    documents: [],
    criteria: [],
    dates: {},
    pricing: null,
    questions: p.questions,
    layout: { header: p.header, answerCol: p.answerCol },
    exports: [],
    hist: [],
  };
  history(
    Q,
    `Imported ${Q.questions.length} questions from ${Q.source}${Q.fileName ? " · " + Q.fileName : ""}`,
    by,
    now
  );
  M.questionnaires.unshift(Q);
  log(
    M,
    `Imported ${Q.buyer} · ${Q.title} (${Q.questions.length} questions)`,
    by,
    now
  );
  return Q;
}

/* ---------------- tender pack extraction ---------------- */

const REQ =
  /\b(shall|must|is required to|are required to|will be required|required to|mandatory|at a minimum|as a minimum)\b/i;
const DESIR =
  /\b(should|desirable|preferred|ideally|where possible|encouraged)\b/i;

export function extractRequirements(
  paras: TenderParagraph[]
): TenderRequirement[] {
  const out: TenderRequirement[] = [];
  let section = "";
  let n = 0;
  paras.forEach((p) => {
    const t = (p.text || "").trim();
    if (!t) return;
    if (!p.table && t.length < 80 && !/[.?]$/.test(t) && !REQ.test(t)) {
      section = t.replace(/^\d+(\.\d+)*\s*/, "");
      return;
    }
    t.split(/(?<=[.;])\s+(?=[A-Z])/).forEach((s) => {
      s = s.trim();
      if (s.length < 25) return;
      if (
        /\b(tenders?|bids?|submissions?|questions?|clarifications?)\b.*\b(must|shall|should)\s+be\s+(submitted|received|returned|uploaded|sent|made)\b/i.test(
          s
        )
      )
        return;
      if (REQ.test(s)) {
        n++;
        const m = s.match(REFRE);
        out.push({
          id: "r" + n,
          ref: m?.[1] ?? String(n),
          section,
          text: m ? s.slice(m[0].length) : s,
          level: "mandatory",
          status: "unassessed",
          evidence: [],
          note: "",
        });
      } else if (
        DESIR.test(s) &&
        /\b(supplier|contractor|bidder|tenderer|provider|you)\b/i.test(s)
      ) {
        n++;
        const m = s.match(REFRE);
        out.push({
          id: "r" + n,
          ref: m?.[1] ?? String(n),
          section,
          text: m ? s.slice(m[0].length) : s,
          level: "desirable",
          status: "unassessed",
          evidence: [],
          note: "",
        });
      }
    });
  });
  return out;
}

export function extractCriteria(text: string): TenderCriterion[] {
  const out: TenderCriterion[] = [];
  const re =
    /([A-Z][a-z]+(?:\s+(?:and|&|[a-z]+)){0,3})\s*[\(:\-–—]?\s*(\d{1,3})\s*%/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(text))) {
    const name = String(m[1] ?? "")
      .trim()
      .replace(
        /\s+(accounts? for|is|are|carries|carry|weighted( at)?|worth|at|of|for|on)$/i,
        ""
      )
      .replace(/^(and|the)\s+/i, "");
    const w = Number(m[2] ?? 0);
    if (w <= 0 || w > 100 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, weight: w });
  }
  const tot = out.reduce((s, c) => s + c.weight, 0);
  return tot >= 90 && tot <= 110
    ? out
    : out.filter((c) =>
        /price|quality|technical|social|commercial|cost|value/i.test(c.name)
      );
}

const MONTHS =
  "january|february|march|april|may|june|july|august|september|october|november|december";

export function extractDates(text: string): TenderDates {
  const out: TenderDates = {};
  const dre = new RegExp(
    "(\\d{1,2})(?:st|nd|rd|th)?\\s+(" +
      MONTHS +
      ")\\s+(\\d{4})|(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})",
    "i"
  );
  const find = (re: RegExp): string | null => {
    const i = text.search(re);
    if (i < 0) return null;
    const win = text.slice(i, i + 220);
    const m = win.match(dre);
    if (!m) return null;
    if (m[1]) {
      const mo = MONTHS.split("|").indexOf(String(m[2] ?? "").toLowerCase()) + 1;
      return `${m[3]}-${pad(mo)}-${pad(Number(m[1]))}`;
    }
    return `${m[6]}-${pad(Number(m[5] ?? 0))}-${pad(Number(m[4] ?? 0))}`;
  };
  out.deadline = find(
    /(submission|return|closing|tender) (date|deadline)|deadline for (submission|return|receipt)|tenders? (must|to) be (submitted|returned)/i
  );
  out.clarifications = find(/clarification/i);
  out.contractStart = find(
    /contract (start|commencement)|commencement date|go-?live/i
  );
  return out;
}

export function pricingFromRows(
  rows: unknown[][]
): {
  lines: TenderPricingLine[];
  header: number;
  cols: Record<string, number>;
} | null {
  const hi = rows.findIndex(
    (r) =>
      r.some((c) => /qty|quantity/i.test(String(c))) &&
      r.some((c) => /rate|price|cost/i.test(String(c)))
  );
  if (hi < 0) return null;
  const H = (rows[hi] || []).map((c) => String(c).toLowerCase());
  const col = (re: RegExp) => H.findIndex((h) => re.test(h));
  const dc = (() => {
    const d = col(/description|activity|service|work/);
    return d >= 0 ? d : col(/item/);
  })();
  const uc = col(/unit|uom/);
  const qc = col(/qty|quantity/);
  const rc = col(/rate|unit price|price per/);
  const tc = col(/total|amount|value/);
  const lines: TenderPricingLine[] = [];
  rows.slice(hi + 1).forEach((r, i) => {
    const d =
      dc >= 0
        ? String(r[dc] || "").trim()
        : String(r.find((x) => x != null && String(x).trim()) || "").trim();
    if (!d) return;
    const qty = qc >= 0 ? Number(r[qc]) || 0 : 1;
    lines.push({
      id: "l" + (i + 1),
      description: d,
      unit: uc >= 0 ? String(r[uc] || "") : "",
      qty,
      rate: rc >= 0 && r[rc] !== "" && r[rc] != null ? Number(r[rc]) || 0 : null,
      category: "",
      buyerRow: hi + 1 + i,
      note: "",
    });
  });
  return lines.length
    ? { lines, header: hi, cols: { dc, uc, qc, rc, tc } }
    : null;
}

export function suggestRates(
  M: TenderRulesModel,
  lines: TenderPricingLine[]
): number {
  const idx: TenderIndex = {
    docs: (M.library.rates || []).map((r) => ({
      id: r.id,
      label: r.item,
      kind: "rate",
      toks: tokens(r.item + " " + (r.category || "") + " " + (r.unit || "")),
      tf: new Map(),
      norm: 1,
    })),
    idf: () => 0,
  };
  const df = new Map<string, number>();
  idx.docs.forEach((d) =>
    new Set(d.toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1))
  );
  const N = idx.docs.length || 1;
  idx.idf = (t) => Math.log(1 + N / (1 + (df.get(t) || 0)));
  idx.docs.forEach((d) => {
    d.tf = tf(d.toks);
    d.norm =
      Math.sqrt(
        [...d.tf].reduce((s, [t, c]) => s + Math.pow(c * idx.idf(t), 2), 0)
      ) || 1;
  });
  let n = 0;
  lines.forEach((l) => {
    if (l.rate != null && l.rate !== 0) return;
    const h = match(idx, l.description, 1)[0];
    if (h && h.score > 0.3) {
      const r = byId(M.library.rates, h.id);
      if (!r) return;
      l.rate = r.rate;
      l.unit = l.unit || r.unit;
      l.category = r.category || "";
      l.rateId = r.id;
      l.suggested = true;
      n++;
    }
  });
  return n;
}

export function priceTotals(P: TenderPricing): TenderPriceTotals {
  const lines = P.lines || [];
  const sub = lines.reduce(
    (s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0),
    0
  );
  const byCat: Record<string, number> = {};
  lines.forEach((l) => {
    const c = l.category || "Other";
    byCat[c] =
      (byCat[c] || 0) + (Number(l.qty) || 0) * (Number(l.rate) || 0);
  });
  const overhead = (sub * (Number(P.overheadPct) || 0)) / 100;
  const margin = ((sub + overhead) * (Number(P.marginPct) || 0)) / 100;
  const net = sub + overhead + margin;
  const vat = (net * (P.vatPct == null ? 20 : Number(P.vatPct))) / 100;
  return {
    sub,
    byCat,
    overhead,
    margin,
    net,
    vat,
    gross: net + vat,
    lines: lines.length,
    unpriced: lines.filter((l) => l.rate == null || (l.rate as unknown) === "")
      .length,
  };
}

export function setPricing(
  M: TenderRulesModel,
  qid: string,
  patch: Partial<TenderPricing> & {
    lines?: Array<Partial<TenderPricingLine> & { description?: string }>;
    suggest?: boolean;
  },
  by?: string,
  now?: Date | null
): TenderPricing {
  const Q = byId(M.questionnaires, qid);
  if (!Q) throw new NotFoundError("Not found");
  Q.pricing = Q.pricing || {
    lines: [],
    overheadPct: 0,
    marginPct: 0,
    vatPct: 20,
    currency: "GBP",
    notes: "",
  };
  const P = Q.pricing;
  if (patch.lines)
    P.lines = patch.lines.map((l, i) =>
      Object.assign(
        { id: "l" + (i + 1), description: "", unit: "", category: "" },
        l,
        {
          qty: Number(l.qty) || 0,
          rate:
            (l.rate as unknown) === "" || l.rate == null
              ? null
              : Number(l.rate),
        }
      )
    ) as TenderPricingLine[];
  (
    ["overheadPct", "marginPct", "vatPct", "currency", "notes", "basis"] as const
  ).forEach((k) => {
    if (patch[k] !== undefined)
      (P as Record<string, unknown>)[k] = patch[k];
  });
  if (patch.suggest) P.suggested = suggestRates(M, P.lines);
  history(Q, "Pricing updated · " + Q.pricing.lines.length + " lines", by, now);
  Q.priceTotals = priceTotals(P);
  return P;
}

export function assessRequirement(
  M: TenderRulesModel,
  qid: string,
  rid: string,
  patch: {
    status?: string;
    note?: string;
    evidence?: TenderRequirement["evidence"];
  },
  by?: string,
  now?: Date | null
): TenderRequirement {
  const Q = byId(M.questionnaires, qid);
  const r = Q && byId(Q.requirements || [], rid);
  if (!r) throw new NotFoundError("Not found");
  if (patch.status) {
    if (
      !(TENDER_REQUIREMENT_STATUSES as readonly string[]).includes(patch.status)
    )
      throw new ValidationAppError("Bad status");
    r.status = patch.status as TenderRequirement["status"];
  }
  if (patch.note !== undefined) r.note = patch.note;
  if (patch.evidence) r.evidence = patch.evidence;
  r.by = by;
  r.t = (now || new Date()).toISOString();
  return r;
}

export function autoAssess(M: TenderRulesModel, qid: string): number {
  const Q = byId(M.questionnaires, qid);
  if (!Q) return 0;
  const index = buildIndex(M);
  let n = 0;
  (Q.requirements || []).forEach((r) => {
    if (r.status !== "unassessed") return;
    const hits = match(index, r.text, 3);
    const ev = hits.filter((h) => h.score > 0.18);
    if (ev.length) {
      r.evidence = ev.map((h) => ({
        kind: h.kind,
        id: h.id,
        label: h.label,
      }));
      r.status = (ev[0]?.score ?? 0) > 0.32 ? "comply" : "partial";
      r.auto = true;
      n++;
    }
  });
  return n;
}

/** bid / no-bid gate: mandatory requirements, certificates valid at deadline, insurance, dates */
export function gate(
  M: TenderRulesModel,
  Q: TenderQuestionnaire,
  now?: Date | null
): TenderGateResult {
  const d = iso(now || today());
  const issues: TenderGateResult["issues"] = [];
  const checks: TenderGateResult["checks"] = [];
  const dl = Q.due || (Q.dates && Q.dates.deadline) || null;
  const needed = new Set(
    (Q.requirements || [])
      .filter((r) => r.level === "mandatory")
      .flatMap((r) =>
        (r.evidence || [])
          .filter((e) => e.kind === "certificate")
          .map((e) => e.id)
      )
  );
  (M.library.certificates || []).forEach((c) => {
    if (!c.expires) return;
    if (dl && c.expires < dl) {
      issues.push({
        sev: needed.has(c.id) ? "bad" : "warn",
        text: `${c.name} expires ${c.expires}, before the submission deadline${needed.has(c.id) ? " and is cited for a mandatory requirement" : ""}`,
      });
    }
  });
  const reqs = Q.requirements || [];
  const no = reqs.filter((r) => r.level === "mandatory" && r.status === "no");
  const un = reqs.filter(
    (r) => r.level === "mandatory" && r.status === "unassessed"
  );
  if (no.length)
    issues.push({
      sev: "bad",
      text: `${no.length} mandatory requirement(s) marked cannot comply`,
    });
  if (un.length)
    issues.push({
      sev: "warn",
      text: `${un.length} mandatory requirement(s) not yet assessed`,
    });
  const ni = Q.questions.filter((q) => q.status === "needs-input").length;
  if (ni)
    issues.push({ sev: "warn", text: `${ni} question(s) still need input` });
  if (dl) {
    const days = daysBetween(d, dl);
    if (days < 0)
      issues.push({ sev: "bad", text: "Submission deadline has passed" });
    else if (days <= 3)
      issues.push({
        sev: "warn",
        text: `Only ${days} day(s) to the deadline`,
      });
    checks.push({ ok: days >= 0, text: `Deadline ${dl}` });
  }
  const P = Q.pricing;
  if (P && P.lines && P.lines.length) {
    const t = priceTotals(P);
    if (t.unpriced)
      issues.push({
        sev: "warn",
        text: `${t.unpriced} pricing line(s) unpriced`,
      });
    checks.push({
      ok: !t.unpriced,
      text: `Pricing ${t.lines} lines · net ${Math.round(t.net).toLocaleString("en-GB")}`,
    });
  }
  checks.push({
    ok: !no.length,
    text: `${reqs.filter((r) => r.status === "comply").length}/${reqs.length} requirements comply`,
  });
  const score = Math.max(
    0,
    100 - issues.reduce((s, i) => s + (i.sev === "bad" ? 35 : 10), 0)
  );
  return {
    score,
    verdict: issues.some((i) => i.sev === "bad")
      ? "no-bid-risk"
      : score >= 80
        ? "bid"
        : "review",
    issues,
    checks,
  };
}

export function addPackDocument(
  M: TenderRulesModel,
  qid: string,
  doc: {
    kind?: string;
    name?: string;
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
  },
  by?: string,
  now?: Date | null
): TenderPackDocument {
  const Q = byId(M.questionnaires, qid);
  if (!Q) throw new NotFoundError("Not found");
  Q.documents = Q.documents || [];
  const dd = Object.assign(
    { id: uid("doc"), t: (now || new Date()).toISOString(), by: by || "" },
    doc
  ) as TenderPackDocument;
  Q.documents.push(dd);
  if (doc.requirements && doc.requirements.length) {
    Q.requirements = (Q.requirements || []).concat(
      doc.requirements.map((r, i) =>
        Object.assign({}, r, {
          id: "r" + ((Q.requirements || []).length + i + 1),
          docId: dd.id,
        })
      )
    );
  }
  if (doc.questions && doc.questions.length) {
    const base = Q.questions.length;
    Q.questions = Q.questions.concat(
      doc.questions.map((q, i) =>
        Object.assign({}, q, { id: "q" + (base + i + 1), docId: dd.id })
      )
    );
  }
  if (doc.criteria && doc.criteria.length && !(Q.criteria || []).length)
    Q.criteria = doc.criteria;
  if (doc.dates) {
    Q.dates = Object.assign(
      {},
      Q.dates,
      Object.fromEntries(
        Object.entries(doc.dates).filter(([, v]) => v)
      )
    );
    if (!Q.due && Q.dates.deadline) Q.due = Q.dates.deadline;
  }
  if (doc.pricing) {
    Q.pricing = Q.pricing || {
      lines: [],
      overheadPct: 0,
      marginPct: 0,
      vatPct: 20,
      currency: "GBP",
    };
    Q.pricing.lines = doc.pricing.lines;
    Q.pricing.buyerSheet = {
      docId: dd.id,
      header: doc.pricing.header,
      cols: doc.pricing.cols,
    };
    Q.pricing.suggested = suggestRates(M, Q.pricing.lines);
    Q.priceTotals = priceTotals(Q.pricing);
  }
  history(
    Q,
    `Added ${doc.kind || "document"} ${doc.name || ""}: ${(doc.requirements || []).length} requirements, ${(doc.questions || []).length} questions${doc.pricing ? ", " + doc.pricing.lines.length + " pricing lines" : ""}`,
    by,
    now
  );
  log(
    M,
    `${Q.buyer}: pack document added · ${doc.name || doc.kind}`,
    by,
    now
  );
  return dd;
}

/** classify a parsed document of a pack */
export function analyseDocument(
  name: string,
  source: string,
  paras: TenderParagraph[] | null | undefined,
  rows?: unknown[][] | null
): TenderAnalysedDocument {
  const text =
    (paras || []).map((p) => p.text).join("\n") ||
    (rows || []).map((r) => r.join(" ")).join("\n");
  const out: TenderAnalysedDocument = {
    name,
    source,
    kind: "document",
    criteria: extractCriteria(text),
    dates: extractDates(text),
  };
  if (rows) {
    const pr = pricingFromRows(rows);
    if (pr) {
      out.kind = "pricing";
      out.pricing = pr;
      return out;
    }
    const qs = fromRows(rows);
    if (qs.questions.length >= 2) {
      out.kind = "questionnaire";
      out.questions = qs.questions;
      out.answerCol = qs.answerCol;
    }
    return out;
  }
  const qs = fromParagraphs(paras || []);
  const reqs = extractRequirements(paras || []);
  if (qs.questions.length) {
    out.questions = qs.questions;
    if (qs.questions.length >= 3 && qs.questions.length >= reqs.length / 2)
      out.kind = "questionnaire";
  }
  if (reqs.length) {
    out.requirements = reqs;
    if (out.kind === "document")
      out.kind = (reqs.length >= 5
        ? "specification"
        : "instructions") as TenderDocumentKind;
  }
  return out;
}

export function bidBlocks(
  M: TenderRulesModel,
  Q: TenderQuestionnaire
): TenderBidBlock[] {
  const b: TenderBidBlock[] = [
    { h1: `${Q.title}` },
    {
      meta: `Tender response by ${M.org} to ${Q.buyer} · prepared in iMS OS · ${new Date().toISOString().slice(0, 10)}`,
    },
  ];
  const f = M.facts || {};
  b.push({ h: "Executive summary" });
  b.push({
    p: `${f.company || M.org} is pleased to submit this response${Q.due ? " ahead of the deadline of " + Q.due : ""}. ${f.employees ? "We employ " + f.employees + " people" : "We are an established provider"}${f.sites ? " across " + f.sites : ""}${f.turnover ? " with a turnover of " + f.turnover : ""}, holding ${(M.library.certificates || [])
      .filter((c) => c.standard)
      .slice(0, 4)
      .map((c) => c.standard)
      .join(", ")}. Our response below addresses every requirement and question in the pack; certificates and policies referenced are attached as appendices.`,
  });
  if ((Q.criteria || []).length) {
    b.push({ h: "Evaluation criteria" });
    b.push({
      p: Q.criteria.map((c) => `${c.name}: ${c.weight}%`).join(" · "),
    });
  }
  if ((Q.requirements || []).length) {
    b.push({ h: "Compliance statement" });
    const statusLabel: Record<string, string> = {
      comply: "Comply",
      partial: "Partially comply",
      no: "Do not comply",
      unassessed: "To be confirmed",
    };
    Q.requirements.forEach((r) =>
      b.push({
        p: `${r.ref}  ${r.text}\nResponse: ${statusLabel[r.status]}${r.note ? " — " + r.note : ""}${(r.evidence || []).length ? " (evidence: " + r.evidence.map((e) => e.label).join("; ") + ")" : ""}`,
      })
    );
  }
  let sec: string | null = null;
  if (Q.questions.length) {
    b.push({ h: "Responses" });
    Q.questions.forEach((q) => {
      if (q.section && q.section !== sec) {
        sec = q.section;
        b.push({ h: sec });
      }
      b.push({ h: `${q.ref}  ${q.text}` });
      b.push({ p: q.answer || "[No response]" });
    });
  }
  if (Q.pricing && Q.pricing.lines && Q.pricing.lines.length) {
    const t = priceTotals(Q.pricing);
    const cur =
      Q.pricing.currency === "GBP"
        ? "£"
        : (Q.pricing.currency || "") + " ";
    b.push({ h: "Pricing summary" });
    b.push({
      p: `Net total ${cur}${t.net.toLocaleString("en-GB", { maximumFractionDigits: 2 })} excluding VAT (${t.lines} lines${t.unpriced ? ", " + t.unpriced + " unpriced" : ""}). ${Q.pricing.basis || ""}The full priced schedule is provided separately.`,
    });
  }
  b.push({ h: "Appendices" });
  (M.library.certificates || []).forEach((c) =>
    b.push({
      p: `• ${c.name} (${c.body || ""} ${c.number || ""}, valid to ${c.expires || "—"})`,
    })
  );
  (M.library.policies || []).forEach((p) =>
    b.push({
      p: `• ${p.name} (${p.ref || ""} v${p.version || "1"})`,
    })
  );
  return b;
}

export function pricingRows(Q: TenderQuestionnaire): (string | number)[][] {
  const P = Q.pricing || {
    lines: [],
    overheadPct: 0,
    marginPct: 0,
    vatPct: 20,
    currency: "GBP",
  };
  const t = priceTotals(P);
  const rows: (string | number)[][] = [
    ["Item", "Description", "Unit", "Qty", "Rate", "Total", "Category"],
  ];
  (P.lines || []).forEach((l, i) =>
    rows.push([
      i + 1,
      l.description,
      l.unit || "",
      l.qty,
      l.rate == null ? "" : l.rate,
      Math.round((l.qty || 0) * (l.rate || 0) * 100) / 100,
      l.category || "",
    ])
  );
  rows.push(["", "Subtotal", "", "", "", Math.round(t.sub * 100) / 100, ""]);
  if (P.overheadPct)
    rows.push([
      "",
      `Overheads ${P.overheadPct}%`,
      "",
      "",
      "",
      Math.round(t.overhead * 100) / 100,
      "",
    ]);
  if (P.marginPct)
    rows.push([
      "",
      `Margin ${P.marginPct}%`,
      "",
      "",
      "",
      Math.round(t.margin * 100) / 100,
      "",
    ]);
  rows.push([
    "",
    "Net total (excl. VAT)",
    "",
    "",
    "",
    Math.round(t.net * 100) / 100,
    "",
  ]);
  rows.push([
    "",
    `VAT ${P.vatPct == null ? 20 : P.vatPct}%`,
    "",
    "",
    "",
    Math.round(t.vat * 100) / 100,
    "",
  ]);
  rows.push([
    "",
    "Gross total",
    "",
    "",
    "",
    Math.round(t.gross * 100) / 100,
    "",
  ]);
  return rows;
}

export function upsertService(
  M: TenderRulesModel,
  s: Partial<TenderService> & { name?: string; description?: string },
  by?: string,
  now?: Date | null
): TenderService {
  if (!s.name || !s.description)
    throw new ValidationAppError("Name and description are required");
  let x = s.id ? byId(M.library.services, s.id) : undefined;
  if (x) {
    Object.assign(x, s);
    history(x, "Updated", by, now);
    return x;
  }
  x = Object.assign(
    {
      id: uid("svc"),
      hist: [] as TenderHistoryEntry[],
      tags: guessTags(s.name + " " + s.description),
      people: [] as string[],
    },
    s
  ) as TenderService;
  history(x, "Added", by, now);
  (M.library.services = M.library.services || []).unshift(x);
  log(M, "Service added: " + x.name, by, now);
  return x;
}

export function upsertCase(
  M: TenderRulesModel,
  c: Partial<TenderCaseStudy> & { client?: string; title?: string },
  by?: string,
  now?: Date | null
): TenderCaseStudy {
  if (!c.client || !c.title)
    throw new ValidationAppError("Client and title are required");
  let x = c.id ? byId(M.library.cases, c.id) : undefined;
  if (x) {
    Object.assign(x, c);
    history(x, "Updated", by, now);
    return x;
  }
  x = Object.assign(
    {
      id: uid("case"),
      hist: [] as TenderHistoryEntry[],
      tags: guessTags(c.title + " " + (c.summary || "")),
    },
    c
  ) as TenderCaseStudy;
  history(x, "Added", by, now);
  (M.library.cases = M.library.cases || []).unshift(x);
  log(M, "Case study added: " + x.client + " · " + x.title, by, now);
  return x;
}

export function upsertRate(
  M: TenderRulesModel,
  r: Partial<TenderRate> & { item?: string; rate?: number | string },
  by?: string,
  now?: Date | null
): TenderRate {
  if (!r.item || r.rate == null || isNaN(Number(r.rate)))
    throw new ValidationAppError("Item and a numeric rate are required");
  let x = r.id ? byId(M.library.rates, r.id) : undefined;
  if (x) {
    Object.assign(x, r, { rate: Number(r.rate) });
    return x;
  }
  x = Object.assign({ id: uid("rate") }, r, {
    rate: Number(r.rate),
  }) as TenderRate;
  (M.library.rates = M.library.rates || []).unshift(x);
  log(M, "Rate added: " + x.item, by, now);
  return x;
}

/* ---------------- workflow ---------------- */

export function qStatus(Q: TenderQuestionnaire): string {
  const s = Q.questions.map((q) => q.status);
  if (!s.length)
    return (Q.requirements || []).length || (Q.documents || []).length
      ? "drafting"
      : "new";
  if (s.every((x) => x === "approved")) return "ready";
  if (s.every((x) => ["approved", "accepted"].includes(x))) return "review";
  if (s.some((x) => x !== "blank")) return "drafting";
  return "new";
}

export function updateBid(
  M: TenderRulesModel,
  qid: string,
  patch: Record<string, unknown>,
  by?: string,
  now?: Date | null
): TenderQuestionnaire {
  const Q = byId(M.questionnaires, qid);
  if (!Q) throw new NotFoundError("Not found");
  (
    [
      "buyer",
      "title",
      "due",
      "owner",
      "reference",
      "submissionEmail",
      "buyerContact",
      "portalUrl",
      "notes",
    ] as const
  ).forEach((k) => {
    if (patch[k] !== undefined)
      (Q as Record<string, unknown>)[k] = patch[k];
  });
  if (
    Q.submissionEmail &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(Q.submissionEmail)
  )
    throw new ValidationAppError("Submission email is not valid");
  history(Q, "Details updated", by, now);
  return Q;
}

export function setAnswer(
  M: TenderRulesModel,
  qid: string,
  questionId: string,
  patch: {
    answer?: string | null;
    assignee?: string | null;
    note?: string;
  },
  by?: string,
  now?: Date | null
): TenderQuestion {
  const Q = byId(M.questionnaires, qid);
  const q = Q && byId(Q.questions, questionId);
  if (!q) throw new NotFoundError("Question not found");
  if (patch.answer != null && patch.answer !== q.answer) {
    q.answer = String(patch.answer);
    q.status = "edited";
    history(q, "Edited", by, now);
  }
  if (patch.assignee !== undefined) {
    q.assignee = patch.assignee || null;
    if (q.assignee) {
      q.status = "needs-input";
      history(
        q,
        "Asked " + q.assignee + (patch.note ? ": " + patch.note : ""),
        by,
        now
      );
    }
  }
  if (patch.note !== undefined) q.note = patch.note;
  Q!.status = qStatus(Q!);
  return q;
}

export function accept(
  M: TenderRulesModel,
  qid: string,
  questionId: string,
  by?: string,
  now?: Date | null
): TenderQuestion {
  const Q = byId(M.questionnaires, qid);
  if (!Q) throw new NotFoundError("Not found");
  const q = byId(Q.questions, questionId);
  if (!q) throw new NotFoundError("Question not found");
  if (!q.answer) throw new ValidationAppError("Nothing to accept");
  if (q.status === "approved") return q;
  q.status = "accepted";
  history(q, "Accepted", by, now);
  Q.status = qStatus(Q);
  return q;
}

export function approve(
  M: TenderRulesModel,
  qid: string,
  questionIds: string[] | null | undefined,
  by?: string,
  now?: Date | null,
  role?: string | null
): { approved: number; status: string } {
  if (role && !["approver", "admin"].includes(role))
    throw new ForbiddenError("Only an approver can approve answers");
  const Q = byId(M.questionnaires, qid);
  if (!Q) throw new NotFoundError("Not found");
  let n = 0;
  Q.questions.forEach((q) => {
    if (questionIds && !questionIds.includes(q.id)) return;
    if (!q.answer || q.status === "approved") return;
    q.status = "approved";
    q.approvedBy = by;
    q.approvedAt = (now || new Date()).toISOString();
    history(q, "Approved", by, now);
    n++;
    if (M.settings.learn !== false) learn(M, Q, q, by, now);
  });
  Q.status = qStatus(Q);
  log(M, `Approved ${n} answers · ${Q.buyer}`, by, now);
  return { approved: n, status: Q.status };
}

export function learn(
  M: TenderRulesModel,
  Q: TenderQuestionnaire,
  q: TenderQuestion,
  by?: string,
  now?: Date | null
): TenderLibraryAnswer | null {
  if (
    !q.answer ||
    q.answer.trim().length < 40 ||
    /^\[?see attached/i.test(q.answer)
  )
    return null;
  const norm = (s: string) => tokens(s).join(" ");
  const same = M.library.answers.find(
    (a) => norm(a.question) === norm(q.text)
  );
  const idx = buildIndex(M);
  const hit = same
    ? { id: same.id }
    : match(idx, q.text, 8).find(
        (h) => h.kind === "answer" && h.score > 0.55
      );
  const d = iso(now || today());
  if (hit) {
    const a = byId(M.library.answers, hit.id)!;
    if (a.answer !== q.answer) {
      a.answer = q.answer;
      history(a, "Updated from " + Q.buyer, by, now);
    }
    a.approvedBy = by;
    a.approvedAt = d;
    a.reviewBy = iso(
      addMonths(parse(d), M.settings.reviewMonths || 12)
    );
    a.uses = (a.uses || 0) + 1;
    return a;
  }
  const a: TenderLibraryAnswer = {
    id: uid("ans"),
    question: q.text,
    answer: q.answer,
    tags: guessTags(q.text),
    standards: guessStandards(q.text + " " + q.answer),
    owner: by || "",
    approvedBy: by,
    approvedAt: d,
    reviewBy: iso(addMonths(parse(d), M.settings.reviewMonths || 12)),
    uses: 1,
    source: { qid: Q.id, buyer: Q.buyer },
    evidence: (q.sources || [])
      .filter((s) => s.kind !== "answer")
      .map((s) => ({ kind: s.kind, id: s.id })),
    hist: [],
  };
  history(a, "Learned from " + Q.buyer + " · " + Q.title, by, now);
  M.library.answers.unshift(a);
  return a;
}

export function guessTags(t: string): string[] {
  const tags: string[] = [];
  const T = t.toLowerCase();
  (
    [
      ["health & safety", /safety|accident|riddor|hazard/],
      ["quality", /quality|iso 9001|non-?conform|complaint/],
      ["environment", /environment|carbon|waste|iso 14001|emission/],
      [
        "information security",
        /information security|cyber|data|gdpr|iso 27001|breach/,
      ],
      ["modern slavery", /slavery|trafficking|ethical/],
      ["insurance", /insurance|indemnity|liability/],
      ["business continuity", /continuity|disaster|resilience/],
      ["equality & diversity", /equal|divers|inclusi/],
      ["anti-bribery", /briber|corruption|gift/],
      ["supply chain", /supplier|subcontract|supply chain/],
      ["social value", /social value|community|apprentice/],
      ["financial", /turnover|accounts|financial|credit/],
    ] as Array<[string, RegExp]>
  ).forEach(([k, re]) => {
    if (re.test(T)) tags.push(k);
  });
  return tags.length ? tags : ["general"];
}

export function guessStandards(t: string): string[] {
  const s = new Set<string>();
  (t.match(/ISO\s?\d{4,5}/gi) || []).forEach((x) =>
    s.add(x.replace(/\s+/, " ").toUpperCase().replace("ISO", "ISO "))
  );
  if (/cyber essentials/i.test(t)) s.add("Cyber Essentials");
  if (/safecontractor|chas|constructionline|ssip/i.test(t)) s.add("SSIP");
  return [...s];
}

/* ---------------- library health ---------------- */

export function isStale(
  M: TenderRulesModel,
  a: TenderLibraryAnswer,
  now?: Date | null
): boolean {
  const d = iso(now || today());
  return !!(a.reviewBy && a.reviewBy < d);
}

export function libraryHealth(
  M: TenderRulesModel,
  now?: Date | null
): TenderLibraryHealth {
  const d = iso(now || today());
  const A = M.library.answers || [];
  const Cc = M.library.certificates || [];
  const P = M.library.policies || [];
  const warn = M.settings.certWarnDays || 60;
  return {
    answers: A.length,
    approved: A.filter((a) => a.approvedAt).length,
    stale: A.filter((a) => isStale(M, a, now)).map((a) => a.id),
    certificates: Cc.length,
    certsExpiring: Cc.filter(
      (c) =>
        c.expires &&
        daysBetween(d, c.expires) <= warn &&
        daysBetween(d, c.expires) >= 0
    ).map((c) => c.id),
    certsExpired: Cc.filter((c) => c.expires && c.expires < d).map(
      (c) => c.id
    ),
    policies: P.length,
    policiesOverdue: P.filter((p) => p.nextReview && p.nextReview < d).map(
      (p) => p.id
    ),
  };
}

export function stats(
  M: TenderRulesModel,
  now?: Date | null
): TenderStats {
  const Qs = M.questionnaires || [];
  const open = Qs.filter((q) => q.status !== "submitted");
  const allQ = open.flatMap((q) => q.questions);
  const n = (s: TenderQuestionStatus) =>
    allQ.filter((q) => q.status === s).length;
  const d = iso(now || today());
  return {
    open: open.length,
    dueSoon: open.filter((q) => q.due && daysBetween(d, q.due) <= 7)
      .length,
    questions: allQ.length,
    approved: n("approved"),
    accepted: n("accepted"),
    draft: n("draft") + n("edited"),
    needsInput: n("needs-input"),
    blank: n("blank"),
    library: libraryHealth(M, now),
  };
}

export function coverage(Q: TenderQuestionnaire): TenderCoverage {
  const n = Q.questions.length || 1;
  const c = (s: TenderQuestionStatus) =>
    Q.questions.filter((q) => q.status === s).length;
  return {
    n,
    approved: c("approved"),
    accepted: c("accepted"),
    draft: c("draft") + c("edited"),
    needsInput: c("needs-input"),
    blank: c("blank"),
    pct: Math.round((c("approved") / n) * 100),
    avgConf: Math.round(
      (Q.questions.reduce((s, q) => s + (q.confidence || 0), 0) / n) * 100
    ),
  };
}

/* ---------------- export / submit ---------------- */

export function exportRows(
  Q: TenderQuestionnaire,
  _opts: Record<string, unknown> = {}
): string[][] {
  const rows: string[][] = [
    [
      "Ref",
      "Section",
      "Question",
      "Limit",
      "Response",
      "Count",
      "Status",
      "Evidence",
    ],
  ];
  Q.questions.forEach((q) => {
    const u = limitUsage(
      q.answer,
      q.limit ||
        (q.wordLimit
          ? { kind: "words", n: q.wordLimit, spaces: null }
          : null)
    );
    rows.push([
      q.ref,
      q.section || "",
      q.text,
      q.limit
        ? limitLabel(q.limit)
        : q.wordLimit
          ? "max " + q.wordLimit + " words"
          : "",
      q.answer || "",
      u.max ? `${u.n}/${u.max} ${u.unit}` : `${u.n} words`,
      q.status,
      (q.sources || [])
        .filter((s) => s.kind !== "answer")
        .map((s) => s.label)
        .join("; "),
    ]);
  });
  return rows;
}

export function exportBlocks(
  M: TenderRulesModel,
  Q: TenderQuestionnaire
): TenderBidBlock[] {
  const b: TenderBidBlock[] = [
    { h1: `${Q.title} — response` },
    {
      meta: `${M.org} for ${Q.buyer} · ${Q.questions.length} questions · exported ${new Date().toISOString().slice(0, 10)} from iMS OS`,
    },
  ];
  let sec: string | null = null;
  Q.questions.forEach((q) => {
    if (q.section && q.section !== sec) {
      sec = q.section;
      b.push({ h: sec });
    }
    b.push({ h: `${q.ref}  ${q.text}` });
    b.push({ p: q.answer || "[No response]" });
  });
  return b;
}

export function recordExport(
  M: TenderRulesModel,
  qid: string,
  format: string,
  by?: string,
  now?: Date | null
): TenderExportRecord {
  const Q = byId(M.questionnaires, qid);
  if (!Q) throw new NotFoundError("Not found");
  Q.exports.push({
    t: (now || new Date()).toISOString(),
    by: by || "system",
    format,
    questions: Q.questions.length,
    approved: Q.questions.filter((q) => q.status === "approved").length,
  });
  history(Q, "Exported " + format, by, now);
  log(M, `Exported ${Q.buyer} · ${Q.title} as ${format}`, by, now);
  return Q.exports[Q.exports.length - 1]!;
}

export function submissionPackage(
  M: TenderRulesModel,
  Q: TenderQuestionnaire
): TenderSubmissionPackage {
  const certs = (M.library.certificates || []).filter((c) => c.fileId);
  return {
    to: Q.submissionEmail || "",
    subject: `Tender submission: ${Q.title} — ${M.org}${Q.reference ? " (ref " + Q.reference + ")" : ""}`,
    body: `Dear ${Q.buyerContact || "Sir or Madam"},\n\nPlease find attached our submission for ${Q.title}${Q.reference ? " (your reference " + Q.reference + ")" : ""}.\n\nAttached:\n• Tender response (Word)\n• Completed pricing schedule (Excel)\n• Completed questionnaire (Excel)${certs.length ? "\n• Certificates: " + certs.map((c) => c.name).join(", ") : ""}\n\nWe confirm that the information provided is accurate at the date of submission and that our certifications are current. Please acknowledge receipt.\n\nKind regards,\n${Q.owner || ""}\n${M.org}`,
    attachments: [
      "response.docx",
      "pricing.xlsx",
      "questionnaire.xlsx",
      ...certs.map((c) => c.fileName || c.name),
    ],
  };
}

export function canSubmit(
  M: TenderRulesModel,
  Q: TenderQuestionnaire,
  now?: Date | null
): TenderCanSubmitResult {
  const errs: string[] = [];
  if (!Q.submissionEmail && !Q.portalUrl)
    errs.push("No submission email or portal set");
  if (Q.questions.some((q) => q.status !== "approved"))
    errs.push(
      Q.questions.filter((q) => q.status !== "approved").length +
        " answer(s) not approved"
    );
  const g = gate(M, Q, now);
  g.issues
    .filter((i) => i.sev === "bad")
    .forEach((i) => errs.push(i.text));
  if (
    (Q.requirements || []).some(
      (r) => r.level === "mandatory" && r.status === "unassessed"
    )
  )
    errs.push("Mandatory requirements not all assessed");
  if (
    Q.pricing &&
    Q.pricing.lines &&
    Q.pricing.lines.length &&
    priceTotals(Q.pricing).unpriced
  )
    errs.push("Pricing incomplete");
  return { ok: !errs.length, errs };
}

export function markSubmitted(
  M: TenderRulesModel,
  qid: string,
  by?: string,
  now?: Date | null,
  how?: string | null
): TenderQuestionnaire {
  const Q = byId(M.questionnaires, qid);
  if (!Q) throw new NotFoundError("Not found");
  Q.status = "submitted";
  Q.submitted = iso(now || today());
  Q.submittedVia = how || "manual";
  history(
    Q,
    how === "email"
      ? "Submitted by email to " + Q.submissionEmail
      : "Marked submitted",
    by,
    now
  );
  log(M, `Submitted ${Q.buyer} · ${Q.title}`, by, now);
  return Q;
}

/* ---------------- library CRUD ---------------- */

export function upsertAnswer(
  M: TenderRulesModel,
  a: Partial<TenderLibraryAnswer> & {
    question?: string;
    answer?: string;
    approve?: boolean;
  },
  by?: string,
  now?: Date | null
): TenderLibraryAnswer {
  const errs: string[] = [];
  if (!a.question || a.question.trim().length < 8)
    errs.push("Question is required");
  if (!a.answer || !a.answer.trim()) errs.push("Answer is required");
  if (errs.length) throw new ValidationAppError(errs.join(" · "));
  let x = a.id ? byId(M.library.answers, a.id) : undefined;
  const d = iso(now || today());
  if (x) {
    Object.assign(x, {
      question: a.question,
      answer: a.answer,
      tags: a.tags || x.tags,
      standards: a.standards || x.standards,
      owner: a.owner || x.owner,
    });
    if (a.approve) {
      x.approvedBy = by;
      x.approvedAt = d;
      x.reviewBy = iso(
        addMonths(parse(d), M.settings.reviewMonths || 12)
      );
    }
    history(x, "Updated", by, now);
    return x;
  }
  x = {
    id: uid("ans"),
    question: a.question!,
    answer: a.answer!,
    tags: a.tags && a.tags.length ? a.tags : guessTags(a.question!),
    standards:
      a.standards || guessStandards(a.question! + " " + a.answer!),
    owner: a.owner || by || "",
    uses: 0,
    evidence: a.evidence || [],
    hist: [],
  };
  if (a.approve) {
    x.approvedBy = by;
    x.approvedAt = d;
    x.reviewBy = iso(
      addMonths(parse(d), M.settings.reviewMonths || 12)
    );
  }
  history(x, "Added", by, now);
  M.library.answers.unshift(x);
  log(
    M,
    "Library answer added: " + x.question.slice(0, 60),
    by,
    now
  );
  return x;
}

export function removeAnswer(
  M: TenderRulesModel,
  id: string,
  by?: string,
  now?: Date | null
): void {
  const i = M.library.answers.findIndex((a) => a.id === id);
  if (i < 0) throw new NotFoundError("Not found");
  const [a] = M.library.answers.splice(i, 1);
  log(M, "Library answer removed: " + (a?.question ?? "").slice(0, 60), by, now);
}

export function upsertCertificate(
  M: TenderRulesModel,
  c: Partial<TenderCertificate> & { name?: string },
  by?: string,
  now?: Date | null
): TenderCertificate {
  if (!c.name) throw new ValidationAppError("Name is required");
  if (c.expires && !/^\d{4}-\d{2}-\d{2}$/.test(c.expires))
    throw new ValidationAppError("Expiry must be a date");
  let x = c.id ? byId(M.library.certificates, c.id) : undefined;
  if (x) {
    Object.assign(x, c);
    history(x, "Updated", by, now);
    return x;
  }
  x = Object.assign({ id: uid("cert"), hist: [] }, c) as TenderCertificate;
  history(x, "Added", by, now);
  M.library.certificates.unshift(x);
  log(M, "Certificate added: " + x.name, by, now);
  return x;
}

export function upsertPolicy(
  M: TenderRulesModel,
  p: Partial<TenderPolicy> & { name?: string },
  by?: string,
  now?: Date | null
): TenderPolicy {
  if (!p.name) throw new ValidationAppError("Name is required");
  let x = p.id ? byId(M.library.policies, p.id) : undefined;
  if (x) {
    Object.assign(x, p);
    history(x, "Updated", by, now);
    return x;
  }
  x = Object.assign({ id: uid("pol"), hist: [] }, p) as TenderPolicy;
  history(x, "Added", by, now);
  M.library.policies.unshift(x);
  log(M, "Policy added: " + x.name, by, now);
  return x;
}

export function removeItem(
  M: TenderRulesModel,
  kind: TenderLibraryKind | string,
  id: string,
  by?: string,
  now?: Date | null
): void {
  if (
    ![
      "answers",
      "certificates",
      "policies",
      "services",
      "cases",
      "rates",
    ].includes(kind)
  )
    throw new ValidationAppError("Bad kind");
  const arr = M.library[kind as TenderLibraryKind] as Array<{
    id: string;
    name?: string;
    question?: string;
  }>;
  const i = (arr || []).findIndex((x) => x.id === id);
  if (i < 0) throw new NotFoundError("Not found");
  const [x] = arr.splice(i, 1);
  log(M, `${kind} removed: ${x?.name || x?.question}`, by, now);
}

export function updateSettings(
  M: TenderRulesModel,
  s: Partial<TenderSettings>,
  by?: string,
  now?: Date | null
): TenderSettings {
  M.settings = Object.assign({}, DEFAULT_SETTINGS, M.settings, s);
  log(M, "Settings updated", by, now);
  return M.settings;
}

export function updateFacts(
  M: TenderRulesModel,
  f: TenderFacts,
  by?: string,
  now?: Date | null
): TenderFacts {
  M.facts = Object.assign({}, M.facts, f);
  Object.keys(M.facts).forEach((k) => {
    if (M.facts[k] === "" || M.facts[k] == null) delete M.facts[k];
  });
  log(M, "Company facts updated", by, now);
  return M.facts;
}
