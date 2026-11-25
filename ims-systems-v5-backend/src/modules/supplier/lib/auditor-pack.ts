import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  auditorTable,
  escapeAuditorHtml,
  wrapAuditorPackDocument,
} from "../../../infrastructure/documents/auditor-pack-document";
import {
  collectIssues,
  lastEval,
  nextEvalDate,
  weightedScore,
} from "./asl-rules";
import type { AslOverview, AslSettings, AslSupplier } from "../types";

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

  const readyPass = input.overview.readiness.filter((r) => r.pass).length;
  const readyFail = input.overview.readiness.length - readyPass;
  const attention = input.overview.attention?.length ?? 0;

  const aslRows = live
    .map((s) => {
      const l = lastEval(s);
      return `<tr><td>${escapeAuditorHtml(s.name)}</td><td>${escapeAuditorHtml(s.cat)}</td><td>${escapeAuditorHtml(s.crit)}</td><td>${escapeAuditorHtml(s.status)}</td><td>${escapeAuditorHtml(s.appby || "—")} · ${escapeAuditorHtml(s.appon || "—")}</td><td>${escapeAuditorHtml(l?.date || "—")}</td><td>${l ? l.score : "—"}</td><td>${escapeAuditorHtml(nextEvalDate(s, input.settings.interval) || "—")}</td></tr>`;
    })
    .join("");

  const criteriaRows = crit
    .map(
      (c) =>
        `<tr><td>${escapeAuditorHtml(c.n)}</td><td>${c.w}%</td></tr>`
    )
    .join("");

  const evaluationRows = evalRows.length
    ? evalRows
        .map(
          (x) =>
            `<tr><td>${escapeAuditorHtml(x.e.date)}</td><td>${escapeAuditorHtml(x.s.name)}</td><td>${escapeAuditorHtml(x.e.by)}</td>${crit.map((c) => `<td>${x.e.scores[c.k] ?? "—"}</td>`).join("")}<td><b>${x.e.score}</b></td><td>${escapeAuditorHtml(x.e.note || "")}</td></tr>`
        )
        .join("")
    : "";

  const reqRows = live
    .filter((s) => s.status !== "Prospective")
    .map(
      (s) =>
        `<tr><td>${escapeAuditorHtml(s.name)}</td><td>${s.reqs ? escapeAuditorHtml(s.reqs) : '<span class="bad">Not recorded</span>'}</td></tr>`
    )
    .join("");

  const communicationRows = commRows.length
    ? commRows
        .map(
          (x) =>
            `<tr><td>${escapeAuditorHtml(x.c.date)}</td><td>${escapeAuditorHtml(x.s.name)}</td><td>${escapeAuditorHtml(x.c.type)}</td><td>${escapeAuditorHtml(x.c.subject)}</td><td>${escapeAuditorHtml(x.c.outcome)}</td></tr>`
        )
        .join("")
    : "";

  const readinessList = `<ul class="pass-list">${input.overview.readiness
    .map(
      (r) =>
        `<li><span class="tag ${r.pass ? "tag-ok" : "tag-bad"}">${r.pass ? "Pass" : "Gap"}</span><span>${escapeAuditorHtml(r.label)} <span class="muted">(${escapeAuditorHtml(r.clause)})</span></span></li>`
    )
    .join("")}</ul>`;

  return wrapAuditorPackDocument({
    orgName: input.orgName,
    documentTitle: "Supplier & contractor auditor pack",
    moduleLabel: "Approved supplier list",
    purpose:
      "Controlled evidence of supplier approval, evaluation, communicated requirements and audit readiness against purchasing controls.",
    generatedAt: input.asOf,
    asOfLabel: input.asOf,
    summary: [
      { label: "Live suppliers", value: live.length, tone: "neutral" },
      {
        label: "Attention items",
        value: attention,
        tone: attention ? "warn" : "ok",
      },
      {
        label: "Evaluations on file",
        value: evalRows.length,
        tone: "neutral",
      },
      {
        label: "Readiness",
        value: `${readyPass}/${input.overview.readiness.length}`,
        tone: readyFail ? "warn" : "ok",
      },
    ],
    sections: [
      {
        number: "01",
        title: "Approved supplier list",
        intro: "Current ASL excluding removed suppliers.",
        bodyHtml: auditorTable(
          [
            "Supplier",
            "Category",
            "Criticality",
            "Status",
            "Approved by / on",
            "Last evaluation",
            "Score",
            "Next re-eval",
          ],
          aslRows
        ),
      },
      {
        number: "02",
        title: "Criteria and control",
        intro: `Re-evaluation intervals — Critical every ${input.settings.interval.Critical} months, High ${input.settings.interval.High}, Standard ${input.settings.interval.Standard}.`,
        bodyHtml: auditorTable(["Criterion", "Weight"], criteriaRows),
      },
      {
        number: "03",
        title: "Evaluation records",
        intro: "Recorded supplier evaluations with criterion scores.",
        bodyHtml: auditorTable(
          [
            "Date",
            "Supplier",
            "By",
            ...crit.map((c) => c.k),
            "Score",
            "Comments",
          ],
          evaluationRows,
          crit.length + 5
        ),
      },
      {
        number: "04",
        title: "Requirements communicated",
        intro: "Purchasing / HSEQ requirements recorded against each approved supplier.",
        bodyHtml: auditorTable(["Supplier", "Requirements"], reqRows),
      },
      {
        number: "05",
        title: "Communications",
        intro: "Recent supplier communications retained for the audit trail.",
        bodyHtml: auditorTable(
          ["Date", "Supplier", "Type", "Subject", "Outcome"],
          communicationRows
        ),
      },
      {
        number: "06",
        title: "Self-check against the standard",
        intro: "Automated readiness checklist for supplier control clauses.",
        bodyHtml: readinessList,
      },
    ],
  });
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
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.39, 0.45, 0.55);
  const accent = rgb(0.06, 0.46, 0.43);
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 48;
  const right = pageWidth - 48;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 48;

  const ensureSpace = (needed: number) => {
    if (y - needed < 56) {
      drawFooter();
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 48;
      drawHeaderBand(false);
    }
  };

  const drawHeaderBand = (first: boolean) => {
    page.drawRectangle({
      x: 0,
      y: pageHeight - 8,
      width: pageWidth,
      height: 8,
      color: accent,
    });
    if (!first) {
      page.drawText("Supplier & contractor auditor pack · continued", {
        x: left,
        y: pageHeight - 28,
        size: 9,
        font,
        color: muted,
      });
      y = pageHeight - 48;
    }
  };

  const drawFooter = () => {
    page.drawLine({
      start: { x: left, y: 40 },
      end: { x: right, y: 40 },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.93),
    });
    page.drawText(`${input.orgName} · Confidential`, {
      x: left,
      y: 26,
      size: 8,
      font,
      color: muted,
    });
    page.drawText("IMS Systems · ASL", {
      x: right - 90,
      y: 26,
      size: 8,
      font,
      color: muted,
    });
  };

  const line = (text: string, size = 10, useBold = false, color = ink) => {
    ensureSpace(size + 8);
    page.drawText(text.slice(0, 96), {
      x: left,
      y,
      size,
      font: useBold ? bold : font,
      color,
    });
    y -= size + 6;
  };

  drawHeaderBand(true);
  y = pageHeight - 42;
  line("SUPPLIER & CONTRACTOR", 9, true, accent);
  line("Auditor pack", 20, true);
  y -= 2;
  line(input.orgName, 12, true);
  line(`As of ${input.asOf}  ·  Controlled audit evidence`, 9, false, muted);
  y -= 10;

  const live = input.suppliers.filter((s) => s.status !== "Removed");
  line("1. Approved supplier list", 12, true);
  y -= 2;
  for (const s of live) {
    const l = lastEval(s);
    line(
      `${s.name} · ${s.crit} · ${s.status} · score ${l ? l.score : "—"} · next ${nextEvalDate(s, input.settings.interval) || "—"}`,
      9
    );
  }
  y -= 8;
  line("2. Criteria", 12, true);
  y -= 2;
  for (const c of input.settings.criteria) {
    line(`${c.n} — ${c.w}%`, 9);
  }
  y -= 8;
  line("3. Audit readiness", 12, true);
  y -= 2;
  for (const r of input.overview.readiness) {
    line(
      `${r.pass ? "[PASS]" : "[GAP]"}  ${r.label} (${r.clause})`,
      9,
      false,
      r.pass ? rgb(0.02, 0.47, 0.34) : rgb(0.73, 0.11, 0.11)
    );
  }
  y -= 8;
  line("4. Open issues sample", 12, true);
  y -= 2;
  for (const item of input.overview.attention.slice(0, 25)) {
    line(`${item.name}: ${item.issue.t}`, 9);
  }

  void weightedScore;
  void collectIssues;

  drawFooter();
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
