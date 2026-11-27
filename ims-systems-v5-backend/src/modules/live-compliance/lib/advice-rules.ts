/**
 * Advice rules — pure functions producing "do next" items from a snapshot.
 * Ids are deterministic so snooze and first-seen state survive recalculation.
 * Actions deep-link to the module screen that already does the work
 * (e.g. Training's prefilled "create session" sheet for a refresher).
 */

import type {
  AdviceItem,
  AdviceSeverity,
  ComplianceSnapshot,
  LiveStandard,
} from "../types";
import {
  AUDIT_CYCLE_WARN_DAYS,
  AUDIT_FALLBACK_MONTHS,
  FINDING_SOON_DAYS,
  INVESTIGATION_GRACE_DAYS,
  PATTERN_WINDOW_DAYS,
  ACK_TARGET,
  SOON_DAYS,
  nearMissPatterns,
  unauditedClauses,
} from "./clause-rules";
import { addMonthsIso, daysUntil, formatDay, plural } from "./dates";

const ALL: LiveStandard[] = ["ISO 9001", "ISO 14001", "ISO 45001"];
const ENV_OHS: LiveStandard[] = ["ISO 14001", "ISO 45001"];

/** Advice warns earlier than clause health for reviews (time to prepare). */
const REVIEW_WARN_DAYS = 60;

function q(params: Record<string, string>): string {
  return `?${new URLSearchParams(params).toString()}`;
}

function severityForDue(days: number): AdviceSeverity {
  if (days < 0) return "high";
  if (days <= 14) return "med";
  return "low";
}

const SEVERITY_RANK: Record<AdviceSeverity, number> = { high: 0, med: 1, low: 2 };

export function sortAdvice(items: AdviceItem[]): AdviceItem[] {
  return [...items].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31") ||
      a.id.localeCompare(b.id)
  );
}

export function buildAdvice(s: ComplianceSnapshot): AdviceItem[] {
  const out: AdviceItem[] = [];
  const inScope = (standards: LiveStandard[]) =>
    standards.filter((st) => s.standards.includes(st));
  const add = (item: AdviceItem) => {
    if (item.standards.length) out.push(item);
  };

  /* ----------------------------- Training ----------------------------- */
  if (s.training.tracked) {
    for (const g of s.training.gaps) {
      if (g.booked) continue;
      if ((g.state === "over" || g.state === "soon") && g.next) {
        const n = daysUntil(g.next, s.today);
        if (n > SOON_DAYS) continue;
        add({
          id: `tr-${g.personId}-${g.competencyId}`,
          module: "training",
          clause: "7.2",
          standards: inScope(ALL),
          severity: severityForDue(n),
          due: g.next,
          title: `${g.personName}: ${g.competencyName} ${n < 0 ? "expired" : "expires"} ${formatDay(g.next)}`,
          why: "ISO 7.2 needs everyone competent for their role. Book the refresher before it lapses.",
          action: {
            type: "navigate",
            label: "Book refresher",
            href: `/training${q({ createSession: "1", cid: g.competencyId, attendees: g.personId })}`,
          },
        });
      }
    }
    const missingByPerson = new Map<string, { name: string; courses: string[] }>();
    for (const g of s.training.gaps) {
      if (g.state !== "none") continue;
      const entry = missingByPerson.get(g.personId) ?? { name: g.personName, courses: [] };
      entry.courses.push(g.competencyName);
      missingByPerson.set(g.personId, entry);
    }
    for (const [personId, entry] of missingByPerson) {
      add({
        id: `assign-${personId}`,
        module: "training",
        clause: "7.2",
        standards: inScope(ALL),
        severity: "med",
        due: null,
        title: `${entry.name} needs ${plural(entry.courses.length, "course")}`,
        why: entry.courses.join(", "),
        action: { type: "navigate", label: "Open training record", href: `/training${q({ person: personId })}` },
      });
    }
    for (const role of s.training.rolesWithoutRequirements) {
      add({
        id: `role-${role.id}`,
        module: "training",
        clause: "7.2",
        standards: inScope(ALL),
        severity: "med",
        due: null,
        title: `Role "${role.name}" has no required competencies`,
        why: "Without requirements per role you cannot show competence. Set them once and new starters are assigned automatically.",
        action: { type: "navigate", label: "Set competencies", href: `/training${q({ view: "roles" })}` },
        offer: { task: "training_for_role", label: `Suggest competencies for ${role.name}`, ref: role.id },
      });
    }
    for (const ack of s.training.acknowledgements) {
      if (!ack.required || ack.acknowledged / ack.required >= ACK_TARGET) continue;
      const outstanding = ack.required - ack.acknowledged;
      add({
        id: `ack-${ack.competencyId}`,
        module: "training",
        clause: "7.3",
        standards: inScope(ALL),
        severity: "low",
        due: null,
        title: `${plural(outstanding, "person", "people")} have not acknowledged ${ack.competencyName}`,
        why: "ISO 7.3 awareness. Chase the outstanding acknowledgements; a toolbox talk closes the gap faster.",
        action: { type: "navigate", label: "See who is outstanding", href: `/training${q({ view: "matrix" })}` },
        offer: { task: "toolbox_talk", label: "Draft a 5-minute toolbox talk on the policy", ref: ack.competencyId },
      });
    }
  }

  /* ----------------------------- Inventory ---------------------------- */
  if (s.inventory.tracked) {
    const seenFailed = new Set<string>();
    for (const c of s.inventory.checks) {
      if (c.stage === "Retired") continue;
      const href = `/inventory${q({ asset: c.assetId, tab: "checks" })}`;
      if (c.lastResult === "Fail" && c.stage === "In service" && !seenFailed.has(c.assetId)) {
        seenFailed.add(c.assetId);
        add({
          id: `fail-${c.assetId}`,
          module: "inventory",
          clause: "8.1",
          standards: inScope(ALL),
          severity: "high",
          due: null,
          title: `${c.name} failed its ${c.checkName.toLowerCase()} and is still in service`,
          why: "Equipment that failed a check must be taken out of use until it is repaired and re-examined.",
          action: { type: "navigate", label: "Quarantine or repair", href },
        });
        continue;
      }
      if (c.stage === "Quarantined") {
        if (seenFailed.has(c.assetId)) continue;
        seenFailed.add(c.assetId);
        add({
          id: `q-${c.assetId}`,
          module: "inventory",
          clause: "8.1",
          standards: inScope(ALL),
          severity: "med",
          due: null,
          title: `${c.name} is quarantined`,
          why: "Book repair and re-examination before returning it to use.",
          action: { type: "navigate", label: "Book re-examination", href },
        });
        continue;
      }
      if (!c.nextDue) continue;
      const n = daysUntil(c.nextDue, s.today);
      if (n > SOON_DAYS) continue;
      add({
        id: `as-${c.assetId}-${c.checkName}-${c.nextDue}`,
        module: "inventory",
        clause: c.measuring ? "7.1.5" : "8.1",
        standards: c.measuring ? inScope(["ISO 9001"]) : inScope(ALL),
        severity: n < 0 ? "high" : "med",
        due: c.nextDue,
        title: `${c.name}: ${c.checkName} ${n < 0 ? "overdue since" : "due"} ${formatDay(c.nextDue)}`,
        why: c.measuring
          ? "ISO 9001 7.1.5: measurements made with an out-of-date instrument cannot be relied on."
          : `${c.basis || "Statutory check"}. Equipment must not be used once overdue.`,
        action: { type: "navigate", label: n < 0 ? "Record completed check" : "Record check", href },
      });
    }
  }

  /* ---------------------------- Compliance ---------------------------- */
  if (s.legal.tracked) {
    if (s.legal.lastReviewedOn) {
      const due = addMonthsIso(s.legal.lastReviewedOn, s.legal.reviewIntervalMonths);
      const n = daysUntil(due, s.today);
      if (n <= SOON_DAYS) {
        add({
          id: `legal-review-${due}`,
          module: "compliance",
          clause: "6.1.3",
          standards: inScope(ENV_OHS),
          severity: n < 0 ? "high" : "med",
          due,
          title: `Legal register review ${n < 0 ? "overdue" : `due ${formatDay(due)}`}`,
          why: "ISO 14001 and 45001 6.1.3: keep your legal duties current.",
          action: { type: "execute", label: "Mark reviewed", command: "legal.review", ref: null },
          offer: { task: "legal_register_review", label: "Check my register for missing duties" },
        });
      }
    }
    for (const duty of s.legal.duties) {
      if (duty.hasEvidence) continue;
      add({
        id: `duty-${duty.id}`,
        module: "compliance",
        clause: "9.1.2",
        standards: inScope(ENV_OHS),
        severity: "med",
        due: null,
        title: `No evidence for: ${duty.name}`,
        why: "Evaluation of compliance needs evidence for every duty, for example waste transfer notes.",
        action: { type: "navigate", label: "Link evidence", href: `/compliance/legal-register${q({ duty: duty.id })}` },
        offer: { task: "explain_clause", label: "What evidence would satisfy this?", ref: "9.1.2" },
      });
    }
  }

  /* ------------------------------ Audits ------------------------------ */
  if (s.audits.tracked) {
    for (const f of s.audits.findings) {
      if (!f.open || !f.dueDate) continue;
      const n = daysUntil(f.dueDate, s.today);
      add({
        id: `f-${f.auditId}-${f.id}`,
        module: "audits",
        clause: "10.2",
        standards: inScope(ALL),
        severity: n < 0 ? "high" : n <= FINDING_SOON_DAYS ? "med" : "low",
        due: f.dueDate,
        title: `${f.reference} ${n < 0 ? "overdue" : `due ${formatDay(f.dueDate)}`}: ${f.text}`,
        why: f.hasEvidence ? "Evidence attached, ready to close." : "No evidence attached yet.",
        action: { type: "navigate", label: "Attach evidence and close", href: `/audits${q({ audit: f.auditId })}` },
      });
    }
    const programme = s.audits.programme;
    const left = unauditedClauses(s);
    if (programme?.cycleEnd && left.length) {
      const n = daysUntil(programme.cycleEnd, s.today);
      add({
        id: `audit-plan-${programme.cycleEnd}`,
        module: "audits",
        clause: "9.2",
        standards: inScope(ALL),
        severity: n < 0 ? "high" : n <= AUDIT_CYCLE_WARN_DAYS ? "med" : "low",
        due: programme.cycleEnd,
        title: `${plural(left.length, "clause")} not yet audited this cycle`,
        why: `${left.slice(0, 6).join(", ")}${left.length > 6 ? "…" : ""}. Plan them before ${formatDay(programme.cycleEnd)}.`,
        action: { type: "navigate", label: "Plan audits", href: `/audits/internal${q({ create: "1" })}` },
        offer: {
          task: "audit_checklist",
          label: `Write checklists for ${left.slice(0, 2).join(" and ")}`,
          ref: left.slice(0, 6).join(","),
        },
      });
    } else if (!programme && s.audits.lastCompletedOn) {
      const due = addMonthsIso(s.audits.lastCompletedOn, AUDIT_FALLBACK_MONTHS);
      const n = daysUntil(due, s.today);
      if (n <= SOON_DAYS) {
        add({
          id: `audit-due-${due}`,
          module: "audits",
          clause: "9.2",
          standards: inScope(ALL),
          severity: severityForDue(n),
          due,
          title: n < 0 ? "Internal audit overdue" : `Internal audit due by ${formatDay(due)}`,
          why: `Last internal audit completed ${formatDay(s.audits.lastCompletedOn)}. Audit at planned intervals to show the system works.`,
          action: { type: "navigate", label: "Schedule audit", href: `/audits/internal${q({ create: "1" })}` },
        });
      }
    }
  }

  /* ------------------------------- Risks ------------------------------ */
  if (s.risks.tracked) {
    for (const r of s.risks.items) {
      if (!r.nextReviewDate) continue;
      const n = daysUntil(r.nextReviewDate, s.today);
      if (n > SOON_DAYS) continue;
      add({
        id: `rr-${r.id}-${r.nextReviewDate}`,
        module: "risks",
        clause: "6.1",
        standards: inScope(ALL),
        severity: n < 0 ? "high" : "med",
        due: r.nextReviewDate,
        title: `${r.reference} ${r.title}: review ${n < 0 ? "overdue" : `due ${formatDay(r.nextReviewDate)}`}`,
        why: "Reviews keep controls effective. Check the scores and controls against recent incidents.",
        action: { type: "execute", label: "Mark reviewed", command: "risk.review", ref: r.id },
        offer: { task: "draft_risk_assessment", label: `Redraft ${r.reference} with recent incidents`, ref: r.id },
      });
    }
    for (const p of nearMissPatterns(s)) {
      add({
        id: `pat-${p.area}`,
        module: "risks",
        clause: "6.1.2",
        standards: inScope(ENV_OHS),
        severity: "high",
        due: null,
        title: `${p.count} near misses at ${p.area} in ${PATTERN_WINDOW_DAYS} days`,
        why: "A pattern like this usually means a control is failing. Review the linked risk now.",
        action: { type: "navigate", label: "Review hazard", href: "/risks" },
        offer: { task: "draft_risk_assessment", label: "Draft new controls for this hazard", ref: p.area },
      });
    }
  }

  /* ----------------------------- Incidents ---------------------------- */
  if (s.incidents.tracked) {
    for (const i of s.incidents.items) {
      if (i.investigation !== "not_started") continue;
      const age = daysUntil(i.occurredOn, s.today);
      add({
        id: `inv-${i.id}`,
        module: "incidents",
        clause: "10.2",
        standards: inScope(ALL),
        severity: age <= -INVESTIGATION_GRACE_DAYS ? "med" : "low",
        due: null,
        title: `${i.reference}${i.type ? ` ${i.type}` : ""}${i.area ? ` at ${i.area}` : ""}: not investigated`,
        why: `Logged ${formatDay(i.occurredOn)}. "${i.title}".`,
        action: { type: "execute", label: "Start investigation", command: "incident.investigate", ref: i.id },
        offer: { task: "incident_root_cause", label: "Run a 5 whys with ALICE", ref: i.id },
      });
    }
  }

  /* ------------------------- Management reviews ----------------------- */
  if (s.reviews.tracked) {
    const r = s.reviews;
    const due = r.lastHeld ? addMonthsIso(r.lastHeld, r.intervalMonths ?? 12) : null;
    const n = due ? daysUntil(due, s.today) : null;
    if (due && n !== null && n <= REVIEW_WARN_DAYS) {
      const missing = r.inputsTracked ? r.inputs.filter((i) => !i.ready) : [];
      add({
        id: `mr-${due}`,
        module: "reviews",
        clause: "9.3",
        standards: inScope(ALL),
        severity: n < 0 ? "high" : n <= SOON_DAYS ? "med" : "low",
        due,
        title: r.scheduled
          ? `Management review scheduled ${formatDay(r.scheduled.date)}`
          : `Management review due ${formatDay(due)}`,
        why: r.inputsTracked
          ? `${r.inputs.length - missing.length} of ${r.inputs.length} required inputs ready.${missing.length ? ` Missing: ${missing.map((i) => i.label).join(", ")}.` : ""}`
          : "Top management must review performance at planned intervals.",
        action: r.scheduled
          ? { type: "navigate", label: "Prepare review", href: `/management-reviews${q({ review: r.scheduled.id })}` }
          : { type: "navigate", label: "Schedule review", href: `/management-reviews${q({ create: "1" })}` },
        offer: {
          task: "management_review_pack",
          label: "Build the input pack from my modules",
          ref: r.scheduled?.id ?? null,
        },
      });
    }
    for (const a of r.actions) {
      if (!a.open || !a.due || daysUntil(a.due, s.today) >= 0) continue;
      add({
        id: `ra-${a.id}`,
        module: "reviews",
        clause: "10.3",
        standards: inScope(ALL),
        severity: "med",
        due: a.due,
        title: `Review action overdue: ${a.title}`,
        why: `Due ${formatDay(a.due)}. Open actions are a common audit finding.`,
        action: { type: "navigate", label: "Open action", href: `/tasks${q({ task: a.id })}` },
      });
    }
  }

  buildRecordAdvice(s, add, inScope);

  return sortAdvice(out);
}

/** Company certificates warn earlier: renewal audits take time to book. */
export const CERTIFICATE_WARN_DAYS = 60;

/**
 * Phase 2.5 sources: documents due for review, supplier certificates and
 * evaluations, the organisation's own certificates, and implemented
 * clauses with no evidence.
 */
function buildRecordAdvice(
  s: ComplianceSnapshot,
  add: (item: AdviceItem) => void,
  inScope: (standards: LiveStandard[]) => LiveStandard[]
): void {
  /* ----------------------------- Documents ---------------------------- */
  if (s.documents.tracked) {
    for (const d of s.documents.items) {
      const n = daysUntil(d.reviewDate, s.today);
      if (n > SOON_DAYS) continue;
      const kind = d.purpose === "Policy" ? "Policy" : "Document";
      add({
        id: `doc-${d.id}-${d.reviewDate}`,
        module: "documents",
        clause: "7.5",
        standards: inScope(ALL),
        severity: severityForDue(n),
        due: d.reviewDate,
        title: `${kind} "${d.name}" ${n < 0 ? "review overdue since" : "due for review"} ${formatDay(d.reviewDate)}`,
        why: "Controlled documents must be reviewed on schedule. An out-of-date policy is a common audit finding.",
        action: {
          type: "navigate",
          label: "Review document",
          href: `/documents/repositories/${encodeURIComponent(d.repositoryId)}/nodes/${encodeURIComponent(d.id)}`,
        },
        ownerUserIds: d.ownerUserIds,
      });
    }
  }

  /* ----------------------------- Suppliers ---------------------------- */
  if (s.suppliers.tracked) {
    for (const sup of s.suppliers.items) {
      const base = `/suppliers${q({ supplier: sup.id, tab: "documents" })}`;
      for (const issue of sup.issues) {
        const isDoc = issue.kind === "expired" || issue.kind === "soon" || issue.kind === "missing";
        const n = issue.due ? daysUntil(issue.due, s.today) : null;
        const severity: AdviceSeverity =
          issue.kind === "expired" || issue.kind === "eval"
            ? sup.approved
              ? "high"
              : "med"
            : issue.kind === "missing"
              ? "med"
              : n !== null
                ? severityForDue(n)
                : "low";
        add({
          id: `sup-${sup.id}-${issue.kind}-${issue.docId ?? issue.docType ?? "eval"}`,
          module: "suppliers",
          clause: "8.4",
          standards: inScope(ALL),
          severity,
          due: issue.due,
          title: `${sup.name}: ${issue.text}`,
          why: "Approved suppliers need valid certificates and regular evaluation (ISO 9001 8.4, ISO 45001 8.1.4).",
          action: isDoc
            ? {
                type: "navigate",
                label: issue.kind === "missing" ? "Request certificate" : "Upload certificate",
                href: base,
              }
            : {
                type: "navigate",
                label: "Evaluate supplier",
                href: `/suppliers${q({ supplier: sup.id, tab: "evaluations" })}`,
              },
        });
      }
    }
  }

  /* ---------------------------- Certificates -------------------------- */
  if (s.certificates.tracked) {
    for (const c of s.certificates.items) {
      if (!c.expires) continue;
      const n = daysUntil(c.expires, s.today);
      if (n > CERTIFICATE_WARN_DAYS) continue;
      const standards = c.standard && (ALL as string[]).includes(c.standard)
        ? inScope([c.standard as LiveStandard])
        : inScope(ALL);
      add({
        id: `cert-${c.id}-${c.expires}`,
        module: "certificates",
        clause: "",
        standards: standards.length ? standards : inScope(ALL),
        severity: n < 0 ? "high" : n <= SOON_DAYS ? "med" : "low",
        due: c.expires,
        title: `${c.name} certificate ${n < 0 ? "expired" : "expires"} ${formatDay(c.expires)}`,
        why: "Keep your own certificates current: customers and auditors ask for them, and an expired one can stop a tender.",
        action: { type: "navigate", label: "Upload renewed certificate", href: `/tender${q({ view: "library" })}` },
      });
    }
  }

  /* ------------------------------ Evidence ---------------------------- */
  if (s.evidence.tracked) {
    const byStandard = new Map<LiveStandard, EvidenceSnapshotMissing[]>();
    for (const m of s.evidence.missing) {
      byStandard.set(m.standard, [...(byStandard.get(m.standard) ?? []), m]);
    }
    for (const [standard, missing] of byStandard) {
      const first = [...missing].sort((a, b) =>
        a.clause.localeCompare(b.clause, undefined, { numeric: true })
      )[0]!;
      add({
        id: `evidence-${standard}`,
        module: "compliance",
        clause: first.clause,
        standards: inScope([standard]),
        severity: missing.length >= 10 ? "med" : "low",
        due: null,
        title:
          missing.length === 1
            ? `${standard} ${first.clause} ${first.title} has no evidence`
            : `${missing.length} implemented ${standard} clauses have no evidence`,
        why: `Auditors ask to see evidence for every implemented clause. Start with ${first.clause} ${first.title}.`,
        action: {
          type: "navigate",
          label: "Add evidence",
          href: `/compliance/${encodeURIComponent(standard)}${q({ control: first.id, panel: "evidence" })}`,
        },
        offer: { task: "gap_analysis", label: `Run a ${standard} gap analysis`, ref: standard },
      });
    }
  }
}

type EvidenceSnapshotMissing = ComplianceSnapshot["evidence"]["missing"][number];
