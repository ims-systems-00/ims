/**
 * Auditor pack HTML for Training & Competency (print/PDF).
 */
import {
  auditorTable,
  escapeAuditorHtml,
  wrapAuditorPackDocument,
} from "../../../infrastructure/documents/auditor-pack-document";
import { renderAuditorPackPdf } from "../../../infrastructure/documents/auditor-pack-pdf";
import {
  activePeople,
  gaps,
  personSummary,
  readiness,
} from "./training-rules";
import type { TrainingModel } from "../types";

export function buildTrainingAuditorPackHtml(input: {
  model: TrainingModel;
  generatedAt?: Date;
}): string {
  const M = input.model;
  const at = input.generatedAt ?? new Date();
  const checks = readiness(M, at);
  const g = gaps(M, at);
  const people = activePeople(M);
  const comps = M.competencies.filter((c) => !c.archived);
  const roleName = (id: string) =>
    M.roles.find((r) => r.id === id || r.key === id)?.name ?? id;

  const checkPass = checks.filter((c) => c.ok).length;
  const checkFail = checks.length - checkPass;
  const compliantPeople = people.filter((p) =>
    personSummary(M, p, at).compliant
  ).length;

  const checkRows = checks
    .map(
      (c) =>
        `<tr><td>${c.ok ? '<span class="tag tag-ok">Pass</span>' : '<span class="tag tag-bad">Gap</span>'}</td><td>${escapeAuditorHtml(c.text)}</td><td>${escapeAuditorHtml(c.basis)}</td><td>${escapeAuditorHtml(c.tag)}</td></tr>`
    )
    .join("");

  const gapRows = g
    .slice(0, 100)
    .map(
      (x) =>
        `<tr><td>${escapeAuditorHtml(x.person.name)}</td><td>${escapeAuditorHtml(x.comp.name)}</td><td>${stateCell(x.st)}</td><td>${escapeAuditorHtml(x.next || "—")}</td></tr>`
    )
    .join("");

  const peopleRows = people
    .map((p) => {
      const s = personSummary(M, p, at);
      const roles = (p.roles || []).map(roleName).filter(Boolean).join(", ");
      return `<tr><td>${escapeAuditorHtml(p.name)}</td><td>${escapeAuditorHtml(p.site)}</td><td>${escapeAuditorHtml(roles || "—")}</td><td>${s.ok + s.soon}/${s.total}</td><td>${s.compliant ? '<span class="ok">Yes</span>' : '<span class="bad">No</span>'}</td></tr>`;
    })
    .join("");

  const catalogueRows = comps
    .map(
      (c) =>
        `<tr><td>${escapeAuditorHtml(c.name)}</td><td>${c.months ? `${c.months} mo` : "Never"}</td><td>${escapeAuditorHtml(c.evidence)}</td><td>${escapeAuditorHtml(c.basis || "—")}</td></tr>`
    )
    .join("");

  const roleRows = M.roles
    .map((r) => {
      const mandatory = (r.mandatory || [])
        .map((id) => comps.find((c) => c.id === id || c.key === id)?.name ?? id)
        .join(", ");
      const desirable = (r.desirable || [])
        .map((id) => comps.find((c) => c.id === id || c.key === id)?.name ?? id)
        .join(", ");
      return `<tr><td>${escapeAuditorHtml(r.name)}</td><td>${escapeAuditorHtml(mandatory || "—")}</td><td>${escapeAuditorHtml(desirable || "—")}</td></tr>`;
    })
    .join("");

  return wrapAuditorPackDocument({
    orgName: M.org || "Organisation",
    documentTitle: "Training & competency auditor pack",
    moduleLabel: "Training & competency",
    purpose:
      "Evidence of competence management against ISO 9001 / 45001 / 27001 expectations — readiness checks, people compliance, mandatory gaps and catalogue control.",
    generatedAt: at,
    summary: [
      { label: "Active people", value: people.length, tone: "neutral" },
      {
        label: "Compliant",
        value: `${compliantPeople}/${people.length || 0}`,
        tone: compliantPeople === people.length ? "ok" : "warn",
      },
      {
        label: "Mandatory gaps",
        value: g.length,
        tone: g.length ? "bad" : "ok",
      },
      {
        label: "Readiness checks",
        value: `${checkPass}/${checks.length}`,
        tone: checkFail ? "warn" : "ok",
      },
    ],
    sections: [
      {
        number: "01",
        title: "Readiness checks",
        intro: "Self-assessment against common management-system competence clauses.",
        bodyHtml: auditorTable(
          ["Result", "Check", "Basis", "Tag"],
          checkRows
        ),
      },
      {
        number: "02",
        title: "Active people compliance",
        intro: "Current register of active people and whether mandatory training is in date.",
        bodyHtml: auditorTable(
          ["Person", "Site", "Roles", "In date", "Compliant"],
          peopleRows
        ),
      },
      {
        number: "03",
        title: "Mandatory gaps",
        intro: "People with missing, overdue or grace-period mandatory competencies.",
        bodyHtml: auditorTable(
          ["Person", "Competency", "State", "Expiry"],
          gapRows
        ),
      },
      {
        number: "04",
        title: "Course catalogue",
        intro: `${comps.length} active courses · ${M.roles.length} roles · ${M.records.length} training records on file.`,
        bodyHtml: `${auditorTable(
          ["Course", "Renewal", "Evidence", "Basis"],
          catalogueRows
        )}<p class="footnote">Role requirements</p>${auditorTable(
          ["Role", "Mandatory", "Desirable"],
          roleRows
        )}`,
      },
    ],
  });
}

function stateCell(state: string): string {
  const s = String(state || "").toLowerCase();
  if (s === "ok") return `<span class="ok">${escapeAuditorHtml(state)}</span>`;
  if (s === "soon" || s === "grace") {
    return `<span class="warn">${escapeAuditorHtml(state)}</span>`;
  }
  if (s === "over" || s === "none") {
    return `<span class="bad">${escapeAuditorHtml(state)}</span>`;
  }
  return escapeAuditorHtml(state);
}

export async function buildTrainingAuditorPackPdf(input: {
  model: TrainingModel;
  generatedAt?: Date;
}): Promise<Buffer> {
  const M = input.model;
  const at = input.generatedAt ?? new Date();
  const checks = readiness(M, at);
  const g = gaps(M, at);
  const people = activePeople(M);
  const comps = M.competencies.filter((c) => !c.archived);
  const roleName = (id: string) =>
    M.roles.find((r) => r.id === id || r.key === id)?.name ?? id;
  const checkPass = checks.filter((c) => c.ok).length;
  const compliantPeople = people.filter((p) =>
    personSummary(M, p, at).compliant
  ).length;

  return renderAuditorPackPdf({
    orgName: M.org || "Organisation",
    documentTitle: "Training & competency auditor pack",
    moduleLabel: "Training & competency",
    asOf: at.toISOString().slice(0, 10),
    summary: [
      { label: "Active people", value: people.length },
      {
        label: "Compliant",
        value: `${compliantPeople}/${people.length || 0}`,
      },
      { label: "Mandatory gaps", value: g.length },
      { label: "Readiness checks", value: `${checkPass}/${checks.length}` },
    ],
    sections: [
      {
        number: "01",
        title: "Readiness checks",
        lines: checks.map(
          (c) =>
            `${c.ok ? "[PASS]" : "[GAP]"} ${c.text} · ${c.basis} · ${c.tag}`
        ),
      },
      {
        number: "02",
        title: "Active people compliance",
        lines: people.map((p) => {
          const s = personSummary(M, p, at);
          const roles = (p.roles || []).map(roleName).filter(Boolean).join(", ");
          return `${p.name} · ${p.site || "—"} · ${roles || "—"} · ${s.ok + s.soon}/${s.total} · ${s.compliant ? "compliant" : "gaps"}`;
        }),
      },
      {
        number: "03",
        title: "Mandatory gaps",
        lines: g
          .slice(0, 100)
          .map(
            (x) =>
              `${x.person.name} · ${x.comp.name} · ${x.st} · ${x.next || "—"}`
          ),
      },
      {
        number: "04",
        title: "Course catalogue",
        lines: [
          ...comps.map(
            (c) =>
              `${c.name} · ${c.months ? `${c.months} mo` : "Never"} · ${c.evidence} · ${c.basis || "—"}`
          ),
          ...M.roles.map((r) => {
            const mandatory = (r.mandatory || [])
              .map(
                (id) =>
                  comps.find((c) => c.id === id || c.key === id)?.name ?? id
              )
              .join(", ");
            return `Role ${r.name} · mandatory: ${mandatory || "—"}`;
          }),
        ],
      },
    ],
  });
}
