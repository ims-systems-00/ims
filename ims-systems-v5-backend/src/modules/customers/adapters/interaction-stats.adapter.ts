/**
 * Real CustomerInteractionStatsPort (N-16) — CRM interaction
 * analytics from the Activities timeline: customer-module activities
 * authored by the account manager, aggregated over the last 7 days
 * (weekly) and 30 days (monthly).
 */

import { getActivityModel } from "../../activities/repositories/activity.model";
import { createCustomerRepository } from "../repositories/customer.repository";
import type {
  CustomerInteractionStatsPort,
} from "../ports";
import type { InteractionAnalytics } from "../types";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createCustomerInteractionStatsAdapter(): CustomerInteractionStatsPort {
  const activities = getActivityModel();
  const customers = createCustomerRepository();

  async function analyticsFor(
    organizationId: string,
    managerId: string,
    since: Date
  ): Promise<InteractionAnalytics> {
    const grouped = await activities.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          organizationId,
          moduleType: "customers",
          createdBy: managerId,
          createdOn: { $gte: since },
        },
      },
      { $group: { _id: "$moduleId", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const totalInteractions = grouped.reduce(
      (sum, row) => sum + row.count,
      0
    );

    const topCustomers: InteractionAnalytics["topCustomers"] = [];
    for (const row of grouped.slice(0, 5)) {
      let name = row._id;
      if (OBJECT_ID_PATTERN.test(row._id)) {
        const customer = await customers.findById(organizationId, row._id);
        if (customer?.name) name = customer.name;
      }
      topCustomers.push({ customerId: row._id, name, count: row.count });
    }

    return {
      totalInteractions,
      customersEngaged: grouped.length,
      topCustomers,
    };
  }

  return {
    async getManagerInteractionAnalytics({ organizationId, managerId }) {
      const now = Date.now();
      const [weekly, monthly] = await Promise.all([
        analyticsFor(organizationId, managerId, new Date(now - 7 * DAY_MS)),
        analyticsFor(organizationId, managerId, new Date(now - 30 * DAY_MS)),
      ]);
      return { weekly, monthly };
    },
  };
}
