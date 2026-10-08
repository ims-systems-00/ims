import { describe, expect, it } from "vitest";
import {
  formatNotificationTime,
  resolveNotificationLink,
} from "./resolve-notification-link";

describe("resolveNotificationLink", () => {
  it("maps task notifications to the tasks route", () => {
    expect(
      resolveNotificationLink({
        screenIdentifier: "task-detail",
        referenceType: "tasks",
        referenceModuleId: "task-1",
        params: {},
      })
    ).toBe("/tasks?task=task-1");
  });

  it("prefers params.id over referenceModuleId", () => {
    expect(
      resolveNotificationLink({
        screenIdentifier: "risk-management-detail",
        referenceType: "risks",
        referenceModuleId: "risk-a",
        params: { id: "risk-b" },
      })
    ).toBe("/risks?risk=risk-b");
  });

  it("builds kpi links with optional business unit", () => {
    expect(
      resolveNotificationLink({
        screenIdentifier: "kpi-objectives",
        referenceType: "kpi-objectives",
        referenceModuleId: "kpi-1",
        params: { id: "kpi-1", businessUnitId: "bu-9" },
      })
    ).toBe("/kpi-objectives?kpi=kpi-1&unit=bu-9");
  });

  it("returns null for unknown identifiers", () => {
    expect(
      resolveNotificationLink({
        screenIdentifier: "unknown-screen",
        referenceType: "notifications",
        referenceModuleId: "x",
        params: {},
      })
    ).toBeNull();
  });
});

describe("formatNotificationTime", () => {
  it("returns empty string for invalid dates", () => {
    expect(formatNotificationTime("not-a-date")).toBe("");
  });

  it("returns a relative label for recent timestamps", () => {
    const recent = new Date(Date.now() - 2 * 60_000).toISOString();
    expect(formatNotificationTime(recent)).toBe("2m ago");
  });
});
