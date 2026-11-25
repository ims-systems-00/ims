/**
 * Tender Autopilot auditor pack — library health, open questionnaires, gates, certs.
 */
import {
  auditorTable,
  escapeAuditorHtml,
  wrapAuditorPackDocument,
} from "../../../infrastructure/documents/auditor-pack-document";
import { renderAuditorPackPdf } from "../../../infrastructure/documents/auditor-pack-pdf";
import { gate, libraryHealth, stats } from "./tender-rules";
import type { TenderRulesModel } from "../types";

type PackInput = {
  orgName: string;
  model: TenderRulesModel;
  generatedAt?: Date;
};

function packContext(input: PackInput) {
  const at = input.generatedAt ?? new Date();
  const health = libraryHealth(input.model);
  const overview = stats(input.model);
  const openQs = (input.model.questionnaires || []).filter(
    (q) => q.status !== "submitted"
  );
  const gateRows = openQs.map((q) => {
    const g = gate(input.model, q);
    return { q, g };
  });
  const certs = input.model.library.certificates || [];
  const expiring = [
    ...health.certsExpiring.map((id) => ({ id, state: "soon" as const })),
    ...health.certsExpired.map((id) => ({ id, state: "expired" as const })),
  ];
  return { at, health, overview, openQs, gateRows, certs, expiring };
}

export function buildAuditorPackHtml(input: PackInput): string {
  const { at, health, overview, openQs, gateRows, expiring, certs } =
    packContext(input);

  const healthRows = `
<tr><td>Answers</td><td>${health.answers}</td><td>${health.approved} approved · ${health.stale.length} stale</td></tr>
<tr><td>Certificates</td><td>${health.certificates}</td><td>${health.certsExpiring.length} expiring · ${health.certsExpired.length} expired</td></tr>
<tr><td>Policies</td><td>${health.policies}</td><td>${health.policiesOverdue.length} overdue review</td></tr>`;

  const openRows = openQs
    .map(
      (q) =>
        `<tr><td>${escapeAuditorHtml(q.buyer)}</td><td>${escapeAuditorHtml(q.title)}</td><td>${escapeAuditorHtml(String(q.status))}</td><td>${escapeAuditorHtml(q.due || "—")}</td><td>${q.questions.length}</td></tr>`
    )
    .join("");

  const gateHtml = gateRows
    .map(({ q, g }) => {
      const issues = g.issues
        .map(
          (i) =>
            `<li class="${i.sev === "bad" ? "bad" : "warn"}">${escapeAuditorHtml(i.text)}</li>`
        )
        .join("");
      return `<tr><td>${escapeAuditorHtml(q.buyer)}</td><td>${escapeAuditorHtml(q.title)}</td><td>${g.score}</td><td>${escapeAuditorHtml(g.verdict)}</td><td><ul>${issues || "<li>—</li>"}</ul></td></tr>`;
    })
    .join("");

  const certRows = expiring
    .map(({ id, state }) => {
      const c = certs.find((x) => x.id === id);
      if (!c) return "";
      return `<tr><td>${escapeAuditorHtml(c.name)}</td><td>${escapeAuditorHtml(c.number || "")}</td><td>${escapeAuditorHtml(c.expires || "—")}</td><td>${stateCell(state)}</td></tr>`;
    })
    .join("");

  return wrapAuditorPackDocument({
    orgName: input.orgName,
    documentTitle: "Tender Autopilot auditor pack",
    moduleLabel: "Tender Autopilot",
    purpose:
      "Evidence pack covering library health, open tenders, bid/no-bid gates and certificate expiry.",
    generatedAt: at,
    asOfLabel: at.toISOString().slice(0, 10),
    summary: [
      { label: "Open tenders", value: overview.open, tone: "neutral" },
      {
        label: "Due soon",
        value: overview.dueSoon,
        tone: overview.dueSoon ? "warn" : "ok",
      },
      { label: "Questions", value: overview.questions, tone: "neutral" },
      {
        label: "Library answers",
        value: health.answers,
        tone: health.stale.length ? "warn" : "ok",
      },
    ],
    sections: [
      {
        number: "01",
        title: "Library health",
        intro: "Approved content currency and certificate/policy status.",
        bodyHtml: auditorTable(["Area", "Count", "Notes"], healthRows),
      },
      {
        number: "02",
        title: "Open questionnaires",
        intro: "Active tenders and PQQs not yet submitted.",
        bodyHtml: auditorTable(
          ["Buyer", "Title", "Status", "Due", "Questions"],
          openRows ||
            `<tr><td colspan="5">No open questionnaires.</td></tr>`
        ),
      },
      {
        number: "03",
        title: "Gate summary",
        intro: "Bid / review / no-bid-risk verdicts for open tenders.",
        bodyHtml: auditorTable(
          ["Buyer", "Title", "Score", "Verdict", "Issues"],
          gateHtml ||
            `<tr><td colspan="5">No open tenders to gate.</td></tr>`
        ),
      },
      {
        number: "04",
        title: "Certificates expiring",
        intro: "Certificates expiring soon or already expired.",
        bodyHtml: auditorTable(
          ["Name", "Number", "Expires", "State"],
          certRows ||
            `<tr><td colspan="4">No expiring or expired certificates.</td></tr>`
        ),
      },
    ],
  });
}

function stateCell(state: string): string {
  const s = String(state || "").toLowerCase();
  if (s === "soon" || s === "expsoon" || s === "due") {
    return `<span class="warn">${escapeAuditorHtml(state)}</span>`;
  }
  if (s === "expired" || s === "over" || s === "overdue") {
    return `<span class="bad">${escapeAuditorHtml(state)}</span>`;
  }
  return escapeAuditorHtml(state);
}

export async function buildAuditorPackPdf(input: PackInput): Promise<Buffer> {
  const { at, health, overview, openQs, gateRows, expiring, certs } =
    packContext(input);
  const asOf = at.toISOString().slice(0, 10);

  return renderAuditorPackPdf({
    orgName: input.orgName,
    documentTitle: "Tender Autopilot auditor pack",
    moduleLabel: "Tender Autopilot",
    asOf,
    summary: [
      { label: "Open tenders", value: overview.open },
      { label: "Due soon", value: overview.dueSoon },
      { label: "Questions", value: overview.questions },
      { label: "Library answers", value: health.answers },
    ],
    sections: [
      {
        number: "01",
        title: "Library health",
        lines: [
          `Answers: ${health.answers} (${health.approved} approved, ${health.stale.length} stale)`,
          `Certificates: ${health.certificates} (${health.certsExpiring.length} expiring, ${health.certsExpired.length} expired)`,
          `Policies: ${health.policies} (${health.policiesOverdue.length} overdue)`,
        ],
      },
      {
        number: "02",
        title: "Open questionnaires",
        lines: openQs.length
          ? openQs.map(
              (q) =>
                `${q.buyer} · ${q.title} · ${q.status} · due ${q.due || "—"} · ${q.questions.length} questions`
            )
          : ["No open questionnaires."],
      },
      {
        number: "03",
        title: "Gate summary",
        lines: gateRows.length
          ? gateRows.map(
              ({ q, g }) =>
                `${q.buyer} · ${q.title} · score ${g.score} · ${g.verdict}${
                  g.issues.length
                    ? ` · ${g.issues.map((i) => i.text).join("; ")}`
                    : ""
                }`
            )
          : ["No open tenders to gate."],
      },
      {
        number: "04",
        title: "Certificates expiring",
        lines: expiring.length
          ? expiring.map(({ id, state }) => {
              const c = certs.find((x) => x.id === id);
              return c
                ? `${c.name} · ${c.number || ""} · expires ${c.expires || "—"} · ${state}`
                : id;
            })
          : ["No expiring or expired certificates."],
      },
    ],
  });
}
