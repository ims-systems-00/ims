import { describe, expect, it } from "vitest";
import {
  CLAUSE_RULES,
  evaluateClauses,
  nearMissPatterns,
} from "../src/modules/live-compliance/lib/clause-rules";
import { buildAdvice } from "../src/modules/live-compliance/lib/advice-rules";
import {
  percentageOf,
  summariseStandard,
  worstStatus,
} from "../src/modules/live-compliance/lib/health";
import { addDaysIso } from "../src/modules/live-compliance/lib/dates";
import type {
  ComplianceSnapshot,
  LiveClause,
} from "../src/modules/live-compliance/types";

/** Prototype "Northfield Engineering" scenario on 25 Nov 2026. */
function northfield(overrides: Partial<ComplianceSnapshot> = {}): ComplianceSnapshot {
  return {
    today: "2026-11-25",
    standards: ["ISO 9001", "ISO 14001", "ISO 45001"],
    training: {
      tracked: true,
      peopleCount: 4,
      gaps: [
        {
          personId: "p1",
          personName: "Sam Patel",
          competencyId: "cscs",
          competencyName: "CSCS",
          state: "soon",
          next: "2026-11-29",
          booked: false,
        },
      ],
      rolesWithoutRequirements: [],
      acknowledgements: [
        { competencyId: "hs", competencyName: "H&S Policy v4", acknowledged: 41, required: 47 },
      ],
    },
    inventory: {
      tracked: true,
      assetCount: 3,
      checks: [
        {
          assetId: "tw2",
          tag: "TW-02",
          name: "Torque wrench TW-02",
          category: "measuring",
          measuring: true,
          stage: "In service",
          checkName: "Calibration",
          basis: "ISO 9001 7.1.5",
          nextDue: "2026-11-20",
          lastResult: "Pass",
        },
        {
          assetId: "h2",
          tag: "H-02",
          name: "Hoist H-02",
          category: "lifting",
          measuring: false,
          stage: "In service",
          checkName: "LOLER thorough examination",
          basis: "LOLER 1998 reg 9",
          nextDue: "2026-12-09",
          lastResult: "Pass",
        },
      ],
    },
    audits: {
      tracked: true,
      auditCount: 3,
      lastCompletedOn: "2026-06-01",
      programme: null,
      audited: {},
      planned: {},
      findings: [],
      findingsTracked: false,
    },
    risks: {
      tracked: true,
      reviewTracked: true,
      items: [
        { id: "r7", reference: "R-07", title: "Machine guarding", nextReviewDate: "2026-12-01", area: "Press Line 2", score: 8 },
        { id: "r4", reference: "R-04", title: "Manual handling", nextReviewDate: "2027-02-10", area: "Despatch", score: 9 },
      ],
      reviewedPatternAreas: [],
    },
    incidents: {
      tracked: true,
      detailTracked: true,
      items: [
        { id: "i218", reference: "INC-218", title: "Guard interlock taped", type: "Near miss", occurredOn: "2026-11-14", area: "Press Line 2", investigation: "done" },
        { id: "i221", reference: "INC-221", title: "Reached past light curtain", type: "Near miss", occurredOn: "2026-11-20", area: "Press Line 2", investigation: "not_started" },
      ],
    },
    reviews: {
      tracked: true,
      lastHeld: "2025-12-10",
      intervalMonths: 12,
      scheduled: null,
      inputsTracked: false,
      inputs: [],
      actions: [],
    },
    objectives: { tracked: true, count: 3 },
    legal: {
      tracked: true,
      lastReviewedOn: "2025-12-15",
      reviewIntervalMonths: 12,
      duties: [
        { id: "d1", name: "PUWER 1998 reg 11", hasEvidence: true },
        { id: "d2", name: "Waste duty of care", hasEvidence: false },
      ],
    },
    documents: { tracked: false, items: [] },
    suppliers: { tracked: false, items: [] },
    certificates: { tracked: false, items: [] },
    evidence: { tracked: false, missing: [] },
    ...overrides,
  };
}

const status = (s: ComplianceSnapshot, key: string) => evaluateClauses(s).get(key);

describe("live compliance clause rules", () => {
  it("only applies rules to the standards they belong to", () => {
    const keys = [...evaluateClauses(northfield()).keys()];
    // 7.1.5 is ISO 9001 only; 9.1.2 / 6.1.3 / 6.1.2 are ISO 14001 + 45001 only.
    expect(keys).toContain("ISO 9001|7.1.5");
    expect(keys).not.toContain("ISO 14001|7.1.5");
    expect(keys).not.toContain("ISO 9001|9.1.2");
    expect(keys).toContain("ISO 45001|9.1.2");
    expect(keys).not.toContain("ISO 9001|6.1.3");
  });

  it("skips standards not in scope", () => {
    const keys = [...evaluateClauses(northfield({ standards: ["ISO 9001"] })).keys()];
    expect(keys.every((k) => k.startsWith("ISO 9001|"))).toBe(true);
  });

  it("7.2 Competence is at risk when a competency expires within 30 days", () => {
    const r = status(northfield(), "ISO 9001|7.2")!;
    expect(r.status).toBe("risk");
    expect(r.detail).toBe("1 competency expire within 30 days");
    expect(r.due).toBe("2026-11-29");
  });

  it("7.2 lapses once the expiry passes, and recovers when a refresher is booked", () => {
    const later = northfield({ today: "2026-12-02" });
    later.training.gaps[0]!.state = "over";
    expect(status(later, "ISO 9001|7.2")!.status).toBe("lapsed");
    later.training.gaps[0]!.booked = true;
    const booked = status(later, "ISO 9001|7.2")!;
    expect(booked.status).toBe("risk");
    expect(booked.detail).toContain("refresher booked");
  });

  it("7.2 is sustained when there are no gaps", () => {
    const s = northfield();
    s.training.gaps = [];
    expect(status(s, "ISO 9001|7.2")!.status).toBe("sus");
  });

  it("7.3 Awareness is at risk below 95% acknowledgement", () => {
    const r = status(northfield(), "ISO 45001|7.3")!;
    expect(r.status).toBe("risk");
    expect(r.detail).toContain("41 of 47 (87%)");
  });

  it("7.1.5 lapses when calibration is overdue", () => {
    const r = status(northfield(), "ISO 9001|7.1.5")!;
    expect(r.status).toBe("lapsed");
    expect(r.detail).toContain("Torque wrench TW-02");
  });

  it("8.1 is at risk when an examination falls due, lapsed when failed but in service", () => {
    expect(status(northfield(), "ISO 9001|8.1")!.status).toBe("risk");
    const s = northfield();
    s.inventory.checks[1]!.lastResult = "Fail";
    const r = status(s, "ISO 9001|8.1")!;
    expect(r.status).toBe("lapsed");
    expect(r.detail).toContain("still in service");
    s.inventory.checks[1]!.stage = "Quarantined";
    expect(status(s, "ISO 9001|8.1")!.status).not.toBe("lapsed");
  });

  it("6.1 follows the earliest risk review date", () => {
    expect(status(northfield(), "ISO 9001|6.1")!.status).toBe("risk");
    const s = northfield();
    s.risks.items.forEach((r) => (r.nextReviewDate = null));
    expect(status(s, "ISO 9001|6.1")!.status).toBe("prog");
  });

  it("6.1.2 detects a near-miss pattern (3 in 14 days, same area)", () => {
    const s = northfield();
    expect(nearMissPatterns(s)).toEqual([]);
    s.incidents.items.push({
      id: "i224",
      reference: "INC-224",
      title: "Guard opened while cycling",
      type: "Near miss",
      occurredOn: "2026-11-25",
      area: "Press Line 2",
      investigation: "not_started",
    });
    expect(nearMissPatterns(s)).toEqual([{ area: "Press Line 2", count: 3 }]);
    expect(status(s, "ISO 45001|6.1.2")!.status).toBe("risk");
    s.risks.reviewedPatternAreas = ["Press Line 2"];
    expect(status(s, "ISO 45001|6.1.2")!.status).toBe("sus");
  });

  it("10.2 flags incidents not investigated after 2 days", () => {
    const r = status(northfield(), "ISO 9001|10.2")!;
    expect(r.status).toBe("risk");
    expect(r.detail).toBe("INC-221 not investigated");
  });

  it("10.2 lapses on an overdue audit finding", () => {
    const s = northfield();
    s.audits.findingsTracked = true;
    s.audits.findings = [
      { id: "nc1", auditId: "a1", reference: "NC-0142", text: "Toolbox talks incomplete", clause: "7.2", dueDate: "2026-11-20", open: true, hasEvidence: false },
    ];
    expect(status(s, "ISO 9001|10.2")!.status).toBe("lapsed");
  });

  it("9.3 Management review becomes at risk 30 days before due, lapsed after", () => {
    expect(status(northfield(), "ISO 9001|9.3")!.status).toBe("risk"); // due 10 Dec 2026
    expect(status(northfield({ today: "2026-12-11" }), "ISO 9001|9.3")!.status).toBe("lapsed");
    expect(status(northfield({ today: "2026-10-01" }), "ISO 9001|9.3")!.status).toBe("sus");
  });

  it("6.1.3 / 9.1.2 read the legal register", () => {
    expect(status(northfield(), "ISO 14001|6.1.3")!.status).toBe("risk"); // due 15 Dec
    const r = status(northfield(), "ISO 14001|9.1.2")!;
    expect(r.status).toBe("prog");
    expect(r.detail).toBe("1 legal duty with no evidence linked");
  });

  it("reports 'not tracked yet' when a module is unavailable", () => {
    const s = northfield();
    s.legal = { tracked: false, lastReviewedOn: null, reviewIntervalMonths: 12, duties: [] };
    const r = status(s, "ISO 14001|6.1.3")!;
    expect(r.status).toBe("not");
    expect(r.detail).toBe("Legal register not tracked yet");
  });

  it("9.2 falls back to the last completed audit without a programme", () => {
    expect(status(northfield(), "ISO 9001|9.2")!.status).toBe("sus");
    expect(status(northfield({ today: "2027-05-15" }), "ISO 9001|9.2")!.status).toBe("risk");
    expect(status(northfield({ today: "2027-06-02" }), "ISO 9001|9.2")!.status).toBe("lapsed");
  });

  it("9.2 uses the audit programme when one exists", () => {
    const s = northfield();
    s.audits.programme = { cycleEnd: "2027-01-10", inScope: { "ISO 9001": ["7.2", "8.1", "9.3"] } };
    s.audits.audited = { "ISO 9001": ["7.2"] };
    const r = status(s, "ISO 9001|9.2")!;
    expect(r.status).toBe("risk");
    expect(r.detail).toBe("2 clauses not yet audited, cycle ends 10 Jan 2027");
  });

  it("every rule declares at least one standard and a unique id", () => {
    const ids = CLAUSE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CLAUSE_RULES.every((r) => r.standards.length > 0)).toBe(true);
  });
});

describe("live compliance advice", () => {
  it("produces deterministic, severity-sorted advice with deep links", () => {
    const advice = buildAdvice(northfield());
    expect(advice.map((a) => a.id)).toEqual(buildAdvice(northfield()).map((a) => a.id));
    const severities = advice.map((a) => a.severity);
    const rank = { high: 0, med: 1, low: 2 } as const;
    expect([...severities].sort((a, b) => rank[a] - rank[b])).toEqual(severities);

    const refresher = advice.find((a) => a.id === "tr-p1-cscs")!;
    expect(refresher.severity).toBe("med"); // 4 days away
    expect(refresher.action).toEqual({
      type: "navigate",
      label: "Book refresher",
      href: "/training?createSession=1&cid=cscs&attendees=p1",
    });
  });

  it("raises high severity for overdue calibration and asks to record the check", () => {
    const item = buildAdvice(northfield()).find((a) => a.module === "inventory" && a.clause === "7.1.5")!;
    expect(item.severity).toBe("high");
    expect(item.action).toMatchObject({ type: "navigate", href: "/inventory?asset=tw2&tab=checks" });
  });

  it("offers one-click commands where no extra input is needed", () => {
    const advice = buildAdvice(northfield());
    expect(advice.find((a) => a.id === "inv-i221")!.action).toMatchObject({
      type: "execute",
      command: "incident.investigate",
      ref: "i221",
    });
    expect(advice.find((a) => a.id === "rr-r7-2026-12-01")!.action).toMatchObject({
      type: "execute",
      command: "risk.review",
    });
  });

  it("drops advice for standards out of scope", () => {
    const advice = buildAdvice(northfield({ standards: ["ISO 9001"] }));
    expect(advice.some((a) => a.clause === "9.1.2" || a.clause === "6.1.3")).toBe(false);
  });

  it("does not suggest a refresher already booked", () => {
    const s = northfield();
    s.training.gaps[0]!.booked = true;
    expect(buildAdvice(s).some((a) => a.id === "tr-p1-cscs")).toBe(false);
  });

  it("stops warning about expiries further than 30 days out", () => {
    const s = northfield({ today: addDaysIso("2026-11-29", -31) });
    expect(buildAdvice(s).some((a) => a.id === "tr-p1-cscs")).toBe(false);
  });
});

describe("live compliance health roll-up", () => {
  it("computes compliant-today percentage and worst status", () => {
    expect(percentageOf(["sus", "risk", "lapsed", "not"])).toBe(50);
    expect(worstStatus(["sus", "risk", "prog"])).toBe("risk");
    expect(worstStatus([])).toBe("not");
    const clauses = [
      { standard: "ISO 9001", status: "sus" },
      { standard: "ISO 9001", status: "lapsed" },
      { standard: "ISO 14001", status: "risk" },
    ] as LiveClause[];
    expect(summariseStandard("ISO 9001", clauses)).toMatchObject({
      total: 2,
      sustained: 1,
      lapsed: 1,
      percentage: 50,
      worst: "lapsed",
    });
  });
});
