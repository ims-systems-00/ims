import { describe, expect, it, vi } from "vitest";
import { createAiActivityAdapter } from "../src/modules/ai";
import type { ActivitiesApplicationPort } from "../src/modules/activities";

describe("createAiActivityAdapter", () => {
  it("records save and delete timeline entries with polished delete copy", async () => {
    const recordAutomated = vi.fn(async () => undefined);
    const activities = {
      recordAutomated,
    } as unknown as ActivitiesApplicationPort;

    const adapter = createAiActivityAdapter(activities);
    await adapter.recordAnalysisSaved({
      organizationId: "org-1",
      moduleType: "risks",
      moduleId: "risk-1",
      actorId: "user-1",
      actorName: "Alex",
    });

    const conductedOn = new Date(2026, 9, 23, 14, 5);
    await adapter.recordAnalysisDeleted({
      organizationId: "org-1",
      moduleType: "risks",
      moduleId: "risk-1",
      actorId: "user-2",
      actorName: "Blake",
      originalConductorName: "Alex",
      conductedOn,
    });

    expect(recordAutomated).toHaveBeenNthCalledWith(
      1,
      "org-1",
      expect.objectContaining({
        value: "Alex conducted and saved an analysis.",
        moduleType: "risks",
        moduleId: "risk-1",
      })
    );

    const deleteCall = recordAutomated.mock.calls[1];
    expect(deleteCall?.[0]).toBe("org-1");
    expect(deleteCall?.[1]).toEqual(
      expect.objectContaining({
        value: "Blake deleted an analysis.",
        extraLogs: [
          expect.objectContaining({
            description: "This analysis was conducted by Alex on 23/10/2026 14:05",
          }),
        ],
      })
    );
  });
});
