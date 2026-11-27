import { describe, expect, it } from "vitest";
import {
  auditsSnapshotFromDocs,
  incidentsSnapshotFromDocs,
  reviewsSnapshotFromDocs,
} from "../src/modules/live-compliance/adapters/collectors";

describe("live compliance collectors", () => {
  it("maps legacy incidents without investigation tracking to handled", () => {
    const snap = incidentsSnapshotFromDocs([
      { _id: "1", reference: "INC-1", title: "Open legacy", raisedOn: new Date("2026-11-01"), resolved: { status: false } },
      { _id: "2", reference: "INC-2", title: "Resolved legacy", raisedOn: new Date("2026-11-02"), resolved: { status: true } },
    ]);
    expect(snap.detailTracked).toBe(false);
    expect(snap.items.map((i) => i.investigation)).toEqual(["in_progress", "done"]);
    expect(snap.items[0]!.occurredOn).toBe("2026-11-01");
  });

  it("reads investigation status, type and area once tracked", () => {
    const snap = incidentsSnapshotFromDocs([
      {
        _id: "1",
        reference: "INC-221",
        title: "Reached past light curtain",
        raisedOn: new Date("2026-11-21"),
        occurredOn: new Date("2026-11-20"),
        incidentType: "Near miss",
        area: " Press Line 2 ",
        investigation: { status: "not_started" },
      },
    ]);
    expect(snap.detailTracked).toBe(true);
    expect(snap.items[0]).toMatchObject({
      occurredOn: "2026-11-20",
      type: "Near miss",
      area: "Press Line 2",
      investigation: "not_started",
    });
  });

  it("derives last held, interval and next scheduled management review", () => {
    const snap = reviewsSnapshotFromDocs(
      [
        { _id: "a", date: new Date("2025-06-01"), interval: "Half yearly", completed: { status: true } },
        { _id: "b", date: new Date("2025-12-10"), interval: "Yearly", completed: { status: true } },
        { _id: "c", date: new Date("2026-12-05"), interval: "Yearly", completed: { status: false } },
      ],
      "2026-11-25"
    );
    expect(snap).toMatchObject({
      lastHeld: "2025-12-10",
      intervalMonths: 12,
      scheduled: { id: "c", date: "2026-12-05" },
      inputsTracked: true,
    });
    expect(snap.inputs).toHaveLength(9);
    expect(snap.inputs.every((i) => !i.ready)).toBe(true);
  });

  it("collects audited vs planned clauses for internal audits per standard", () => {
    const snap = auditsSnapshotFromDocs(
      [
        {
          _id: "a1",
          reference: "AUD-1",
          type: "Internal",
          startDate: new Date("2026-03-01"),
          completed: { status: true, on: new Date("2026-03-02") },
          complianceLinks: [
            { toolkitId: "ISO 9001", clauseIds: ["7.2", "9.3"] },
            { toolkitId: "ISO 27001", clauseIds: ["A.5"] },
          ],
        },
        {
          _id: "a2",
          reference: "AUD-2",
          type: "Internal",
          startDate: new Date("2027-01-15"),
          complianceLinks: [{ toolkitId: "ISO 9001", clauseIds: ["8.1"] }],
        },
        {
          _id: "a3",
          reference: "EXT-1",
          type: "External",
          startDate: new Date("2026-10-01"),
          completed: { status: true, on: new Date("2026-10-01") },
        },
      ],
      "2026-11-25"
    );
    expect(snap.auditCount).toBe(2);
    expect(snap.lastCompletedOn).toBe("2026-03-02");
    expect(snap.audited).toEqual({ "ISO 9001": ["7.2", "9.3"] });
    expect(snap.planned).toEqual({ "ISO 9001": ["8.1"] });
    expect(snap.findingsTracked).toBe(false);
  });
});
