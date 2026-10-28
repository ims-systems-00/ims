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
        tasks: counter([{ _id: "t1", name: "Fire drill task", reference: "TSK-1" }]),
        users: counter([]),
      },
      listMemberUserIds: async () => [],
    });
    const result = await service.search(identity, "fire");
    const types = result.items.map((i) => i.type);
    expect(types).toContain("Risk");
    expect(types).toContain("Document");
    expect(types).toContain("Task");
    expect(types).not.toContain("Incident");
    expect(result.items.find((i) => i.type === "Risk")?.route).toBe(
      "/risks?risk=r1",
    );
    expect(result.items.find((i) => i.type === "Document")?.route).toBe(
      "/documents",
    );
    expect(result.items.find((i) => i.type === "Task")?.route).toBe(
      "/tasks?task=t1",
    );
  });

  it("deep-links audits by type and documents by repository node", async () => {
    const service = createGlobalSearchService({
      authorizer: { allow: async () => true } as never,
      counters: {
        risks: counter([]),
        incidents: counter([]),
        audits: counter([
          {
            _id: "a1",
            title: "ISO audit",
            reference: "AUD-1",
            type: "External",
          },
        ]),
        suppliers: counter([
          { _id: "s1", name: "Acme Supplies", reference: "SUP-1" },
        ]),
        documents: counter([
          {
            _id: "d1",
            name: "Policy",
            reference: "DOC-1",
            repositoryId: "repo1",
          },
        ]),
        users: counter([]),
      },
      listMemberUserIds: async () => [],
    });
    const result = await service.search(identity, "ISO");
    expect(result.items.find((i) => i.type === "Audit")?.route).toBe(
      "/audits/external?audit=a1",
    );
    const all = await service.search(identity, "Acme");
    expect(all.items.find((i) => i.type === "Supplier")?.route).toBe(
      "/suppliers?supplier=s1",
    );
    const docs = await service.search(identity, "Policy");
    expect(docs.items.find((i) => i.type === "Document")?.route).toBe(
      "/documents/repositories/repo1/nodes/d1",
    );
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
