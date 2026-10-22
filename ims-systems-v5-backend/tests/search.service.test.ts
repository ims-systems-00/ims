import { describe, expect, it } from "vitest";
import { createGlobalSearchService } from "../src/modules/search/services/search.service";
import type { SecurityIdentity } from "../src/security";

const identity = { subjectId: "u1", organizationId: "org1" } as SecurityIdentity;

const counter = (docs: Record<string, unknown>[]) => ({
  find: () => ({
    limit: () => ({ lean: async () => docs }),
  }),
});

describe("Global search (F-07)", () => {
  it("returns matches only for resources the caller can read", async () => {
    const service = createGlobalSearchService({
      authorizer: {
        allow: async (input: { resourceType: string }) =>
          input.resourceType !== "incidents",
      } as never,
      counters: {
        risks: counter([{ _id: "r1", title: "Fire risk", reference: "RSK-1", businessUnitId: "bu1" }]),
        incidents: counter([{ _id: "i1", title: "Fire incident", reference: "INC-1" }]),
        audits: counter([]),
        suppliers: counter([]),
        documents: counter([{ _id: "d1", name: "Fire policy", reference: "DOC-1" }]),
        users: counter([]),
      },
      listMemberUserIds: async () => [],
    });
    const result = await service.search(identity, "fire");
    const types = result.items.map((i) => i.type);
    expect(types).toContain("Risk");
    expect(types).toContain("Document");
    expect(types).not.toContain("Incident");
  });

  it("short queries return nothing", async () => {
    const service = createGlobalSearchService({
      authorizer: { allow: async () => true } as never,
      counters: {},
      listMemberUserIds: async () => [],
    });
    expect(await service.search(identity, "a")).toEqual({ query: "a", items: [] });
  });
});
