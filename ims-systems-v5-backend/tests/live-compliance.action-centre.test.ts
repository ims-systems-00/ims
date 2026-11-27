import { describe, expect, it, vi } from "vitest";
import type { ControlHealth, ControlHealthRow } from "../src/modules/compliance";
import { suppliersSnapshotFromAsl } from "../src/modules/live-compliance/adapters/collectors";
import { buildAdvice } from "../src/modules/live-compliance/lib/advice-rules";
import { evaluateClauses } from "../src/modules/live-compliance/lib/clause-rules";
import {
  actionBucket,
  createLiveComplianceService,
  emptySnapshot,
} from "../src/modules/live-compliance/services/live-compliance.service";
import type { LiveClauseStorePort, SnapshotCollectorPort } from "../src/modules/live-compliance/ports";
import type { LiveComplianceRepository } from "../src/modules/live-compliance/repositories/live-compliance.repository";
import type { AdviceItem, ComplianceSnapshot } from "../src/modules/live-compliance/types";
import type { AslSupplier } from "../src/modules/supplier/types";
import type { SecurityIdentity } from "../src/security";

const TODAY = "2026-11-26";

function snapshot(overrides: Partial<ComplianceSnapshot> = {}): ComplianceSnapshot {
  return { ...emptySnapshot(TODAY, ["ISO 9001", "ISO 45001"]), ...overrides };
}

const doc = (id: string, reviewDate: string, extra: Partial<ComplianceSnapshot["documents"]["items"][number]> = {}) => ({
  id,
  repositoryId: "repo1",
  name: `Doc ${id}`,
  purpose: "Policy",
  reviewDate,
  ownerUserIds: ["owner-1"],
  ...extra,
});

describe("Phase 2.5 clause rules", () => {
  it("7.5 follows document review dates, and defers to the manual state without them", () => {
    expect(evaluateClauses(snapshot()).has("ISO 9001|7.5")).toBe(false);
    expect(
      evaluateClauses(snapshot({ documents: { tracked: true, items: [] } })).has("ISO 9001|7.5")
    ).toBe(false);

    const risk = evaluateClauses(
      snapshot({ documents: { tracked: true, items: [doc("a", "2027-06-01"), doc("b", "2026-12-10")] } })
    ).get("ISO 9001|7.5");
    expect(risk).toMatchObject({ status: "risk", detail: "Doc b: review due 10 Dec 2026", due: "2026-12-10" });

    const lapsed = evaluateClauses(
      snapshot({ documents: { tracked: true, items: [doc("c", "2026-11-01")] } })
    ).get("ISO 45001|7.5");
    expect(lapsed?.status).toBe("lapsed");
  });

  it("supplier control maps to 8.4 (ISO 9001) and 8.1.4 (ISO 45001)", () => {
    const s = snapshot({
      suppliers: {
        tracked: true,
        items: [
          {
            id: "s1",
            name: "Acme Lifting",
            approved: true,
            issues: [{ kind: "expired", text: "Insurance expired 1 Nov 2026", docType: "Insurance", docId: "d1", due: "2026-11-01" }],
          },
        ],
      },
    });
    const evals = evaluateClauses(s);
    expect(evals.get("ISO 9001|8.4")).toMatchObject({ status: "lapsed", detail: "Acme Lifting: Insurance expired 1 Nov 2026" });
    expect(evals.get("ISO 45001|8.1.4")?.status).toBe("lapsed");
    expect(evals.has("ISO 9001|8.1.4")).toBe(false);

    const ok = evaluateClauses(
      snapshot({ suppliers: { tracked: true, items: [{ id: "s2", name: "Good Co", approved: true, issues: [] }] } })
    );
    expect(ok.get("ISO 9001|8.4")).toMatchObject({ status: "sus", detail: "1 supplier with certificates in date" });
  });
});

describe("Phase 2.5 advice", () => {
  it("builds actionable items for documents, suppliers, certificates and missing evidence", () => {
    const advice = buildAdvice(
      snapshot({
        documents: { tracked: true, items: [doc("p1", "2026-11-20"), doc("p2", "2027-05-01")] },
        suppliers: {
          tracked: true,
          items: [
            {
              id: "s1",
              name: "Acme Lifting",
              approved: true,
              issues: [
                { kind: "soon", text: "ISO 9001 certificate expires 5 Dec 2026", docType: "ISO 9001", docId: "d9", due: "2026-12-05" },
                { kind: "missing", text: "Insurance not on file", docType: "Insurance", docId: null, due: null },
              ],
            },
          ],
        },
        certificates: {
          tracked: true,
          items: [
            { id: "c1", name: "ISO 45001", standard: "ISO 45001", expires: "2027-01-10" },
            { id: "c2", name: "Cyber Essentials", standard: null, expires: "2028-01-01" },
          ],
        },
        evidence: {
          tracked: true,
          missing: [
            { id: "x2", standard: "ISO 9001", clause: "7.1.2", title: "People" },
            { id: "x1", standard: "ISO 9001", clause: "5.2", title: "Policy" },
          ],
        },
      })
    );
    const byId = Object.fromEntries(advice.map((a) => [a.id, a]));

    expect(byId["doc-p1-2026-11-20"]).toMatchObject({
      module: "documents",
      clause: "7.5",
      severity: "high",
      title: 'Policy "Doc p1" review overdue since 20 Nov 2026',
      ownerUserIds: ["owner-1"],
      action: { type: "navigate", label: "Review document", href: "/documents/repositories/repo1/nodes/p1" },
    });
    expect(byId["doc-p2-2027-05-01"]).toBeUndefined();

    expect(byId["sup-s1-soon-d9"]).toMatchObject({
      severity: "med",
      action: { label: "Upload certificate", href: "/suppliers?supplier=s1&tab=documents" },
    });
    expect(byId["sup-s1-missing-Insurance"]).toMatchObject({ action: { label: "Request certificate" } });

    expect(byId["cert-c1-2027-01-10"]).toMatchObject({
      module: "certificates",
      clause: "",
      standards: ["ISO 45001"],
      severity: "low",
      action: { href: "/tender?view=library" },
    });
    expect(byId["cert-c2-2028-01-01"]).toBeUndefined();

    expect(byId["evidence-ISO 9001"]).toMatchObject({
      clause: "5.2",
      title: "2 implemented ISO 9001 clauses have no evidence",
      action: { label: "Add evidence", href: "/compliance/ISO%209001?control=x1&panel=evidence" },
    });
  });
});

describe("suppliersSnapshotFromAsl", () => {
  it("dates certificate and evaluation issues from the ASL rules", () => {
    const supplier = {
      id: "s1",
      name: "Acme",
      status: "Approved",
      crit: "Standard",
      cat: "Other",
      appon: "2025-01-01",
      evalDue: null,
      evals: [{ id: "e1", date: "2025-10-01", by: "u", scores: {}, note: "", score: 4 }],
      docs: [
        { id: "d1", type: "Insurance", exp: "2026-11-01", ref: "", req: true, chased: null, file: null },
        { id: "d2", type: "ISO 9001", exp: "2026-12-10", ref: "", req: true, chased: null, file: null },
      ],
    } as unknown as AslSupplier;
    const snap = suppliersSnapshotFromAsl([supplier], { lead: 30, interval: { Critical: 6, High: 12, Standard: 12, Low: 24 } as never }, TODAY);
    const kinds = snap.items[0]!.issues.map((i) => [i.kind, i.docId, i.due]);
    expect(kinds).toContainEqual(["expired", "d1", "2026-11-01"]);
    expect(kinds).toContainEqual(["soon", "d2", "2026-12-10"]);
    // Last evaluation 1 Oct 2025 + 12 months → overdue since 1 Oct 2026.
    expect(kinds).toContainEqual(["eval", null, "2026-10-01"]);
    expect(snap.items[0]!.approved).toBe(true);
  });
});

describe("action buckets", () => {
  const item = (due: string | null, severity: AdviceItem["severity"] = "med") =>
    ({ due, severity }) as AdviceItem;
  it("groups by urgency", () => {
    expect(actionBucket(item("2026-11-25"), TODAY)).toBe("now");
    expect(actionBucket(item(null, "high"), TODAY)).toBe("now");
    expect(actionBucket(item("2026-11-26"), TODAY)).toBe("week");
    expect(actionBucket(item("2026-12-03"), TODAY)).toBe("week");
    expect(actionBucket(item("2026-12-04"), TODAY)).toBe("later");
    expect(actionBucket(item(null, "low"), TODAY)).toBe("later");
  });
});

describe("action centre service", () => {
  const rows: ControlHealthRow[] = [
    { id: "c75", name: "ISO 9001", clause: "7.5", title: "Documented information", state: "Implemented", health: null, responsibleUserId: null, accountableUserId: null },
    { id: "c84", name: "ISO 9001", clause: "8.4", title: "External providers", state: "Not implemented", health: null, responsibleUserId: "clause-owner", accountableUserId: null },
  ];
  const store: LiveClauseStorePort = {
    provisionedToolkits: async () => ["ISO 9001"],
    listRows: async () => rows.map((r) => ({ ...r })),
    applyHealth: async (_o, updates: Array<{ id: string; health: ControlHealth }>) => {
      for (const u of updates) rows.find((r) => r.id === u.id)!.health = u.health;
    },
  };
  const repo = {
    listAdviceStates: async () => [
      { adviceId: "cert-snoozed-2026-12-01", firstSeenAt: new Date(), snoozedUntil: new Date("2027-01-01"), resolvedAt: null },
    ],
    syncAdvice: async (_o: string, items: Array<{ id: string }>) => items.map((i) => i.id),
    addActivity: async () => undefined,
  } as unknown as LiveComplianceRepository;
  const collector: SnapshotCollectorPort = {
    collect: async () => ({
      documents: { tracked: true, items: [doc("mine", "2026-11-20", { ownerUserIds: ["me"] }), doc("theirs", "2026-11-28", { ownerUserIds: ["other"] })] },
      suppliers: {
        tracked: true,
        items: [{ id: "s1", name: "Acme", approved: true, issues: [{ kind: "eval", text: "No evaluation recorded", docType: null, docId: null, due: null }] }],
      },
      certificates: {
        tracked: true,
        items: [
          { id: "c1", name: "ISO 9001", standard: "ISO 9001", expires: "2026-12-30" },
          { id: "snoozed", name: "Old", standard: null, expires: "2026-12-01" },
        ],
      },
    }),
  };
  const make = (isAdmin: boolean) =>
    createLiveComplianceService({
      authorizer: { allow: vi.fn(async () => true) },
      repository: repo,
      clauses: store,
      collectors: [collector],
      now: () => new Date(`${TODAY}T09:00:00Z`),
      people: { isAdmin: async () => isAdmin },
    });
  const as = (userId: string) => ({ subjectId: userId, organizationId: "org" }) as SecurityIdentity;

  it("shows owners their records and admins the unowned ones, grouped by urgency", async () => {
    const member = await make(false).actionCentre(as("me"));
    expect(member.scope).toBe("mine");
    expect(member.items.map((i) => [i.id, i.bucket])).toEqual([["doc-mine-2026-11-20", "now"]]);

    const admin = await make(true).actionCentre(as("admin"));
    const ids = admin.items.map((i) => i.id);
    expect(ids).toContain("cert-c1-2026-12-30");
    expect(ids).not.toContain("doc-mine-2026-11-20"); // owned by someone else
    expect(ids).not.toContain("cert-snoozed-2026-12-01"); // snoozed
    // Supplier advice sits on clause 8.4, which has a RACI owner.
    expect(ids).not.toContain("sup-s1-eval-eval");
    expect((await make(false).actionCentre(as("clause-owner"))).items.map((i) => i.id)).toEqual(["sup-s1-eval-eval"]);

    const all = await make(true).actionCentre(as("admin"), "all");
    expect(all.scope).toBe("all");
    expect(all.counts).toMatchObject({ now: 2, week: 1, later: 1, total: 4 });
    expect(all.readiness).toEqual([
      expect.objectContaining({ standard: "ISO 9001", lapsed: 2 }),
    ]);
  });

  it("refuses 'all' for non-admins", async () => {
    expect((await make(false).actionCentre(as("me"), "all")).scope).toBe("mine");
  });
});
