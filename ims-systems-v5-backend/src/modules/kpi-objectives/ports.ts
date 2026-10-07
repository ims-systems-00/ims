/**
 * Cross-module ports for KPI Objectives.
 * Spec: docs/module-specifications/kpi-objective.md §5
 */

export type KpiObjectiveNotificationPort = {
  /**
   * Notify Heads of Service for the business unit when a BU-scoped KPI is created.
   * In-app only (no email). No-op when recipients cannot be resolved.
   */
  notifyBusinessUnitKpiCreated(input: {
    organizationId: string;
    createdBy: string;
    kpiId: string;
    reference: string;
    value: string;
    businessUnitId: string;
  }): Promise<void>;
};

export class NoOpKpiObjectiveNotificationAdapter
  implements KpiObjectiveNotificationPort
{
  async notifyBusinessUnitKpiCreated(): Promise<void> {
    return;
  }
}

/**
 * Validate business-unit existence via Functional Units public surface.
 */
export type KpiObjectiveBusinessUnitPort = {
  exists(organizationId: string, businessUnitId: string): Promise<boolean>;
};

export class AlwaysAllowKpiBusinessUnitAdapter
  implements KpiObjectiveBusinessUnitPort
{
  async exists(): Promise<boolean> {
    return true;
  }
}

/**
 * Role-based list visibility (V4 basicRoleScopedFilter).
 * IAM roles not yet fully on SecurityIdentity — development returns org-wide.
 */
export type KpiObjectiveListScope =
  | { mode: "all" }
  | {
      mode: "businessUnits";
      businessUnitIds: string[];
      includeOrganisational: boolean;
    };

export type KpiObjectiveListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<KpiObjectiveListScope>;
};

export class DevAllKpiObjectivesListScopeAdapter
  implements KpiObjectiveListScopePort
{
  async resolveScope(): Promise<KpiObjectiveListScope> {
    return { mode: "all" };
  }
}
