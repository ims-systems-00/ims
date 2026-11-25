import { describe, expect, it } from "vitest";
import {
  aggregateAslCriticalApproved,
  aggregateAslEvidence,
  aggregateInventoryEvidence,
  aggregateInventorySchedule,
  aggregateManagementReviewEvidence,
  aggregateTrainingCompetence,
  aggregateTrainingEvidence,
  aggregateTrainingInduction,
  aggregateTrainingLicence,
  ratioStatus,
} from "../src/modules/relyable/lib/collectors-aggregate";
import { compute, defaultScope } from "../src/modules/relyable/lib/relyable-rules";
import {
  DEFAULT_COMPETENCIES,
  DEFAULT_ROLES,
  DEFAULT_SETTINGS,
} from "../src/modules/training/lib/training-rules";
import type { ScheduleRow } from "../src/modules/inventory/types";
import type { AslSupplier } from "../src/modules/supplier/types";
import type {
  TrainingModel,
  TrainingRecord,
} from "../src/modules/training/types";

const now = new Date("2026-11-24T12:00:00Z");

function trainingModel(overrides: Partial<TrainingModel> = {}): TrainingModel {
  return {
    org: "Northfield Engineering Ltd",
    settings: { ...DEFAULT_SETTINGS, leadDays: 60, inductionDays: 14 },
    competencies: DEFAULT_COMPETENCIES.map((c) => ({
      ...c,
      id: c.key,
      organizationId: "o",
      archived: false,
      custom: false,
      description: "",
      provider: "",
      quiz: c.quiz || [],
      createdAt: "",
      updatedAt: "",
    })),
    roles: DEFAULT_ROLES.map((r) => ({
      ...r,
      id: r.key,
      organizationId: "o",
      description: "",
      createdAt: "",
      updatedAt: "",
    })),
    people: [
      {
        id: "a",
        organizationId: "o",
        name: "Ann",
        roles: ["crane"],
        site: "S",
        manager: "",
        start: "2024-01-01",
        email: "ann@x.test",
        status: "Active",
        end: "",
        extra: [],
        exempt: [],
        external: false,
        company: "",
        userId: null,
        hist: [{ t: "", by: "", what: "x" }],
        createdAt: "",
        updatedAt: "",
      },
    ],
    records: [],
    sessions: [],
    ...overrides,
  };
}

function rec(personId: string, cid: string, date = "2026-01-01"): TrainingRecord {
  return {
    id: `${personId}-${cid}-${date}`,
    organizationId: "o",
    personId,
    cid,
    date,
    result: "Pass",
    provider: "",
    ref: "r",
    fileId: null,
    verifiedBy: "",
    note: "",
    toVerify: false,
    t: `${date}T10:00`,
    createdAt: "",
    updatedAt: "",
  };
}

function scheduleRow(
  partial: Partial<ScheduleRow> & Pick<ScheduleRow, "category" | "state">
): ScheduleRow {
  return {
    assetId: "a1",
    tag: "T-1",
    name: "Asset",
    stage: "In service",
    checkName: "Thorough examination",
    basis: "",
    intervalMonths: 12,
    lastDate: "2026-01-01",
    lastResult: "Pass",
    lastRef: null,
    nextDue: "2027-01-01",
    ...partial,
  };
}

describe("relyable collector aggregates", () => {
  it("ratioStatus is valid only when ok covers total", () => {
    expect(ratioStatus(0, 0)).toBe("valid");
    expect(ratioStatus(3, 3)).toBe("valid");
    expect(ratioStatus(2, 3)).toBe("partial");
  });

  it("aggregates training competence ok/total from matrix cells", () => {
    const empty = trainingModel();
    const emptyRatio = aggregateTrainingCompetence(empty, now);
    expect(emptyRatio.total).toBeGreaterThan(0);
    expect(emptyRatio.ok).toBe(0);

    const withAll = trainingModel({
      records: empty.competencies.map((c) => rec("a", c.id)),
    });
    const full = aggregateTrainingCompetence(withAll, now);
    expect(full.total).toBeGreaterThan(0);
    expect(full.ok).toBe(full.total);

    const emits = aggregateTrainingEvidence(withAll, now);
    const competence = emits.find((e) => e.type === "training.competence");
    expect(competence?.status).toBe("valid");
    expect(competence?.payload).toEqual({ ok: full.ok, total: full.total });
    expect(competence?.source).toBe("module:training");
    expect(competence?.level).toBe(3);
  });

  it("counts licence cells separately from general competence", () => {
    const model = trainingModel();
    const licence = aggregateTrainingLicence(model, now);
    expect(licence.total).toBeGreaterThan(0);
    expect(licence.ok).toBe(0);

    const licenceComps = model.competencies.filter(
      (c) => c.evidence === "Licence / card"
    );
    const withLicences = trainingModel({
      records: licenceComps.map((c) => rec("a", c.id)),
    });
    const after = aggregateTrainingLicence(withLicences, now);
    expect(after.ok).toBe(after.total);
  });

  it("omits induction emit when no starters past the window", () => {
    const recentStarter = trainingModel({
      people: [
        {
          id: "b",
          organizationId: "o",
          name: "Ben",
          roles: [],
          site: "S",
          manager: "",
          start: "2026-11-20",
          email: "ben@x.test",
          status: "Active",
          end: "",
          extra: [],
          exempt: [],
          external: false,
          company: "",
          userId: null,
          hist: [],
          createdAt: "",
          updatedAt: "",
        },
      ],
    });
    expect(aggregateTrainingInduction(recentStarter, now)).toEqual({
      ok: 0,
      total: 0,
    });
    expect(
      aggregateTrainingEvidence(recentStarter, now).some(
        (e) => e.type === "training.induction"
      )
    ).toBe(false);
  });

  it("aggregates inventory schedule by category / check", () => {
    const rows: ScheduleRow[] = [
      scheduleRow({
        category: "Lifting equipment",
        checkName: "Thorough examination",
        state: "ok",
      }),
      scheduleRow({
        assetId: "a2",
        tag: "T-2",
        category: "Lifting equipment",
        checkName: "Thorough examination",
        state: "over",
      }),
      scheduleRow({
        assetId: "a3",
        tag: "T-3",
        category: "Production machinery",
        checkName: "Planned maintenance",
        state: "soon",
      }),
      scheduleRow({
        assetId: "a4",
        tag: "T-4",
        category: "Measuring & test equipment",
        checkName: "Calibration",
        state: "ok",
      }),
    ];

    expect(
      aggregateInventorySchedule(rows, { category: "Lifting equipment" })
    ).toEqual({ ok: 1, total: 2 });
    expect(
      aggregateInventorySchedule(rows, {
        category: "Measuring & test equipment",
        checkName: "Calibration",
      })
    ).toEqual({ ok: 1, total: 1 });

    const emits = aggregateInventoryEvidence(rows, now);
    expect(emits.map((e) => e.type).sort()).toEqual([
      "asset.calibration",
      "asset.loler",
      "asset.puwer",
    ]);
    const loler = emits.find((e) => e.type === "asset.loler")!;
    expect(loler.status).toBe("partial");
    expect(loler.payload).toEqual({ ok: 1, total: 2 });
    expect(loler.source).toBe("module:inventory");
  });

  it("aggregates critical ASL approvals only", () => {
    const suppliers = [
      { crit: "Critical", status: "Approved" },
      { crit: "Critical", status: "Pending" },
      { crit: "Non-critical", status: "Approved" },
    ] as AslSupplier[];

    expect(aggregateAslCriticalApproved(suppliers)).toEqual({
      ok: 1,
      total: 2,
    });
    const [emit] = aggregateAslEvidence(suppliers, now);
    expect(emit?.type).toBe("supplier.approved");
    expect(emit?.status).toBe("partial");
    expect(emit?.payload).toEqual({ ok: 1, total: 2 });
  });

  it("emits management review aggregate from completed counts", () => {
    expect(
      aggregateManagementReviewEvidence({ completed: 0, total: 0 })
    ).toEqual([]);
    const [partial] = aggregateManagementReviewEvidence(
      { completed: 1, total: 3 },
      now
    );
    expect(partial?.type).toBe("gov.management.review");
    expect(partial?.status).toBe("partial");
    expect(partial?.payload).toEqual({ ok: 1, total: 3 });

    const [valid] = aggregateManagementReviewEvidence(
      { completed: 2, total: 2 },
      now
    );
    expect(valid?.status).toBe("valid");
  });
});

describe("collector emit score sensitivity", () => {
  it("improves Relyable score when aggregate ratios improve", () => {
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

    const weak = [
      ...aggregateTrainingEvidence(trainingModel({ records: [] }), now),
      ...aggregateInventoryEvidence(
        [
          scheduleRow({
            category: "Lifting equipment",
            checkName: "Thorough examination",
            state: "over",
          }),
        ],
        now
      ),
      ...aggregateAslEvidence(
        [
          { crit: "Critical", status: "Pending" },
          { crit: "Critical", status: "Pending" },
        ] as AslSupplier[],
        now
      ),
    ];

    const strongModel = trainingModel({
      records: trainingModel().competencies.map((c) => rec("a", c.id)),
    });
    const strong = [
      ...aggregateTrainingEvidence(strongModel, now),
      ...aggregateInventoryEvidence(
        [
          scheduleRow({
            category: "Lifting equipment",
            checkName: "Thorough examination",
            state: "ok",
          }),
        ],
        now
      ),
      ...aggregateAslEvidence(
        [
          { crit: "Critical", status: "Approved" },
          { crit: "Critical", status: "Approved" },
        ] as AslSupplier[],
        now
      ),
      ...aggregateManagementReviewEvidence({ completed: 1, total: 1 }, now),
    ];

    const weakScore = compute({ scope, items: weak, now, facts: {} }).score;
    const strongScore = compute({ scope, items: strong, now, facts: {} }).score;
    expect(strongScore).toBeGreaterThan(weakScore);
    expect(weak.some((e) => e.type === "training.competence")).toBe(true);
    expect(strong.some((e) => e.source === "module:training")).toBe(true);
    expect(strong.some((e) => e.type === "gov.management.review")).toBe(true);
    expect(strong.every((e) => !String(e.source).includes("bootstrap"))).toBe(
      true
    );
  });
});
