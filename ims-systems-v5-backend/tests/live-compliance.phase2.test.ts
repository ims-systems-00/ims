import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  createEventBus,
  createRecordChangeMiddleware,
  type RecordChangedEvent,
} from "../src/infrastructure/events/event-bus";
import { renderEmail } from "../src/infrastructure/email/templates";
import { createLiveStreamHub, type LiveStreamEvent } from "../src/modules/live-compliance/services/live-stream-hub";
import { createLiveComplianceNotifier } from "../src/modules/live-compliance/services/live-compliance-notifier";
import { createLiveComplianceRuntime } from "../src/modules/live-compliance/services/live-compliance-runtime";
import type {
  ClauseTransition,
  LiveComplianceService,
  RecalcResult,
} from "../src/modules/live-compliance/services/live-compliance.service";
import type { LiveComplianceRepository } from "../src/modules/live-compliance/repositories/live-compliance.repository";
import type {
  LiveComplianceContact,
  LiveComplianceEmailPort,
  LiveComplianceInAppNotification,
} from "../src/modules/live-compliance/ports";
import type { AdviceItem } from "../src/modules/live-compliance/types";

afterEach(() => {
  vi.useRealTimers();
});

function transition(overrides: Partial<ClauseTransition> = {}): ClauseTransition {
  return {
    standard: "ISO 9001",
    clause: "7.1.5",
    title: "Monitoring and measuring resources",
    module: "inventory",
    from: "sus",
    to: "lapsed",
    detail: "Torque wrench TW-02: calibration overdue",
    due: "2026-11-20",
    ownerUserIds: ["u-owner"],
    ...overrides,
  };
}

function advice(overrides: Partial<AdviceItem>): AdviceItem {
  return {
    id: "adv-1",
    module: "training",
    clause: "7.2",
    standards: ["ISO 9001"],
    severity: "med",
    due: "2026-12-01",
    title: "Sam Patel: CSCS expires 1 Dec 2026",
    why: "ISO 7.2 needs everyone competent for their role.",
    action: { type: "navigate", label: "Book refresher", href: "/training?createSession=1" },
    ...overrides,
  } as AdviceItem;
}

function result(overrides: Partial<RecalcResult> = {}): RecalcResult {
  return {
    organizationId: "org-1",
    source: "event",
    evaluatedAt: new Date("2026-11-26T09:00:00Z"),
    standards: ["ISO 9001"],
    transitions: [],
    newAdviceIds: [],
    firstRun: false,
    changed: true,
    advice: [],
    clauseOwners: {},
    ...overrides,
  };
}

const people: Record<string, LiveComplianceContact> = {
  "u-owner": { userId: "u-owner", name: "Olivia Owner", email: "olivia@example.com" },
  "u-admin": { userId: "u-admin", name: "Adam Admin", email: "adam@example.com" },
};

function notifierHarness() {
  const inApp: LiveComplianceInAppNotification[] = [];
  const alerts: Array<Parameters<LiveComplianceEmailPort["sendAlert"]>[0]> = [];
  const digests: Array<Parameters<LiveComplianceEmailPort["sendDigest"]>[0]> = [];
  const notifier = createLiveComplianceNotifier({
    appUrl: "https://app.example.com",
    notifications: {
      createForRecipients: async ({ items }) => {
        inApp.push(...items);
      },
    },
    recipients: {
      contacts: async (_org, ids) => ids.map((id) => people[id]).filter(Boolean) as LiveComplianceContact[],
      admins: async () => [people["u-admin"]!],
      organisationName: async () => "Northfield",
    },
    email: {
      sendAlert: async (input) => {
        alerts.push(input);
      },
      sendDigest: async (input) => {
        digests.push(input);
      },
    },
  });
  return { notifier, inApp, alerts, digests };
}

describe("event bus + record change middleware", () => {
  function appWith(bus: ReturnType<typeof createEventBus>, identity: { organizationId?: string } | null) {
    const app = express();
    app.use((req, _res, next) => {
      req.identity = identity
        ? ({ subjectId: "u1", organizationId: identity.organizationId } as never)
        : null;
      next();
    });
    app.use(createRecordChangeMiddleware({ bus, modules: ["risks", "training"] }));
    app.post("/risks/:id", (req, res) => {
      res.status(req.params.id === "fail" ? 400 : 200).json({ ok: true });
    });
    app.get("/risks", (_req, res) => {
      res.json({ ok: true });
    });
    app.post("/ofi", (_req, res) => {
      res.json({ ok: true });
    });
    return app;
  }

  it("emits record.changed for successful writes to watched modules only", async () => {
    const bus = createEventBus();
    const events: RecordChangedEvent[] = [];
    bus.on("record.changed", (e) => events.push(e));
    const app = appWith(bus, { organizationId: "org-1" });

    await request(app).post("/risks/123").expect(200);
    await request(app).get("/risks").expect(200);
    await request(app).post("/ofi").expect(200);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      organizationId: "org-1",
      module: "risks",
      method: "POST",
      path: "/risks/123",
      actorUserId: "u1",
    });
  });

  it("does not emit for failed writes or requests without an organisation", async () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on("record.changed", handler);
    await request(appWith(bus, { organizationId: "org-1" })).post("/risks/fail").expect(400);
    await request(appWith(bus, {})).post("/risks/1").expect(200);
    expect(handler).not.toHaveBeenCalled();
  });

  it("isolates failing handlers", () => {
    const onHandlerError = vi.fn();
    const bus = createEventBus({ onHandlerError });
    const good = vi.fn();
    bus.on("record.changed", () => {
      throw new Error("boom");
    });
    const off = bus.on("record.changed", good);
    const event = { organizationId: "o", module: "risks", method: "POST", path: "/risks", actorUserId: null, at: new Date() };
    bus.emit("record.changed", event);
    expect(good).toHaveBeenCalledTimes(1);
    expect(onHandlerError).toHaveBeenCalledTimes(1);
    off();
    bus.emit("record.changed", event);
    expect(good).toHaveBeenCalledTimes(1);
  });
});

describe("live stream hub", () => {
  it("fans out per organisation and filters targeted events by recipient", () => {
    const hub = createLiveStreamHub();
    const a: LiveStreamEvent[] = [];
    const b: LiveStreamEvent[] = [];
    const other: LiveStreamEvent[] = [];
    hub.subscribe("org-1", { userId: "a", send: (e) => a.push(e) });
    const offB = hub.subscribe("org-1", { userId: "b", send: (e) => b.push(e) });
    hub.subscribe("org-2", { userId: "c", send: (e) => other.push(e) });

    hub.publishRecalc(
      result({ transitions: [transition()], newAdviceIds: ["adv-1"] })
    );
    expect(a.map((e) => e.type)).toEqual([
      "clause.status.changed",
      "advice.updated",
      "activity.created",
      "health.updated",
    ]);
    expect(other).toEqual([]);

    hub.publish("org-1", { type: "notification.created", data: { count: 1 } }, ["b"]);
    expect(a.some((e) => e.type === "notification.created")).toBe(false);
    expect(b.at(-1)).toEqual({ type: "notification.created", data: { count: 1 } });

    offB();
    expect(hub.subscriberCount("org-1")).toBe(1);
  });

  it("stays quiet when a recalculation changed nothing", () => {
    const hub = createLiveStreamHub();
    const send = vi.fn();
    hub.subscribe("org-1", { userId: "a", send });
    hub.publishRecalc(result({ changed: false }));
    expect(send).not.toHaveBeenCalled();
  });
});

describe("live compliance notifier", () => {
  it("treats the first evaluation as a baseline", async () => {
    const { notifier, inApp, alerts } = notifierHarness();
    await notifier.handleRecalc(
      result({ firstRun: true, transitions: [transition()], newAdviceIds: ["adv-1"], advice: [advice({ severity: "high" })] })
    );
    expect(inApp).toEqual([]);
    expect(alerts).toEqual([]);
  });

  it("emails clause owners when a clause lapses and notifies in-app only for At risk", async () => {
    const { notifier, inApp, alerts } = notifierHarness();
    const outcome = await notifier.handleRecalc(
      result({
        transitions: [
          transition(),
          transition({ standard: "ISO 45001" }),
          transition({ clause: "7.2", title: "Competence", module: "training", to: "risk", ownerUserIds: [] }),
        ],
      })
    );

    // One per clause (standards grouped), not one per standard.
    expect(inApp).toHaveLength(2);
    expect(inApp[0]).toMatchObject({
      recipientUserId: "u-owner",
      title: "ISO 7.1.5 Monitoring and measuring resources is now Lapsed",
      module: "inventory",
      channels: ["in_app", "email"],
    });
    // No owner on 7.2 → admins, in-app only.
    expect(inApp[1]).toMatchObject({ recipientUserId: "u-admin", channels: ["in_app"] });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      to: "olivia@example.com",
      data: { standards: "ISO 9001, 45001", status: "Lapsed", due: "20 Nov 2026", url: "https://app.example.com/compliance/live" },
    });
    expect(outcome).toMatchObject({ inApp: 2, emails: 1 });
    expect(outcome.recipientUserIds.sort()).toEqual(["u-admin", "u-owner"]);
  });

  it("tells owners when a clause recovers, but not for other transitions", async () => {
    const { notifier, inApp } = notifierHarness();
    await notifier.handleRecalc(
      result({
        transitions: [
          transition({ from: "lapsed", to: "sus" }),
          transition({ clause: "9.3", from: "not", to: "prog" }),
        ],
      })
    );
    expect(inApp).toHaveLength(1);
    expect(inApp[0]!.title).toBe("ISO 7.1.5 Monitoring and measuring resources is back to Sustained");
  });

  it("routes new advice by severity and skips clauses already alerted", async () => {
    const { notifier, inApp, alerts } = notifierHarness();
    const items = [
      advice({ id: "high", severity: "high", clause: "10.2", title: "AUD-3 NC-1 overdue" }),
      advice({ id: "med", severity: "med" }),
      advice({ id: "low", severity: "low" }),
      advice({ id: "covered", severity: "high", clause: "7.1.5" }),
    ];
    await notifier.handleRecalc(
      result({
        transitions: [transition()],
        newAdviceIds: ["high", "med", "low", "covered"],
        advice: items,
        clauseOwners: { "10.2": ["u-owner"], "7.2": ["u-owner"] },
      })
    );
    const titles = inApp.map((i) => i.title);
    expect(titles).toEqual([
      "ISO 7.1.5 Monitoring and measuring resources is now Lapsed",
      "AUD-3 NC-1 overdue",
      "Sam Patel: CSCS expires 1 Dec 2026",
    ]);
    // Lapsed clause + high advice emailed; medium in-app only; low → digest.
    expect(alerts.map((a) => a.data.headline)).toEqual([
      "ISO 7.1.5 Monitoring and measuring resources is now Lapsed",
      "AUD-3 NC-1 overdue",
    ]);
    expect(alerts[1]!.data.url).toBe("https://app.example.com/training?createSession=1");
    expect(inApp[2]!.message.length).toBeLessThanOrEqual(150);
  });

  it("sends one digest per recipient with only their medium / low items", async () => {
    const { notifier, digests } = notifierHarness();
    const { emails } = await notifier.sendDigest({
      organizationId: "org-1",
      day: "2026-11-26",
      advice: [
        advice({ id: "a", clause: "7.2", severity: "med" }),
        advice({ id: "b", clause: "9.3", severity: "low", due: null, title: "Management review inputs" }),
        advice({ id: "c", clause: "7.2", severity: "high" }),
      ],
      clauseOwners: { "7.2": ["u-owner"] },
    });
    expect(emails).toBe(2);
    const byTo = Object.fromEntries(digests.map((d) => [d.to, d]));
    expect(byTo["olivia@example.com"]!.data.items.map((i) => i.severity)).toEqual(["Medium"]);
    expect(byTo["adam@example.com"]!.data.items[0]).toEqual({
      title: "Management review inputs",
      clause: "9.3",
      severity: "Low",
    });
    expect(byTo["adam@example.com"]!.dedupeKey).toBe("lc:org-1:digest:2026-11-26:u-admin");
  });

  it("renders the alert and digest emails", () => {
    const alert = renderEmail("compliance-alert", {
      orgName: "Northfield",
      recipientName: "Olivia",
      headline: "ISO 7.1.5 is now Lapsed",
      detail: "Torque wrench TW-02: calibration overdue",
      clause: "7.1.5 Monitoring and measuring resources",
      standards: "ISO 9001",
      status: "Lapsed",
      url: "https://app.example.com/compliance/live",
    });
    expect(alert.subject).toBe("Northfield: ISO 7.1.5 is now Lapsed");
    expect(alert.html).toContain("calibration overdue");
    const digest = renderEmail("compliance-digest", {
      orgName: "Northfield",
      recipientName: "Olivia",
      total: 12,
      items: [{ title: "Book refresher", clause: "7.2", severity: "Medium", due: "1 Dec 2026" }],
      url: "https://app.example.com/compliance/live",
    });
    expect(digest.subject).toBe("Northfield: 12 compliance actions to do");
    expect(digest.text).toContain("And 11 more in iMS.");
  });
});

describe("live compliance runtime", () => {
  function fakeService(overrides: Partial<LiveComplianceService> = {}) {
    const recalc = vi.fn(async (organizationId: string, source = "manual") =>
      result({ organizationId, source })
    );
    const openAdvice = vi.fn(async () => ({
      advice: [advice({ severity: "low" })],
      clauseOwners: {},
    }));
    return {
      service: {
        recalc,
        openAdviceForOrganization: openAdvice,
        ...overrides,
      } as unknown as LiveComplianceService,
      recalc,
      openAdvice,
    };
  }

  it("debounces bursts of record changes into one recalculation per organisation", async () => {
    vi.useFakeTimers();
    const bus = createEventBus();
    const { service, recalc } = fakeService();
    const runtime = createLiveComplianceRuntime({
      service,
      repository: {} as LiveComplianceRepository,
      bus,
      listOrganizationIds: async () => [],
      debounceMs: 2_000,
    });
    runtime.attach();
    const emit = (organizationId: string) =>
      bus.emit("record.changed", { organizationId, module: "risks", method: "PATCH", path: "/risks/1", actorUserId: null, at: new Date() });

    emit("org-1");
    await vi.advanceTimersByTimeAsync(1_500);
    emit("org-1");
    emit("org-2");
    expect(runtime.pendingCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(recalc.mock.calls).toEqual([
      ["org-1", "event"],
      ["org-2", "event"],
    ]);
    runtime.stop();
  });

  it("recalculates again when an in-flight run from another source was reused", async () => {
    const { service, recalc } = fakeService();
    recalc.mockImplementationOnce(async (organizationId: string) => result({ organizationId, source: "read" }));
    const bus = createEventBus();
    const runtime = createLiveComplianceRuntime({
      service,
      repository: {} as LiveComplianceRepository,
      bus,
      listOrganizationIds: async () => [],
    });
    runtime.attach();
    bus.emit("record.changed", { organizationId: "org-1", module: "risks", method: "POST", path: "/risks", actorUserId: null, at: new Date() });
    await runtime.flush();
    expect(recalc).toHaveBeenCalledTimes(2);
    runtime.stop();
  });

  it("sweeps every organisation and sends the digest once a day after the digest hour", async () => {
    const { service, recalc, openAdvice } = fakeService();
    const claimed = new Set<string>();
    const repository = {
      claimDigest: vi.fn(async (org: string, day: string) => {
        const key = `${org}|${day}`;
        if (claimed.has(key)) return false;
        claimed.add(key);
        return true;
      }),
    } as unknown as LiveComplianceRepository;
    const { notifier, digests } = notifierHarness();
    let clock = new Date(2026, 10, 26, 7, 0); // 07:00 local
    const runtime = createLiveComplianceRuntime({
      service,
      repository,
      notifier,
      listOrganizationIds: async () => ["org-1", "org-2"],
      digestHour: 8,
      now: () => clock,
    });

    expect(await runtime.sweep()).toEqual({ organisations: 2, failed: 0 });
    expect(recalc).toHaveBeenCalledWith("org-1", "schedule");
    expect(openAdvice).not.toHaveBeenCalled();

    clock = new Date(2026, 10, 26, 9, 0);
    await runtime.sweep();
    await runtime.sweep();
    expect(openAdvice).toHaveBeenCalledTimes(2); // once per org, not per sweep
    expect(digests).toHaveLength(2); // admins of each org

    clock = new Date(2026, 10, 27, 8, 30);
    await runtime.sweep();
    expect(digests).toHaveLength(4);
  });

  it("keeps sweeping when one organisation fails", async () => {
    const { service, recalc } = fakeService();
    recalc.mockRejectedValueOnce(new Error("db down"));
    const runtime = createLiveComplianceRuntime({
      service,
      repository: {} as LiveComplianceRepository,
      listOrganizationIds: async () => ["bad", "good"],
    });
    expect(await runtime.sweep()).toEqual({ organisations: 2, failed: 1 });
    expect(recalc).toHaveBeenLastCalledWith("good", "schedule");
  });
});
