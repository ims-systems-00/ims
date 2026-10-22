import { describe, expect, it } from "vitest";
import {
  createListScopePorts,
  resolveCanonicalListScope,
  scopeAllowsUnit,
  type ListScopeSources,
} from "../src/security/list-scope/create-list-scope.adapter";

const sources = (role: string | null, units: string[] = []): ListScopeSources => ({
  async findRole() {
    return role;
  },
  async listUnitIds() {
    return units;
  },
});

const input = { organizationId: "org1", subjectId: "user1" };

describe("resolveCanonicalListScope (L-01…L-10)", () => {
  it("Super Admin and Auditor see everything", async () => {
    expect(await resolveCanonicalListScope(sources("Super Admin"), input)).toEqual({ mode: "all" });
    expect(await resolveCanonicalListScope(sources("Auditor"), input)).toEqual({ mode: "all" });
  });

  it("Head of Service / Basic are scoped to their units + unassigned", async () => {
    expect(await resolveCanonicalListScope(sources("Head of Service", ["u1", "u2"]), input)).toEqual({
      mode: "scoped",
      unitIds: ["u1", "u2"],
      includeUnassigned: true,
    });
    expect(await resolveCanonicalListScope(sources("Basic", ["u1"]), input)).toEqual({
      mode: "scoped",
      unitIds: ["u1"],
      includeUnassigned: true,
    });
  });

  it("no membership is scoped to units only, without unassigned", async () => {
    expect(await resolveCanonicalListScope(sources(null, ["u9"]), input)).toEqual({
      mode: "scoped",
      unitIds: ["u9"],
      includeUnassigned: false,
    });
  });

  it("fails closed on lookup errors (never widens to all)", async () => {
    const broken: ListScopeSources = {
      async findRole() {
        throw new Error("mongo down");
      },
      async listUnitIds() {
        return ["u1"];
      },
    };
    expect(await resolveCanonicalListScope(broken, input)).toEqual({
      mode: "scoped",
      unitIds: [],
      includeUnassigned: false,
    });
  });
});

describe("createListScopePorts shape mapping", () => {
  it("maps canonical scope to module shapes", async () => {
    const ports = createListScopePorts(sources("Basic", ["u1"]));
    expect(await ports.businessUnitsWithUnassigned().resolveScope(input)).toEqual({
      mode: "businessUnits",
      businessUnitIds: ["u1"],
      includeUnassigned: true,
    });
    expect(await ports.businessUnitsStrict().resolveScope(input)).toEqual({
      mode: "businessUnits",
      businessUnitIds: ["u1"],
    });
    expect(await ports.withOrganisational().resolveScope(input)).toEqual({
      mode: "businessUnits",
      businessUnitIds: ["u1"],
      includeOrganisational: true,
    });
    expect(await ports.groups().resolveScope(input)).toEqual({
      mode: "groups",
      groupIds: ["u1"],
      includeNullGroup: true,
    });
  });

  it("mode all passes through for every shape", async () => {
    const ports = createListScopePorts(sources("Super Admin"));
    expect(await ports.groups().resolveScope(input)).toEqual({ mode: "all" });
  });
});

describe("scopeAllowsUnit (getById guard)", () => {
  it("allows all-mode, member units and flagged unassigned", () => {
    expect(scopeAllowsUnit({ mode: "all" }, "anything")).toBe(true);
    expect(
      scopeAllowsUnit({ mode: "businessUnits", businessUnitIds: ["u1"], includeUnassigned: false }, "u1"),
    ).toBe(true);
    expect(
      scopeAllowsUnit({ mode: "businessUnits", businessUnitIds: ["u1"], includeUnassigned: false }, "u2"),
    ).toBe(false);
    expect(
      scopeAllowsUnit({ mode: "businessUnits", businessUnitIds: [], includeUnassigned: true }, null),
    ).toBe(true);
    expect(
      scopeAllowsUnit({ mode: "groups", groupIds: ["g1"], includeNullGroup: false }, null),
    ).toBe(false);
  });
});
