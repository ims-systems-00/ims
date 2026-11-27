import { describe, expect, it, vi } from "vitest";
import type { ControlHealth, ControlHealthRow } from "../src/modules/compliance";
import { createLiveComplianceService } from "../src/modules/live-compliance/services/live-compliance.service";
import type {
  LiveClauseStorePort,
  SnapshotCollectorPort,
} from "../src/modules/live-compliance/ports";
import type { LiveComplianceRepository } from "../src/modules/live-compliance/repositories/live-compliance.repository";
import type { ReviewsSnapshot } from "../src/modules/live-compliance/types";
import type { SecurityIdentity } from "../src/security";

const ORG = "org1";
const identity = { subjectId: "u1", organizationId: ORG } as SecurityIdentity;

function memoryStore(): LiveClauseStorePort & { rows: ControlHealthRow[] } {
  const rows: ControlHealthRow[] = [
    { id: "c93", name: "ISO 9001", clause: "9.3", title: "Management review", state: "Not implemented", health: null, responsibleUserId: null, accountableUserId: null },
    { id: "c43", name: "ISO 9001", clause: "4.3", title: "Scope", state: "Implemented", health: null, responsibleUserId: null, accountableUserId: null },
  ];
  return {
    rows,
    provisionedToolkits: async () => ["ISO 9001", "ISO 27001"],
    listRows: async () => rows.map((r) => ({ ...r })),
    applyHealth: async (_org, updates: Array<{ id: string; health: ControlHealth }>) => {
      for (const u of updates) rows.find((r) => r.id === u.id)!.health = u.health;
    },
  };
}

function memoryRepo() {
  const activity: Array<{ source: string; text: string }> = [];
  const snoozed = new Map<string, Date>();
  const repo = {
    listAdviceStates: async () =>
      [...snoozed.entries()].map(([adviceId, until]) => ({
        adviceId,
        firstSeenAt: new Date(),
        snoozedUntil: until,
        resolvedAt: null,
      })),
    syncAdvice: async (_org: string, items: Array<{ id: string }>) => items.map((i) => i.id),
    snooze: async (_org: string, id: string, until: Date) => {
      snoozed.set(id, until);
      return true;
    },
    addActivity: async (_org: string, entries: Array<{ source: string; text: string }>) => {
      activity.push(...entries);
    },
    listActivity: async () => [],
  } as unknown as LiveComplianceRepository;
  return { repo, activity };
}

function reviewsCollector(state: { reviews: Partial<ReviewsSnapshot> }): SnapshotCollectorPort {
  return {
    collect: async () => ({
      reviews: {
        tracked: true,
        lastHeld: null,
        intervalMonths: 12,
        scheduled: null,
        inputsTracked: false,
        inputs: [],
        actions: [],
        ...state.reviews,
      },
    }),
  };
}

const allow = { allow: vi.fn(async () => true) };

describe("live compliance service", () => {
  it("records a transition activity when a clause status changes", async () => {
    let now = new Date("2026-11-25T10:00:00Z");
    const store = memoryStore();
    const { repo, activity } = memoryRepo();
    const state = { reviews: { lastHeld: "2025-12-10" } as Partial<ReviewsSnapshot> };
    const service = createLiveComplianceService({
      authorizer: allow,
      repository: repo,
      clauses: store,
      collectors: [reviewsCollector(state)],
      now: () => now,
      staleMs: 0,
    });

    const first = await service.recalc(ORG);
    expect(first.standards).toEqual(["ISO 9001"]);
    expect(first.transitions).toEqual([]); // first evaluation is not a transition
    expect(store.rows.find((r) => r.id === "c93")!.health?.status).toBe("risk");
    expect(store.rows.find((r) => r.id === "c43")!.health).toMatchObject({ status: "impl", ruleId: null });

    now = new Date("2026-12-11T10:00:00Z");
    const second = await service.recalc(ORG);
    expect(second.transitions).toEqual([
      expect.objectContaining({ clause: "9.3", from: "risk", to: "lapsed" }),
    ]);
    expect(activity.at(-1)!.text).toMatch(/^Clause 9\.3 Management review is now Lapsed \(ISO 9001\)/);

    state.reviews = { lastHeld: "2026-12-11" };
    const third = await service.recalc(ORG);
    expect(third.transitions[0]).toMatchObject({ from: "lapsed", to: "sus" });
    expect(activity.at(-1)!.text).toContain("back to Sustained");
  });

  it("does not rewrite health when nothing changed", async () => {
    const store = memoryStore();
    const apply = vi.spyOn(store, "applyHealth");
    const { repo } = memoryRepo();
    const service = createLiveComplianceService({
      authorizer: allow,
      repository: repo,
      clauses: store,
      collectors: [reviewsCollector({ reviews: { lastHeld: "2025-12-10" } })],
      now: () => new Date("2026-11-25T10:00:00Z"),
      staleMs: 0,
    });
    await service.recalc(ORG);
    await service.recalc(ORG);
    expect(apply.mock.calls[0]![1]).toHaveLength(2);
    expect(apply.mock.calls[1]![1]).toHaveLength(0);
  });

  it("serves health from cache until stale and deduplicates concurrent recalcs", async () => {
    let calls = 0;
    const collector: SnapshotCollectorPort = {
      collect: async () => {
        calls += 1;
        return {};
      },
    };
    let now = new Date("2026-11-25T10:00:00Z");
    const service = createLiveComplianceService({
      authorizer: allow,
      repository: memoryRepo().repo,
      clauses: memoryStore(),
      collectors: [collector],
      now: () => now,
      staleMs: 30_000,
    });
    await Promise.all([service.health(identity), service.health(identity)]);
    expect(calls).toBe(1);
    await service.health(identity);
    expect(calls).toBe(1);
    now = new Date("2026-11-25T10:01:00Z");
    await service.health(identity);
    expect(calls).toBe(2);
  });

  it("treats a failing collector as not tracked instead of failing", async () => {
    const warn = vi.fn();
    const service = createLiveComplianceService({
      authorizer: allow,
      repository: memoryRepo().repo,
      clauses: memoryStore(),
      collectors: [{ collect: async () => { throw new Error("db down"); } }],
      now: () => new Date("2026-11-25T10:00:00Z"),
      staleMs: 0,
      logger: { warn },
    });
    const res = await service.health(identity);
    expect(res.clauses.find((c) => c.clause === "9.3")).toMatchObject({
      status: "not",
      detail: "Management reviews not tracked yet",
    });
    expect(warn).toHaveBeenCalled();
  });

  it("runs a registered one-click command, logs it and recalculates", async () => {
    const handler = vi.fn(async () => ({ message: "R-07 reviewed", source: "Risks" }));
    const { repo, activity } = memoryRepo();
    const collector: SnapshotCollectorPort = {
      collect: async () => ({
        risks: {
          tracked: true,
          reviewTracked: true,
          items: [{ id: "r7", reference: "R-07", title: "Guarding", nextReviewDate: "2026-12-01", area: null, score: 8 }],
          reviewedPatternAreas: [],
        },
      }),
    };
    const service = createLiveComplianceService({
      authorizer: allow,
      repository: repo,
      clauses: memoryStore(),
      collectors: [collector],
      commands: { "risk.review": handler },
      now: () => new Date("2026-11-25T10:00:00Z"),
      staleMs: 60_000,
    });
    const { items } = await service.advice(identity, { limit: 10 });
    const item = items.find((a) => a.id === "rr-r7-2026-12-01")!;
    const result = await service.runAction(identity, item.id);
    expect(result.message).toBe("R-07 reviewed");
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ organizationId: ORG, ref: "r7" }));
    expect(activity.at(-1)).toMatchObject({ source: "Risks", text: "R-07 reviewed" });
  });

  it("hides snoozed advice and enforces permissions", async () => {
    const service = createLiveComplianceService({
      authorizer: allow,
      repository: memoryRepo().repo,
      clauses: memoryStore(),
      collectors: [reviewsCollector({ reviews: { lastHeld: "2025-12-10" } })],
      now: () => new Date("2026-11-25T10:00:00Z"),
      staleMs: 60_000,
    });
    const before = await service.advice(identity, { limit: 10 });
    expect(before.total).toBe(1);
    await service.snooze(identity, before.items[0]!.id, 7);
    expect((await service.advice(identity, { limit: 10 })).total).toBe(0);

    const denied = createLiveComplianceService({
      authorizer: { allow: async () => false },
      repository: memoryRepo().repo,
      clauses: memoryStore(),
      collectors: [],
    });
    await expect(denied.health(identity)).rejects.toThrow(/permission/);
    await expect(denied.health(null)).rejects.toThrow();
  });
});
