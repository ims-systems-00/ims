import { describe, expect, it, vi } from "vitest";
import { createComplianceAutomationRunner } from "../src/modules/compliance/services/automation-runner.service";
import { createComplianceAutomationAdapter } from "../src/modules/compliance/adapters/automation.adapter";
import type { ComplianceToolkitName } from "../src/modules/compliance/types";

describe("Compliance automation runner (N-11)", () => {
  it("scans modules, persists the run and notifies modules with records", async () => {
    const record = vi.fn().mockResolvedValue({ id: "run1" });
    const notify = vi.fn().mockResolvedValue(undefined);
    const runner = createComplianceAutomationRunner({
      runs: { record, listByOrganization: async () => [] },
      notify,
      counters: [
        { module: "risks", count: async () => 3 },
        { module: "incidents", count: async () => 0 },
        {
          module: "audits",
          count: async () => {
            throw new Error("boom");
          },
        },
      ],
    });
    const result = await runner.runScan({
      organizationId: "org1",
      toolkitName: "ISO 9001" as ComplianceToolkitName,
      actorId: "user1",
    });
    expect(result.modulesWithRecords).toEqual(["risks"]);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org1", modulesWithRecords: ["risks"] }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ modulesWithRecords: ["risks"] }),
    );
  });

  it("adapter enqueues when a queue exists and never throws", async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const adapter = createComplianceAutomationAdapter({
      runner: { runScan: vi.fn() } as never,
      queue: { enqueue } as never,
    });
    await adapter.onToolkitProvisioned({
      organizationId: "org1",
      toolkitName: "ISO 9001" as ComplianceToolkitName,
      actorId: "user1",
    });
    expect(enqueue).toHaveBeenCalledOnce();

    const failing = createComplianceAutomationAdapter({
      runner: { runScan: vi.fn() } as never,
      queue: { enqueue: vi.fn().mockRejectedValue(new Error("redis down")) } as never,
    });
    await expect(
      failing.onToolkitProvisioned({
        organizationId: "org1",
        toolkitName: "ISO 9001" as ComplianceToolkitName,
        actorId: "user1",
      }),
    ).resolves.toBeUndefined();
  });
});
