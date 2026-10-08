import { describe, expect, it } from "vitest";
import {
  formatNotificationTime,
  resolveNotificationLink,
} from "@/modules/notifications/lib/resolve-notification-link";
import type { Notification } from "@/modules/notifications/types";

function base(
  overrides: Partial<Notification> = {}
): Pick<
  Notification,
  "screenIdentifier" | "referenceType" | "referenceModuleId" | "params"
> {
  return {
    screenIdentifier: undefined,
    referenceType: "notifications",
    referenceModuleId: undefined,
    params: {},
    ...overrides,
  };
}

describe("resolveNotificationLink", () => {
  it("maps task notifications to the tasks sheet query", () => {
    expect(
      resolveNotificationLink(
        base({
          referenceType: "tasks",
          referenceModuleId: "abc123",
          screenIdentifier: "task-manager-detail",
          params: { id: "abc123" },
        })
      )
    ).toBe("/tasks?task=abc123");
  });

  it("maps risk / incident / ofi identifiers", () => {
    expect(
      resolveNotificationLink(
        base({
          referenceType: "risks",
          params: { id: "r1" },
        })
      )
    ).toBe("/risks?risk=r1");
    expect(
      resolveNotificationLink(
        base({
          referenceType: "incidents",
          params: { id: "i1" },
        })
      )
    ).toBe("/incidents?incident=i1");
    expect(
      resolveNotificationLink(
        base({
          referenceType: "ofi",
          params: { id: "o1" },
        })
      )
    ).toBe("/ofi?ofi=o1");
  });

  it("maps kpi with business unit", () => {
    expect(
      resolveNotificationLink(
        base({
          referenceType: "kpi-objectives",
          screenIdentifier: "kpi-objectives",
          params: { id: "k1", businessUnitId: "bu1" },
        })
      )
    ).toBe("/kpi-objectives?kpi=k1&unit=bu1");
  });

  it("returns null for org broadcasts without a target", () => {
    expect(
      resolveNotificationLink(
        base({
          referenceType: "notifications",
          screenIdentifier: undefined,
        })
      )
    ).toBeNull();
  });
});

describe("formatNotificationTime", () => {
  it("formats recent times relative to now", () => {
    const recent = new Date(Date.now() - 2 * 60_000).toISOString();
    expect(formatNotificationTime(recent)).toBe("2m ago");
  });
});
