import { describe, expect, it } from "vitest";
import { createCustomerInvoiceStatsAdapter } from "../src/modules/customers/adapters/invoice-stats.adapter";
import { createStatsInvoicesAdapter } from "../src/modules/stats/adapters/invoices.adapter";
import type { SecurityIdentity } from "../src/security";

const identity = { subjectId: "u1", organizationId: "org1" } as SecurityIdentity;

describe("invoice stats adapters (N-15 / N-17)", () => {
  it("customer overview totals buckets; manager analysis delegates", async () => {
    const adapter = createCustomerInvoiceStatsAdapter({
      repository: {
        statsByCustomer: async () => [
          { status: "Sent", amount: 240, count: 2 },
          { status: "Paid", amount: 120, count: 1 },
        ],
        statsByManagerThisMonth: async () => [{ status: "Draft", amount: 50, count: 1 }],
      } as never,
    });
    expect(
      await adapter.getCustomerInvoiceOverview({
        organizationId: "org1",
        customerId: "c1",
        identity,
      }),
    ).toEqual({
      totalInvoices: 3,
      byStatus: [
        { status: "Sent", amount: 240, count: 2 },
        { status: "Paid", amount: 120, count: 1 },
      ],
    });
    expect(
      await adapter.getManagerInvoiceAnalysisThisMonth({
        organizationId: "org1",
        managerId: "m1",
        identity,
      }),
    ).toEqual([{ status: "Draft", amount: 50, count: 1 }]);
  });

  it("stats monthly Sent aggregates carry labels; no org → empty", async () => {
    const adapter = createStatsInvoicesAdapter({
      repository: {
        monthlySentLast12Months: async () => [
          { year: 2026, month: 10, count: 3, amount: 900 },
        ],
      } as never,
    });
    expect(await adapter.monthlySentLast12Months(identity)).toEqual([
      { year: 2026, month: 10, label: "Oct 2026", count: 3, amount: 900 },
    ]);
    expect(
      await adapter.monthlySentLast12Months({ subjectId: "u1" } as SecurityIdentity),
    ).toEqual([]);
  });
});
