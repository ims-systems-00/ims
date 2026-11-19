import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  collectIssues,
  lastEval,
  nextEvalDate,
  weightedScore,
} from "./asl-rules";
import type { AslOverview, AslSettings, AslSupplier } from "../types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildAuditorPackHtml(input: {
  orgName: string;
  suppliers: AslSupplier[];
  settings: AslSettings;
  overview: AslOverview;
  asOf: string;
}): string {
  const live = input.suppliers.filter((s) => s.status !== "Removed");
  const crit = input.settings.criteria;
  const evalRows = live
    .flatMap((s) => s.evals.map((e) => ({ s, e })))
    .sort((a, b) => (a.e.date < b.e.date ? 1 : -1));
  const commRows = input.suppliers
    .flatMap((s) => s.comms.map((c) => ({ s, c })))
    .sort((a, b) => (a.c.date < b.c.date ? 1 : -1))
    .slice(0, 40);

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Auditor pack — ${escapeHtml(input.orgName)}</title>
<style>
body{font-family:system-ui,sans-serif;color:#141A3A;margin:24px;font-size:13px}
h1{font-size:20px}h2{font-size:16px;margin-top:28px}
table{width:100%;border-collapse:collapse;margin:8px 0 16px}
th,td{border:1px solid #E3E5F2;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#F6F7FB;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.ok{color:#1B8F5A}.bad{color:#C2410C}.muted{color:#5B6180}
@media print{body{margin:0}}
</style></head><body>
<h1>Supplier &amp; contractor auditor pack</h1>
<p class="muted">${escapeHtml(input.orgName)} · ${escapeHtml(input.asOf)} · ${live.length} suppliers</p>

<h2>1 · Approved supplier list</h2>
<table><thead><tr><th>Supplier</th><th>Category</th><th>Criticality</th><th>Status</th><th>Approved by / on</th><th>Last evaluation</th><th>Score</th><th>Next re-eval</th></tr></thead>
<tbody>${live
  .map((s) => {
    const l = lastEval(s);
    return `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.cat)}</td><td>${escapeHtml(s.crit)}</td><td>${escapeHtml(s.status)}</td><td>${escapeHtml(s.appby || "—")} · ${escapeHtml(s.appon || "—")}</td><td>${escapeHtml(l?.date || "—")}</td><td>${l ? l.score : "—"}</td><td>${escapeHtml(nextEvalDate(s, input.settings.interval) || "—")}</td></tr>`;
  })
  .join("")}</tbody></table>

<h2>2 · Criteria and control</h2>
<p>Re-evaluation: Critical every ${input.settings.interval.Critical} months, High ${input.settings.interval.High}, Standard ${input.settings.interval.Standard}.</p>
<table><thead><tr><th>Criterion</th><th>Weight</th></tr></thead>
<tbody>${crit.map((c) => `<tr><td>${escapeHtml(c.n)}</td><td>${c.w}%</td></tr>`).join("")}</tbody></table>

<h2>3 · Evaluation records</h2>
<table><thead><tr><th>Date</th><th>Supplier</th><th>By</th>${crit.map((c) => `<th>${escapeHtml(c.k)}</th>`).join("")}<th>Score</th><th>Comments</th></tr></thead>
<tbody>${
    evalRows.length
      ? evalRows
          .map(
            (x) =>
              `<tr><td>${escapeHtml(x.e.date)}</td><td>${escapeHtml(x.s.name)}</td><td>${escapeHtml(x.e.by)}</td>${crit.map((c) => `<td>${x.e.scores[c.k] ?? "—"}</td>`).join("")}<td><b>${x.e.score}</b></td><td>${escapeHtml(x.e.note || "")}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="${crit.length + 5}">None</td></tr>`
  }</tbody></table>

<h2>4 · Requirements communicated</h2>
<table><thead><tr><th>Supplier</th><th>Requirements</th></tr></thead>
<tbody>${live
  .filter((s) => s.status !== "Prospective")
  .map(
    (s) =>
      `<tr><td>${escapeHtml(s.name)}</td><td>${s.reqs ? escapeHtml(s.reqs) : '<span class="bad">Not recorded</span>'}</td></tr>`
  )
  .join("")}</tbody></table>

<h2>5 · Communications</h2>
<table><thead><tr><th>Date</th><th>Supplier</th><th>Type</th><th>Subject</th><th>Outcome</th></tr></thead>
<tbody>${
    commRows.length
      ? commRows
          .map(
            (x) =>
              `<tr><td>${escapeHtml(x.c.date)}</td><td>${escapeHtml(x.s.name)}</td><td>${escapeHtml(x.c.type)}</td><td>${escapeHtml(x.c.subject)}</td><td>${escapeHtml(x.c.outcome)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5">None</td></tr>`
  }</tbody></table>

<h2>6 · Self-check against the standard</h2>
<ul>${input.overview.readiness
  .map(
    (r) =>
      `<li class="${r.pass ? "ok" : "bad"}">${r.pass ? "✓" : "!"} ${escapeHtml(r.label)} <span class="muted">(${escapeHtml(r.clause)})</span></li>`
  )
  .join("")}</ul>
</body></html>`;
}

export async function buildAuditorPackPdf(input: {
  orgName: string;
  suppliers: AslSupplier[];
  settings: AslSettings;
  overview: AslOverview;
  asOf: string;
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const left = 40;
  const line = (text: string, size = 10, useBold = false) => {
    if (y < 50) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text.slice(0, 110), {
      x: left,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.08, 0.1, 0.22),
    });
    y -= size + 6;
  };

  line("Supplier & contractor auditor pack", 16, true);
  line(`${input.orgName} · ${input.asOf}`, 10);
  y -= 8;
  line("1. Approved supplier list", 12, true);
  const live = input.suppliers.filter((s) => s.status !== "Removed");
  for (const s of live) {
    const l = lastEval(s);
    line(
      `${s.name} · ${s.crit} · ${s.status} · score ${l ? l.score : "—"} · next ${nextEvalDate(s, input.settings.interval) || "—"}`
    );
  }
  y -= 8;
  line("2. Criteria", 12, true);
  for (const c of input.settings.criteria) {
    line(`${c.n} — ${c.w}%`);
  }
  y -= 8;
  line("3. Audit readiness", 12, true);
  for (const r of input.overview.readiness) {
    line(`${r.pass ? "[PASS]" : "[FAIL]"} ${r.label} (${r.clause})`);
  }
  y -= 8;
  line("4. Open issues sample", 12, true);
  for (const item of input.overview.attention.slice(0, 25)) {
    line(`${item.name}: ${item.issue.t}`);
  }

  // Touch weightedScore so tree-shaking keeps import useful for future rows
  void weightedScore;
  void collectIssues;

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export function buildCsvExport(
  suppliers: AslSupplier[],
  settings: AslSettings
): string {
  const header = [
    "Supplier",
    "Category",
    "Criticality",
    "Status",
    "Contact",
    "Email",
    "Approved by",
    "Approved on",
    "Last evaluation",
    "Score",
    "Next re-evaluation",
    "Documents",
    "Issues",
  ];
  const rows = suppliers.map((s) => {
    const l = lastEval(s);
    const issues = collectIssues(s, settings)
      .map((i) => i.t)
      .join("; ");
    return [
      s.name,
      s.cat,
      s.crit,
      s.status,
      s.contact,
      s.email,
      s.appby,
      s.appon ?? "",
      l?.date ?? "",
      l ? String(l.score) : "",
      nextEvalDate(s, settings.interval) ?? "",
      s.docs.map((d) => d.type + (d.exp ? ` to ${d.exp}` : "")).join("; "),
      issues,
    ];
  });
  return [header, ...rows]
    .map((r) =>
      r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}
