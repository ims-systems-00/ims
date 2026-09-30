/**
 * Cross-module ports for Incident Management.
 */

export type IncidentNotificationPort = {
  notifyOwnerAssigned(input: {
    organizationId: string;
    incidentId: string;
    ownerId: string;
    title: string;
    reference: string;
  }): Promise<void>;
  notifyEscalated(input: {
    organizationId: string;
    incidentId: string;
    title: string;
    reference: string;
    escalatedBy: string;
  }): Promise<void>;
  notifyResolved(input: {
    organizationId: string;
    incidentId: string;
    title: string;
    reference: string;
    resolvedBy: string;
  }): Promise<void>;
  notifyNudge(input: {
    organizationId: string;
    incidentId: string;
    ownerId: string;
    title: string;
    reference: string;
  }): Promise<void>;
};

export class NoOpIncidentNotificationAdapter
  implements IncidentNotificationPort
{
  async notifyOwnerAssigned(): Promise<void> {
    return;
  }
  async notifyEscalated(): Promise<void> {
    return;
  }
  async notifyResolved(): Promise<void> {
    return;
  }
  async notifyNudge(): Promise<void> {
    return;
  }
}

/**
 * P1 incidents create/update/remove calendar events.
 * Calendar module not implemented — development no-op.
 */
export type IncidentCalendarPort = {
  upsertPriorityEvent(input: {
    organizationId: string;
    incidentId: string;
    reference: string;
    title: string;
    businessUnitId?: string;
  }): Promise<void>;
  removePriorityEvent(input: {
    organizationId: string;
    incidentId: string;
  }): Promise<void>;
};

export class NoOpIncidentCalendarAdapter implements IncidentCalendarPort {
  async upsertPriorityEvent(): Promise<void> {
    return;
  }
  async removePriorityEvent(): Promise<void> {
    return;
  }
}

/**
 * Tasks sourced from an incident are removed when the incident is deleted.
 */
export type IncidentTaskPort = {
  removeTasksSourcedFromIncident(input: {
    organizationId: string;
    incidentId: string;
  }): Promise<void>;
};

export class NoOpIncidentTaskAdapter implements IncidentTaskPort {
  async removeTasksSourcedFromIncident(): Promise<void> {
    return;
  }
}

/**
 * Role-based list visibility (Super Admin / Auditor → all;
 * HoS / Basic → BU + unassigned; External → BU only).
 * IAM roles are not on SecurityIdentity yet — development returns org-wide access.
 */
export type IncidentListScope =
  | { mode: "all" }
  | {
      mode: "businessUnits";
      businessUnitIds: string[];
      includeUnassigned: boolean;
    };

export type IncidentListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<IncidentListScope>;
};

export class DevAllIncidentsListScopeAdapter
  implements IncidentListScopePort
{
  async resolveScope(): Promise<IncidentListScope> {
    return { mode: "all" };
  }
}
