import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createOwnershipIntegrityAdapter } from "../src/modules/users";
import { getRiskModel } from "../src/modules/risks/repositories/risk.model";
import { getTaskModel } from "../src/modules/tasks/repositories/task.model";

async function seedRisk(reference: string, ownerId: string) {
  await getRiskModel().create({
    organizationId: ORG,
    reference,
    title: "Owned risk",
    description: "seed",
    type: "Organisational",
    ownerId,
    initialScore: { likelihood: 1, consequence: 1, total: 1 },
    currentScore: { likelihood: 1, consequence: 1, total: 1 },
    raisedBy: ownerId,
    raisedOn: new Date(),
    createdBy: ownerId,
    createdOn: new Date(),
  });
}

async function seedTask(name: string, assigneeIds: string[]) {
  await getTaskModel().create({
    organizationId: ORG,
    reference: `TSK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name,
    dueDate: new Date(),
    assignees: assigneeIds.map((userId) => ({ userId })),
    createdBy: "user-b",
    createdOn: new Date(),
  });
}

const ORG = "org-ownership";

describe("OwnershipIntegrityAdapter (U-06)", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getRiskModel().deleteMany({});
    await getTaskModel().deleteMany({});
  });

  it("reports no owned data for a user with no records", async () => {
    const adapter = createOwnershipIntegrityAdapter();
    const result = await adapter.check({
      organizationId: ORG,
      userId: "user-none",
    });
    expect(result).toEqual({
      hasOwnedData: false,
      inProgress: false,
      modules: [],
    });
  });

  it("detects owned risks and task assignments, scoped to the organisation", async () => {
    await seedRisk("RSK-OWN-1", "user-a");
    await seedTask("Owned task", ["user-a"]);

    const adapter = createOwnershipIntegrityAdapter();
    const inOrg = await adapter.check({ organizationId: ORG, userId: "user-a" });
    expect(inOrg.hasOwnedData).toBe(true);
    expect(inOrg.modules).toEqual(expect.arrayContaining(["Risks", "Tasks"]));

    const otherOrg = await adapter.check({
      organizationId: "org-other",
      userId: "user-a",
    });
    expect(otherOrg.hasOwnedData).toBe(false);
  });

  it("transfers risk owners and task assignees to the destination user", async () => {
    await seedRisk("RSK-OWN-2", "user-a");
    await seedTask("Transfer task", ["user-a", "user-c"]);

    const adapter = createOwnershipIntegrityAdapter();
    await adapter.transfer({
      organizationId: ORG,
      sourceUserId: "user-a",
      destinationUserId: "user-b",
      initiatorUserId: "admin-1",
    });

    const after = await adapter.check({ organizationId: ORG, userId: "user-a" });
    expect(after.hasOwnedData).toBe(false);

    const dest = await adapter.check({ organizationId: ORG, userId: "user-b" });
    expect(dest.modules).toEqual(expect.arrayContaining(["Risks", "Tasks"]));

    const tasks = await getTaskModel().find({ organizationId: ORG }).lean();
    const assigneeIds = (tasks[0]?.assignees ?? []).map((a) => a.userId);
    expect(assigneeIds).toEqual(["user-b", "user-c"]);
  });
});
