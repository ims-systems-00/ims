/**
 * Shared chrome for printable auditor-pack HTML documents.
 * Modules supply section content; this owns layout, typography and print CSS.
 */

export type AuditorPackSummaryCard = {
  label: string;
  value: string | number;
  tone?: "neutral" | "ok" | "warn" | "bad";
};

export type AuditorPackSection = {
  number: string;
  title: string;
  intro?: string;
  bodyHtml: string;
};

export type AuditorPackDocumentInput = {
  orgName: string;
  documentTitle: string;
  moduleLabel: string;
  /** Short standard/purpose line under the title */
  purpose?: string;
  generatedAt?: Date | string;
  asOfLabel?: string;
  summary?: AuditorPackSummaryCard[];
  sections: AuditorPackSection[];
  footerNote?: string;
};

export function escapeAuditorHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatGeneratedAt(value?: Date | string): string {
  const d = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return String(value ?? "");
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toneClass(tone?: AuditorPackSummaryCard["tone"]): string {
  if (tone === "ok") return "tone-ok";
  if (tone === "warn") return "tone-warn";
  if (tone === "bad") return "tone-bad";
  return "tone-neutral";
}

const DOCUMENT_CSS = `
  :root {
    --ink: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --soft: #f8fafc;
    --panel: #ffffff;
    --accent: #0f766e;
    --accent-soft: #ccfbf1;
    --ok: #047857;
    --warn: #b45309;
    --bad: #b91c1c;
    --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
    --sans: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    color: var(--ink);
    background: #eef2f7;
    font: 12.5px/1.45 var(--sans);
  }
  .sheet {
    max-width: 920px;
    margin: 28px auto;
    background: var(--panel);
    border: 1px solid #dbe3ef;
    box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
    overflow: hidden;
  }
  .brand-bar {
    height: 6px;
    background: linear-gradient(90deg, #0f766e 0%, #115e59 45%, #0f172a 100%);
  }
  .masthead {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 18px;
    padding: 28px 36px 22px;
    border-bottom: 1px solid var(--line);
    background:
      radial-gradient(1200px 180px at 0% 0%, rgba(15, 118, 110, 0.08), transparent 60%),
      linear-gradient(180deg, #ffffff, #fbfcfe);
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .eyebrow::before {
    content: "";
    width: 18px;
    height: 2px;
    background: var(--accent);
  }
  .doc-title {
    margin: 0;
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.15;
    color: var(--ink);
  }
  .purpose {
    margin: 8px 0 0;
    max-width: 46ch;
    color: var(--muted);
    font-size: 13px;
  }
  .org-block {
    text-align: right;
    min-width: 180px;
  }
  .org-name {
    margin: 0;
    font-family: var(--serif);
    font-size: 18px;
    font-weight: 600;
    line-height: 1.25;
  }
  .org-meta {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 11.5px;
    line-height: 1.5;
  }
  .badge {
    display: inline-block;
    margin-top: 10px;
    padding: 4px 9px;
    border: 1px solid #99f6e4;
    border-radius: 999px;
    background: var(--accent-soft);
    color: #115e59;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .meta-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 18px 28px;
    padding: 12px 36px;
    border-bottom: 1px solid var(--line);
    background: var(--soft);
    color: var(--muted);
    font-size: 11.5px;
  }
  .meta-strip strong {
    color: var(--ink);
    font-weight: 650;
  }
  .content { padding: 8px 36px 28px; }
  .summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin: 20px 0 8px;
  }
  .summary-card {
    padding: 14px 14px 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: linear-gradient(180deg, #fff, #f8fafc);
  }
  .summary-card .label {
    display: block;
    margin-bottom: 6px;
    color: var(--muted);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .summary-card .value {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .tone-ok .value { color: var(--ok); }
  .tone-warn .value { color: var(--warn); }
  .tone-bad .value { color: var(--bad); }
  .tone-neutral .value { color: var(--ink); }
  .section {
    margin-top: 28px;
    break-inside: avoid;
  }
  .section-head {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px;
    align-items: end;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--ink);
  }
  .section-num {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 600;
    color: var(--accent);
    line-height: 1;
  }
  .section-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .section-intro {
    margin: 0 0 12px;
    color: var(--muted);
    font-size: 12.5px;
  }
  table.pack {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 4px;
    font-size: 11.5px;
  }
  table.pack th,
  table.pack td {
    border: 1px solid var(--line);
    padding: 7px 8px;
    text-align: left;
    vertical-align: top;
  }
  table.pack th {
    background: #f1f5f9;
    color: #334155;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  table.pack tbody tr:nth-child(even) td { background: #fcfdff; }
  .ok { color: var(--ok); font-weight: 700; }
  .bad { color: var(--bad); font-weight: 700; }
  .warn { color: var(--warn); font-weight: 700; }
  .muted { color: var(--muted); }
  .pass-list { list-style: none; margin: 0; padding: 0; }
  .pass-list li {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
    font-size: 12.5px;
  }
  .pass-list li:last-child { border-bottom: 0; }
  .tag {
    display: inline-block;
    min-width: 46px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-align: center;
    text-transform: uppercase;
  }
  .tag-ok { background: #d1fae5; color: var(--ok); }
  .tag-bad { background: #fee2e2; color: var(--bad); }
  .tag-warn { background: #ffedd5; color: var(--warn); }
  .footnote {
    margin-top: 10px;
    color: var(--muted);
    font-size: 11.5px;
  }
  .doc-footer {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 34px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 10.5px;
  }
  .doc-footer strong { color: var(--ink); }
  .pack-toolbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.92);
    border-bottom: 1px solid var(--line);
    backdrop-filter: blur(8px);
  }
  .pack-toolbar .hint {
    color: var(--muted);
    font-size: 12px;
  }
  .pack-toolbar .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pack-toolbar button {
    appearance: none;
    border: 1px solid #cbd5e1;
    background: #fff;
    color: var(--ink);
    border-radius: 8px;
    padding: 8px 12px;
    font: 650 12.5px/1 var(--sans);
    cursor: pointer;
  }
  .pack-toolbar button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .pack-toolbar button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  @page {
    size: A4;
    margin: 14mm 12mm 16mm;
  }
  @media print {
    body { background: #fff; }
    .sheet {
      max-width: none;
      margin: 0;
      border: 0;
      box-shadow: none;
    }
    .masthead { padding: 0 0 14px; background: none; }
    .meta-strip { padding: 10px 0; background: none; }
    .content { padding: 0; }
    .section { break-inside: avoid; }
    .summary { break-inside: avoid; }
    .no-print { display: none !important; }
  }
  @media (max-width: 720px) {
    .masthead { grid-template-columns: 1fr; }
    .org-block { text-align: left; }
    .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .content, .masthead, .meta-strip { padding-left: 20px; padding-right: 20px; }
  }
`;

export function wrapAuditorPackDocument(
  input: AuditorPackDocumentInput
): string {
  const generated = formatGeneratedAt(input.generatedAt);
  const asOf = input.asOfLabel || generated;
  const org = escapeAuditorHtml(input.orgName || "Organisation");
  const title = escapeAuditorHtml(input.documentTitle);
  const moduleLabel = escapeAuditorHtml(input.moduleLabel);
  const purpose = input.purpose
    ? `<p class="purpose">${escapeAuditorHtml(input.purpose)}</p>`
    : "";
  const summary =
    input.summary && input.summary.length
      ? `<div class="summary">${input.summary
          .map(
            (card) =>
              `<div class="summary-card ${toneClass(card.tone)}"><span class="label">${escapeAuditorHtml(card.label)}</span><span class="value">${escapeAuditorHtml(card.value)}</span></div>`
          )
          .join("")}</div>`
      : "";

  const sections = input.sections
    .map(
      (section) => `
<section class="section">
  <div class="section-head">
    <div class="section-num">${escapeAuditorHtml(section.number)}</div>
    <h2 class="section-title">${escapeAuditorHtml(section.title)}</h2>
  </div>
  ${section.intro ? `<p class="section-intro">${escapeAuditorHtml(section.intro)}</p>` : ""}
  ${section.bodyHtml}
</section>`
    )
    .join("\n");

  const footerNote = escapeAuditorHtml(
    input.footerNote ||
      "Controlled record for audit evidence. Verify against live system records where required."
  );

  const pdfFilename = escapeAuditorHtml(
    `${input.documentTitle || "auditor-pack"}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "auditor-pack"
  );

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} — ${org}</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>
  <div class="pack-toolbar no-print">
    <div class="hint">Preview matches the printable auditor pack</div>
    <div class="actions">
      <button type="button" onclick="window.print()">Print</button>
      <button type="button" class="primary" id="download-pdf-btn">Download PDF</button>
    </div>
  </div>
  <article class="sheet" id="auditor-pack-sheet">
    <div class="brand-bar" aria-hidden="true"></div>
    <header class="masthead">
      <div>
        <p class="eyebrow">${moduleLabel}</p>
        <h1 class="doc-title">${title}</h1>
        ${purpose}
      </div>
      <div class="org-block">
        <p class="org-name">${org}</p>
        <p class="org-meta">
          Management system evidence pack<br/>
          Generated ${escapeAuditorHtml(generated)}
        </p>
        <span class="badge">Confidential</span>
      </div>
    </header>
    <div class="meta-strip">
      <div><strong>Organisation</strong><br/>${org}</div>
      <div><strong>As of</strong><br/>${escapeAuditorHtml(asOf)}</div>
      <div><strong>Document</strong><br/>Auditor pack</div>
      <div><strong>Classification</strong><br/>Internal / audit use</div>
    </div>
    <div class="content">
      ${summary}
      ${sections}
      <footer class="doc-footer">
        <div>${footerNote}</div>
        <div><strong>IMS Systems</strong> · ${moduleLabel}</div>
      </footer>
    </div>
  </article>
  <script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"></script>
  <script>
    (function () {
      var btn = document.getElementById("download-pdf-btn");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var sheet = document.getElementById("auditor-pack-sheet");
        if (!sheet || typeof html2pdf === "undefined") {
          window.print();
          return;
        }
        btn.disabled = true;
        var prev = btn.textContent;
        btn.textContent = "Preparing PDF…";
        html2pdf()
          .set({
            filename: "${pdfFilename}.pdf",
            margin: [8, 8, 8, 8],
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"], avoid: [".section", ".summary", "tr", ".masthead"] }
          })
          .from(sheet)
          .save()
          .then(function () {
            btn.disabled = false;
            btn.textContent = prev;
          })
          .catch(function () {
            btn.disabled = false;
            btn.textContent = prev;
            window.print();
          });
      });
    })();
  </script>
</body>
</html>`;
}

/** Convenience helpers for module HTML bodies */
export function auditorTable(
  headers: string[],
  rowsHtml: string,
  emptyColspan?: number
): string {
  const head = headers
    .map((h) => `<th>${escapeAuditorHtml(h)}</th>`)
    .join("");
  const body =
    rowsHtml.trim() ||
    `<tr><td colspan="${emptyColspan ?? headers.length}" class="muted">None recorded</td></tr>`;
  return `<table class="pack"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
