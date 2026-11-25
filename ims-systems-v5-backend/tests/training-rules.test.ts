import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPETENCIES,
  DEFAULT_ROLES,
  DEFAULT_SETTINGS,
  acknowledgePolicyAnswers,
  cell,
  findCompetency,
  gaps,
  isCompetent,
  latestRecord,
  matrixCsv,
  plan,
  readiness,
  remindersDue,
  requirements,
  validateRecord,
  type Requirement,
} from "../src/modules/training/lib/training-rules";
import type {
  TrainingModel,
  TrainingPerson,
  TrainingRecord,
  TrainingSession,
} from "../src/modules/training/types";

const now = new Date("2026-11-19");

function model(): TrainingModel {
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
      {
        id: "b",
        organizationId: "o",
        name: "Ben",
        roles: [],
        site: "S",
        manager: "",
        start: "2026-11-15",
        email: "ben@x.test",
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
  };
}

function rec(
  personId: string,
  cid: string,
  date: string,
  ref = "r"
): TrainingRecord {
  return {
    id: `${personId}-${cid}-${date}`,
    organizationId: "o",
    personId,
    cid,
    date,
    result: "Pass",
    provider: "",
    ref,
    fileId: null,
    verifiedBy: "",
    note: "",
    toVerify: false,
    t: `${date}T10:00`,
    createdAt: "",
    updatedAt: "",
  };
}

function reqOf(m: TrainingModel, cid: string): Requirement {
  const comp = findCompetency(m, cid)!;
  return { cid, level: "mandatory", exempt: null, comp };
}

function plannedSession(
  overrides: Partial<TrainingSession> & Pick<TrainingSession, "cid" | "date" | "attendees">
): TrainingSession {
  return {
    id: "ses1",
    organizationId: "o",
    time: "09:00",
    duration: 90,
    location: "",
    trainer: "",
    provider: "Internal",
    cost: 0,
    note: "",
    materials: [],
    outputs: [],
    invites: [],
    rsvp: {},
    status: "Planned",
    cancelReason: "",
    completedBy: null,
    completedAt: null,
    createdBy: "tester",
    createdOn: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("training-rules", () => {
  it("requirements = all-staff + role + extras", () => {
    const m = model();
    const ids = requirements(m, m.people[0]).map((r) => r.cid);
    expect(ids).toContain("induction");
    expect(ids).toContain("slinger");
    expect(ids).toContain("crane-op");
    m.people[0].extra = ["first-aid"];
    expect(
      requirements(m, m.people[0]).some(
        (r) => r.cid === "first-aid" && r.level === "mandatory"
      )
    ).toBe(true);
  });

  it("cell states: none, ok, soon, over, never-expiring, induction grace", () => {
    const m = model();
    expect(cell(m, m.people[0], reqOf(m, "fire"), now).st).toBe("none");
    expect(cell(m, m.people[1], reqOf(m, "fire"), now).st).toBe("grace");

    m.records.push(rec("a", "fire", "2026-06-01"));
    expect(cell(m, m.people[0], reqOf(m, "fire"), now).st).toBe("ok");

    m.records.push(rec("a", "ig", "2025-12-15"));
    expect(cell(m, m.people[0], reqOf(m, "ig"), now).st).toBe("soon");

    m.records.push(rec("a", "gdpr", "2025-01-01"));
    expect(cell(m, m.people[0], reqOf(m, "gdpr"), now).st).toBe("over");

    m.records.push(rec("a", "induction", "2020-01-01"));
    expect(cell(m, m.people[0], reqOf(m, "induction"), now).st).toBe("ok");
  });

  it("a Fail does not count; latest pass wins", () => {
    const m = model();
    m.records.push({ ...rec("a", "fire", "2026-10-01"), result: "Fail" });
    expect(latestRecord(m, "a", "fire")).toBeNull();
    m.records.push(rec("a", "fire", "2025-01-01"), rec("a", "fire", "2026-03-01"));
    expect(latestRecord(m, "a", "fire")?.date).toBe("2026-03-01");
  });

  it("validateRecord checks competency, date and certificate evidence", () => {
    const m = model();
    expect(() =>
      validateRecord(m, { personId: "a", cid: "nope" }, now)
    ).toThrow(/Unknown competency/);
    expect(() =>
      validateRecord(
        m,
        { personId: "a", cid: "fire", date: "2027-01-01" },
        now
      )
    ).toThrow(/future/);
    expect(() =>
      validateRecord(m, { personId: "a", cid: "hs-awareness" }, now)
    ).toThrow(/certificate/i);
    const ok = validateRecord(
      m,
      {
        personId: "a",
        cid: "hs-awareness",
        ref: "C1",
        provider: "IOSH",
      },
      now
    );
    expect(ok.comp.key).toBe("hs-awareness");
    expect(ok.date).toBe("2026-11-19");
  });

  it("acknowledgePolicyAnswers requires a full, correct quiz", () => {
    const m = model();
    const pol = findCompetency(m, "pol-hs")!;
    pol.quiz = [{ q: "q", opts: ["a", "b"], a: 1 }];
    expect(() => acknowledgePolicyAnswers(pol, [])).toThrow(/Answer all/);
    expect(() => acknowledgePolicyAnswers(pol, [0])).toThrow(/incorrect/);
    expect(() =>
      acknowledgePolicyAnswers(findCompetency(m, "fire")!, [])
    ).toThrow(/Not an acknowledgement/);
    expect(() => acknowledgePolicyAnswers(pol, [1])).not.toThrow();
  });

  it("isCompetent answers the asset module", () => {
    const m = model();
    expect(isCompetent(m, "a", "Lifting equipment", now).ok).toBe(false);
    m.records.push(rec("a", "slinger", "2023-01-01"));
    expect(isCompetent(m, "a", "Lifting equipment", now).ok).toBe(true);
    m.records.length = 0;
    m.records.push(rec("a", "slinger", "2020-01-01"));
    expect(isCompetent(m, "a", "Lifting equipment", now).ok).toBe(false);
    expect(isCompetent(m, "zz", "Lifting equipment", now).ok).toBe(false);
    expect(isCompetent(m, "a", "Furniture", now).ok).toBe(true);
  });

  it("gaps are ordered none > over > soon; leavers excluded", () => {
    const m = model();
    m.records.push(rec("a", "fire", "2025-01-01"), rec("a", "ig", "2025-12-15"));
    const g = gaps(m, now);
    expect(g[0].st).toBe("none");
    expect(g.some((x) => x.st === "over")).toBe(true);
    expect(g.some((x) => x.st === "soon")).toBe(true);
    (m.people[0] as TrainingPerson).status = "Leaver";
    expect(gaps(m, now).some((x) => x.person.id === "a")).toBe(false);
  });

  it("plan groups by course and marks booked people", () => {
    const m = model();
    const pl = plan(m, 3, now);
    const fire = pl.find((n) => n.comp.id === "fire");
    expect(fire?.people.length).toBe(2);
    expect(fire?.unbooked.length).toBe(2);

    m.sessions.push(
      plannedSession({ cid: "fire", date: "2026-12-01", attendees: ["a"] })
    );
    expect(
      plan(m, 3, now).find((n) => n.comp.id === "fire")?.unbooked.length
    ).toBe(1);
  });

  it("matrix CSV has a column per competency", () => {
    const m = model();
    const csv = matrixCsv(m, now);
    expect(csv.split("\n")[0].split('","').length).toBe(
      3 + m.competencies.length
    );
  });

  it("readiness has 10 structured checks", () => {
    const m = model();
    const rd = readiness(m, now);
    expect(rd).toHaveLength(10);
    expect(rd.map((r) => r.id)).toEqual([
      "roles",
      "records",
      "expiry",
      "evidence",
      "induction",
      "policies",
      "equipment",
      "leavers",
      "plan",
      "trail",
    ]);
    expect(rd.every((r) => typeof r.ok === "boolean" && r.text && r.basis && r.tag)).toBe(
      true
    );
    expect(rd.find((r) => r.id === "records")?.ok).toBe(false);
    m.people = [];
    expect(readiness(m, now).every((r) => r.ok)).toBe(true);
  });

  it("remindersDue returns items with a kind", () => {
    const m = model();
    m.records.push(rec("a", "ig", "2025-12-15"));
    m.sessions.push(
      plannedSession({
        cid: "fire",
        date: "2026-12-03",
        attendees: ["a", "b"],
      })
    );
    const due = remindersDue(m, now);
    expect(Array.isArray(due)).toBe(true);
    expect(due.every((x) => typeof x.kind === "string")).toBe(true);
  });
});
