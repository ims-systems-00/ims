/**
 * Dashboard init adapter for Functional Units create hook.
 * Spec: dashboard.md — group dashboard created when a business unit is created.
 *
 * V5 Phase 1 uses live aggregation only — no persisted group dashboard collection.
 * This adapter acknowledges the lifecycle hook without creating Mongo documents.
 */

import type { DashboardInitPort } from "../../functional-units";

export function createLiveDashboardInitAdapter(): DashboardInitPort {
  return {
    async initialiseBusinessFunctionDashboard(_input): Promise<void> {
      // Intentionally empty until Organisation systemDate + snapshot refresh ship.
      return;
    },
  };
}
