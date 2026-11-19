import { describe, expect, it } from "vitest";
import {
  applyEvaluationOutcome,
  applyStandingRules,
  collectIssues,
  docState,
  missingDocs,
  requiredDocs,
  validateCriteriaWeights,
  weightedScore,
} from "../src/modules/supplier/lib/asl-rules";
import {
  DEFAULT_ASL_CRITERIA,
  DEFAULT_ASL_INTERVAL,
  type AslSupplier,
} from "../src/modules/supplier/types";

function baseSupplier(overrides: Partial<AslSupplier> = {}): AslSupplier {
  return {
    id: "1",
    organizationId: "org",
    reference: "ASL-1",
    name: "Test Co",
    cat: "Raw materials",
    crit: "Critical",
    status: "Approved",
    contact: "",
    email: "a@b.com",
    stds: ["ISO 9001"],
    scope: "",
    reqs: "Spec 1",
    appby: "QA",
    appon: "2025-01-01",
    docs: [
      {
        id: "d1",
        type: "Insurance (PL/EL)",
        exp: "2099-01-01",
        ref: "P1",
        req: true,
        chased: null,
      },
      {
        id: "d2",
        type: "ISO certificate",
        exp: "2099-01-01",
        ref: "ISO",
        req: true,
        chased: null,
      },
      {
        id: "d3",
        type: "Signed requirements / T&Cs",
        exp: "2099-01-01",
        ref: "TC",
        req: true,
        chased: null,
      },
    ],
    evals: [
      {
        id: "e1",
        date: "2026-01-01",
        by: "QA",
        scores: { quality: 4, delivery: 4, hse: 4, resp: 4, comm: 4 },
        note: "",
        score: 4,
      },
    ],
    comms: [],
    trail: [],
    createdBy: "u1",
    createdOn: "2025-01-01T00:00:00.000Z",
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("asl-rules", () => {
  it("computes required docs for critical + contractor", () => {
    const req = requiredDocs({
      crit: "Critical",
      cat: "Contractor on site",
    });
    expect(req).toContain("Insurance (PL/EL)");
    expect(req).toContain("RAMS");
    expect(req.some((r) => r.includes("Signed requirements"))).toBe(true);
  });

  it("classifies document states", () => {
    expect(docState({ exp: null }, 30)).toBe("missing");
    expect(docState({ exp: "2000-01-01" }, 30)).toBe("expired");
    expect(docState({ exp: "2099-12-31" }, 30)).toBe("ok");
  });

  it("scores evaluations with weights", () => {
    const score = weightedScore(
      { quality: 5, delivery: 5, hse: 5, resp: 5, comm: 5 },
      DEFAULT_ASL_CRITERIA
    );
    expect(score).toBe(5);
  });

  it("moves approved supplier to conditional when mandatory missing", () => {
    const supplier = baseSupplier({
      docs: [
        {
          id: "d1",
          type: "Insurance (PL/EL)",
          exp: "2099-01-01",
          ref: "",
          req: true,
          chased: null,
        },
      ],
    });
    expect(missingDocs(supplier, 30).length).toBeGreaterThan(0);
    const result = applyStandingRules(supplier, {
      lead: 30,
      criteria: DEFAULT_ASL_CRITERIA,
    });
    expect(result.supplier.status).toBe("Conditional");
    expect(result.statusChanged).toBe(true);
  });

  it("approves prospective after strong evaluation", () => {
    const supplier = baseSupplier({
      status: "Prospective",
      appby: "",
      appon: null,
      evals: [],
    });
    const evaluation = {
      id: "e2",
      date: "2026-06-01",
      by: "QA",
      scores: { quality: 4, delivery: 4, hse: 4, resp: 4, comm: 4 },
      note: "",
      score: 4,
    };
    const next = applyEvaluationOutcome(supplier, evaluation, "QA");
    expect(next.status).toBe("Approved");
    expect(next.appby).toBe("QA");
    expect(next.appon).toBeTruthy();
  });

  it("suspends on score below 2", () => {
    const supplier = baseSupplier({ status: "Approved" });
    const next = applyEvaluationOutcome(
      supplier,
      {
        id: "e3",
        date: "2026-06-01",
        by: "QA",
        scores: { quality: 1, delivery: 1, hse: 1, resp: 1, comm: 1 },
        note: "",
        score: 1,
      },
      "QA"
    );
    expect(next.status).toBe("Suspended");
  });

  it("validates criteria weights", () => {
    expect(validateCriteriaWeights(DEFAULT_ASL_CRITERIA)).toBeNull();
    expect(
      validateCriteriaWeights([{ k: "a", n: "A", w: 50 }])
    ).toMatch(/100/);
  });

  it("collects issues including overdue evaluation", () => {
    const supplier = baseSupplier({
      evals: [
        {
          id: "e1",
          date: "2020-01-01",
          by: "QA",
          scores: { quality: 4, delivery: 4, hse: 4, resp: 4, comm: 4 },
          note: "",
          score: 4,
        },
      ],
    });
    const issues = collectIssues(supplier, {
      lead: 30,
      interval: DEFAULT_ASL_INTERVAL,
      criteria: DEFAULT_ASL_CRITERIA,
    });
    expect(issues.some((i) => i.k === "eval")).toBe(true);
  });
});
