import { describe, expect, it, vi } from "vitest";
import { createComplianceGoLiveProvisionAdapter } from "../src/modules/compliance/adapters/go-live-provision.adapter";
import type { SecurityIdentity } from "../src/security";

const identity: SecurityIdentity = {
  subjectId: "user-1",
  organizationId: "org-1",
  email: "admin@acme.example",
};

describe("createComplianceGoLiveProvisionAdapter", () => {
  it("provisions each licensed toolkit with the actor identity", async () => {
    const provisionToolkit = vi.fn(async () => ({
      name: "ISO 9001" as const,
      controlCount: 42,
    }));
    const adapter = createComplianceGoLiveProvisionAdapter({
      compliance: { provisionToolkit },
    });

    await adapter.provisionComplianceToolkits({
      organizationId: "org-1",
      actorId: "user-1",
      identity,
      toolkitNames: ["ISO 9001", "DSPT"],
    });

    expect(provisionToolkit).toHaveBeenCalledTimes(2);
    expect(provisionToolkit).toHaveBeenCalledWith(identity, {
      name: "ISO 9001",
    });
    expect(provisionToolkit).toHaveBeenCalledWith(identity, {
      name: "DSPT",
    });
  });

  it("skips unknown toolkits and keeps going after a failure", async () => {
    const provisionToolkit = vi
      .fn()
      .mockRejectedValueOnce(new Error("already provisioned"))
      .mockResolvedValueOnce({ name: "DSPT" as const, controlCount: 10 });
    const adapter = createComplianceGoLiveProvisionAdapter({
      compliance: { provisionToolkit },
    });

    await expect(
      adapter.provisionComplianceToolkits({
        organizationId: "org-1",
        actorId: "user-1",
        identity,
        toolkitNames: ["ISO 9001", "Not A Toolkit", "DSPT"],
      })
    ).resolves.toBeUndefined();

    expect(provisionToolkit).toHaveBeenCalledTimes(2);
  });

  it("never creates checkout sessions or notifications", async () => {
    const adapter = createComplianceGoLiveProvisionAdapter({
      compliance: {
        provisionToolkit: vi.fn(async () => ({
          name: "ISO 9001" as const,
          controlCount: 1,
        })),
      },
    });
    await expect(
      adapter.createCardCheckoutSession({
        organizationId: "org-1",
        actorId: "user-1",
      })
    ).resolves.toBeNull();
    await expect(
      adapter.notifyGoLive({
        organizationId: "org-1",
        actorId: "user-1",
        paymentType: "Card",
        licences: {
          superUser: 1,
          users: 0,
          groups: 0,
          complianceTools: [],
        },
      })
    ).resolves.toBeUndefined();
  });
});
