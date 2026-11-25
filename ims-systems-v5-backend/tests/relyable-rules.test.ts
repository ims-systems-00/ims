import { describe, expect, it } from "vitest";
import {
  applicability,
  compute,
  contributions,
  defaultScope,
  fromSic,
  nextRisks,
  raiseIt,
  registerEvidenceFromFacts,
} from "../src/modules/relyable/lib/relyable-rules";

const now = new Date("2026-11-24T12:00:00Z");

describe("relyable scope", () => {
  it("maps construction SIC to contractor/sites/lifting", () => {
    const s = fromSic(["41201"]);
    expect(s.family).toBe("construction");
    expect(s.attrs.contractor).toBe(1);
    expect(s.attrs.sites).toBe(1);
    expect(s.attrs.lifting).toBe(1);
  });

  it("marks SSIP N/A for professional services", () => {
    const scope = defaultScope({ sic: ["69201"], employees: 40 });
    expect(scope.family).toBe("professional");
    const ap = applicability(scope);
    expect(ap.items["cert.ssip"]).toBe("na");
    expect(ap.items["training.competence"]).toBe("required");
  });
});

describe("relyable score engine", () => {
  it("scores Tier-0 unclaimed org with register facts only", () => {
    const scope = defaultScope({ sic: ["25620"], employees: 120 });
    scope.attrs.lifting = 1;
    scope.attrs.premises = 1;
    scope.attrs.employs = 1;
    const items = registerEvidenceFromFacts({}, "2026-11-24");
    const result = compute({ scope, items, now, facts: {} });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1000);
    expect(result.modelVersion).toBe("2026.11");
    expect(result.caps.some((c) => c.limit === 699)).toBe(true);
  });

  it("applies accounts overdue cap at 399", () => {
    const scope = defaultScope({ sic: ["25620"], employees: 120 });
    const items = registerEvidenceFromFacts(
      { accountsOverdue: true },
      "2026-11-24"
    );
    const result = compute({
      scope,
      items,
      now,
      facts: { accountsOverdue: true },
    });
    expect(result.score).toBeLessThanOrEqual(399);
    expect(result.caps.some((c) => c.limit === 399)).toBe(true);
  });

  it("raises score when Tier-3 training aggregate is present", () => {
    const scope = defaultScope({ sic: ["25620"], employees: 120 });
    scope.attrs = {
      employs: 1,
      sites: 0,
      premises: 1,
      contractor: 0,
      vehicles: 0,
      lifting: 1,
      food: 0,
      regulated: 0,
      data: 0,
    };
    const baseItems = registerEvidenceFromFacts({}, "2026-11-24");
    const base = compute({ scope, items: baseItems, now, facts: {} });
    const withTraining = compute({
      scope,
      items: [
        ...baseItems,
        {
          type: "training.competence",
          status: "partial",
          observedAt: "2026-11-20",
          level: 3,
          payload: { ok: 94, total: 95 },
        },
        {
          type: "policy.hs",
          status: "valid",
          observedAt: "2026-01-01",
          validUntil: "2027-01-01",
          level: 3,
        },
        {
          type: "asset.loler",
          status: "partial",
          observedAt: "2026-11-01",
          level: 3,
          payload: { ok: 10, total: 10 },
        },
        {
          type: "fin.insurance.el",
          status: "valid",
          observedAt: "2026-01-01",
          validUntil: "2027-01-01",
          level: 2,
        },
        {
          type: "fin.insurance.pl",
          status: "valid",
          observedAt: "2026-01-01",
          validUntil: "2027-01-01",
          level: 2,
        },
        {
          type: "fire.risk.assessment",
          status: "valid",
          observedAt: "2026-01-01",
          validUntil: "2027-01-01",
          level: 2,
        },
      ],
      now,
      facts: {},
    });
    expect(withTraining.score).toBeGreaterThan(base.score);
    expect(withTraining.verifiedRatio).toBeGreaterThan(base.verifiedRatio);
  });

  it("computes module contributions and raise-it deltas", () => {
    const scope = defaultScope({ sic: ["25620"], employees: 120 });
    scope.attrs.lifting = 1;
    scope.attrs.premises = 1;
    scope.attrs.employs = 1;
    const items = [
      ...registerEvidenceFromFacts({}, "2026-11-24"),
      {
        type: "training.competence",
        status: "partial" as const,
        observedAt: "2026-11-20",
        level: 3 as const,
        payload: { ok: 90, total: 100 },
      },
    ];
    const snap = compute({ scope, items, now, facts: {} });
    const contrib = contributions(snap, scope);
    expect(contrib.modules.some((m) => m.id === "training")).toBe(true);
    const training = contrib.modules.find((m) => m.id === "training")!;
    expect(training.max).toBeGreaterThan(0);
    const raise = raiseIt({ scope, items, now, facts: {} });
    expect(raise.length).toBeGreaterThan(0);
    expect(raise[0]!.delta).toBeGreaterThan(0);
  });

  it("lists next risks for near-expiry certificates", () => {
    const scope = defaultScope({ employees: 50 });
    const risks = nextRisks({
      scope,
      items: [
        {
          type: "fin.insurance.el",
          status: "valid",
          observedAt: "2026-01-01",
          validUntil: "2026-12-20",
          level: 2,
        },
      ],
      now,
    });
    expect(risks.some((r) => r.type === "fin.insurance.el")).toBe(true);
    expect(risks[0]!.in).toBeLessThanOrEqual(90);
  });
});
