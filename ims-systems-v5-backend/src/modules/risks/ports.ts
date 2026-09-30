/**
 * Cross-module ports for Risk Management.
 * Stub adapters keep the module independently testable until real modules exist.
 */

export type RiskNotificationPort = {
  notifyOwnerAssigned(input: {
    organizationId: string;
    riskId: string;
    ownerId: string;
    title: string;
    reference: string;
  }): Promise<void>;
  notifyEscalated(input: {
    organizationId: string;
    riskId: string;
    title: string;
    reference: string;
    escalatedBy: string;
  }): Promise<void>;
  notifyMitigated(input: {
    organizationId: string;
    riskId: string;
    title: string;
    reference: string;
    mitigatedBy: string;
  }): Promise<void>;
  notifyNudge(input: {
    organizationId: string;
    riskId: string;
    ownerId: string;
    title: string;
    reference: string;
  }): Promise<void>;
};

/** Development adapter — notification delivery deferred. */
export class NoOpRiskNotificationAdapter implements RiskNotificationPort {
  async notifyOwnerAssigned(): Promise<void> {
    return;
  }
  async notifyEscalated(): Promise<void> {
    return;
  }
  async notifyMitigated(): Promise<void> {
    return;
  }
  async notifyNudge(): Promise<void> {
    return;
  }
}

/**
 * Tasks sourced from a risk are removed when the risk is deleted.
 * Wired to Task Management soft-delete-by-source in /api/v1 composition.
 */
export type RiskTaskPort = {
  removeTasksSourcedFromRisk(input: {
    organizationId: string;
    riskId: string;
  }): Promise<void>;
};

export class NoOpRiskTaskAdapter implements RiskTaskPort {
  async removeTasksSourcedFromRisk(): Promise<void> {
    return;
  }
}

/**
 * Role-based list visibility (Super Admin / Auditor → all;
 * HoS / Basic → BU + unassigned; External → BU only).
 * IAM roles are not on SecurityIdentity yet — development returns org-wide access.
 */
export type RiskListScope =
  | { mode: "all" }
  | { mode: "businessUnits"; businessUnitIds: string[]; includeUnassigned: boolean };

export type RiskListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<RiskListScope>;
};

export class DevAllRisksListScopeAdapter implements RiskListScopePort {
  async resolveScope(): Promise<RiskListScope> {
    return { mode: "all" };
  }
}
