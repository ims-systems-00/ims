import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createCustomerInteractionStatsAdapter } from "../src/modules/customers";
import { getActivityModel } from "../src/modules/activities/repositories/activity.model";
import { getCustomerModel } from "../src/modules/customers/repositories/customer.model";

const ORG = "org-interactions";
const MANAGER = "manager-1";
const DAY = 24 * 60 * 60 * 1000;

async function seedCustomer(name: string) {
  const doc = await getCustomerModel().create({
    organizationId: ORG,
    reference: `CUS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name,
    primaryEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    createdBy: MANAGER,
    createdOn: new Date(),
  });
  return String(doc._id);
}

async function seedActivity(
  customerId: string,
  createdBy: string,
  daysAgo: number,
  organizationId = ORG
) {
  await getActivityModel().create({
    organizationId,
    moduleType: "customers",
    moduleId: customerId,
    value: "Called customer",
    isAutomated: false,
    createdBy,
    createdOn: new Date(Date.now() - daysAgo * DAY),
  });
}

describe("CustomerInteractionStatsAdapter (N-16)", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getActivityModel().deleteMany({});
    await getCustomerModel().deleteMany({});
  });

  it("aggregates weekly/monthly interactions for the manager only", async () => {
    const acme = await seedCustomer("Acme Ltd");
    const beta = await seedCustomer("Beta Ltd");

    await seedActivity(acme, MANAGER, 1);
    await seedActivity(acme, MANAGER, 2);
    await seedActivity(beta, MANAGER, 3);
    // Monthly-only, other manager, other org — all excluded from weekly/manager view.
    await seedActivity(acme, MANAGER, 20);
    await seedActivity(acme, "manager-2", 1);
    await seedActivity(acme, MANAGER, 1, "org-other");

    const adapter = createCustomerInteractionStatsAdapter();
    const result = await adapter.getManagerInteractionAnalytics({
      organizationId: ORG,
      managerId: MANAGER,
      identity: { subjectId: MANAGER, organizationId: ORG } as never,
    });

    expect(result.weekly.totalInteractions).toBe(3);
    expect(result.weekly.customersEngaged).toBe(2);
    expect(result.weekly.topCustomers[0]).toEqual({
      customerId: acme,
      name: "Acme Ltd",
      count: 2,
    });

    expect(result.monthly.totalInteractions).toBe(4);
    expect(result.monthly.customersEngaged).toBe(2);
  });

  it("returns zeros when there are no interactions", async () => {
    const adapter = createCustomerInteractionStatsAdapter();
    const result = await adapter.getManagerInteractionAnalytics({
      organizationId: ORG,
      managerId: MANAGER,
      identity: { subjectId: MANAGER, organizationId: ORG } as never,
    });
    expect(result.weekly).toEqual({
      totalInteractions: 0,
      customersEngaged: 0,
      topCustomers: [],
    });
    expect(result.monthly.totalInteractions).toBe(0);
  });
});
