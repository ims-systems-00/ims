import { describe, expect, it } from "vitest";
import { createOrganisationTargetsAdapter } from "../src/modules/stats/adapters/organisation-targets.adapter";
import { normalizeIncidentResolutionTargets } from "../src/modules/organisation/repositories/organisation.repository";
import type { SecurityIdentity } from "../src/security";

const identity = { subjectId: "u1", organizationId: "org1" } as SecurityIdentity;

describe("createOrganisationTargetsAdapter (N-17)", () => {
  it("returns the organisation's configured targets", async () => {
    const adapter = createOrganisationTargetsAdapter({
      findTargets: async () => ({ P1: 4, P2: 24, P3: null, P4: null }),
    });
    expect(await adapter.incidentResolutionTargets(identity)).toEqual({
      P1: 4,
      P2: 24,
      P3: null,
      P4: null,
    });
  });

  it("returns nulls without an organisation context", async () => {
    const adapter = createOrganisationTargetsAdapter({
      findTargets: async () => ({ P1: 1, P2: 1, P3: 1, P4: 1 }),
    });
    expect(
      await adapter.incidentResolutionTargets({ subjectId: "u1" } as SecurityIdentity),
    ).toEqual({ P1: null, P2: null, P3: null, P4: null });
  });
});

describe("normalizeIncidentResolutionTargets", () => {
  it("keeps positive numbers, nulls everything else", () => {
    expect(
      normalizeIncidentResolutionTargets({ P1: 4, P2: -1, P3: "x", P4: 72 }),
    ).toEqual({ P1: 4, P2: null, P3: null, P4: 72 });
    expect(normalizeIncidentResolutionTargets(undefined)).toEqual({
      P1: null,
      P2: null,
      P3: null,
      P4: null,
    });
  });
});
