import type {
  AslCriticality,
  AslDocState,
  AslDocument,
  AslSupplier,
} from "../types";

/** Required-doc matrix (display mirror of backend asl-rules). */
export const REQ: Record<AslCriticality, string[]> = {
  Critical: [
    "Insurance (PL/EL)",
    "ISO certificate|SSIP (CHAS/SafeContractor)|UKAS schedule|Cyber Essentials",
    "Signed requirements / T&Cs",
  ],
  High: [
    "Insurance (PL/EL)",
    "Signed requirements / T&Cs|Data processing agreement",
  ],
  Standard: ["Insurance (PL/EL)"],
};

export const CATREQ: Record<string, string[]> = {
  "Contractor on site": [
    "Insurance (PL/EL)",
    "RAMS",
    "SSIP (CHAS/SafeContractor)|Competence / trade card",
    "Signed requirements / T&Cs",
  ],
  "IT / data processor": [
    "Insurance (PL/EL)",
    "Data processing agreement",
    "Cyber Essentials|ISO certificate",
  ],
};

export function requiredDocsFor(
  supplier: Pick<AslSupplier, "crit" | "cat">
): string[] {
  const set = new Set(REQ[supplier.crit] ?? REQ.Standard);
  for (const r of CATREQ[supplier.cat] ?? []) set.add(r);
  return [...set];
}

export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(dateIso: string, today = startOfToday()): number {
  const target = new Date(dateIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function docState(
  doc: Pick<AslDocument, "exp">,
  leadDays: number,
  today = startOfToday()
): AslDocState {
  if (!doc.exp) return "missing";
  const n = daysUntil(doc.exp, today);
  if (n < 0) return "expired";
  if (n <= leadDays) return "soon";
  return "ok";
}

export function formatReqLabel(req: string): string {
  return req.replace(/\|/g, " or ");
}

export function lastEval(supplier: Pick<AslSupplier, "evals">) {
  if (!supplier.evals.length) return null;
  return [...supplier.evals].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
}

function addMonths(dateIso: string, months: number): string {
  const d = new Date(dateIso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Manual evalDue overrides computed lastEval/appon + criticality interval. */
export function nextEvalDate(
  supplier: Pick<AslSupplier, "evals" | "appon" | "crit" | "evalDue">,
  interval: Record<AslCriticality, number>
): string | null {
  if (supplier.evalDue?.trim()) return supplier.evalDue.trim();
  const last = lastEval(supplier);
  const base = last?.date ?? supplier.appon;
  if (!base) return null;
  return addMonths(base, interval[supplier.crit] ?? 12);
}

export function docStateLabel(state: AslDocState): string {
  switch (state) {
    case "missing":
      return "Missing";
    case "expired":
      return "Expired";
    case "soon":
      return "Expiring soon";
    case "ok":
      return "Valid";
  }
}

export const ASL_VIEW_LABELS: Record<string, string> = {
  overview: "Overview",
  asl: "ASL",
  documents: "Documents",
  evaluations: "Evaluations",
  comms: "Communications",
  auditor: "Auditor pack",
  settings: "Settings",
};
