/**
 * Cross-module ports for Supplier Management.
 * Spec: docs/module-specifications/suppliers.md §5
 */

export type SupplierNotificationPort = {
  notifyBuyerAssigned(input: {
    organizationId: string;
    supplierId: string;
    name: string;
    reference: string;
    buyerId: string;
  }): Promise<void>;
  notifyCompliantSupplier(input: {
    organizationId: string;
    supplierId: string;
    name: string;
    reference: string;
  }): Promise<void>;
};

export class NoOpSupplierNotificationAdapter
  implements SupplierNotificationPort
{
  async notifyBuyerAssigned(): Promise<void> {
    return;
  }
  async notifyCompliantSupplier(): Promise<void> {
    return;
  }
}

export type SupplierTaskPort = {
  removeTasksSourcedFromSupplier(input: {
    organizationId: string;
    supplierId: string;
  }): Promise<void>;
};

export class NoOpSupplierTaskAdapter implements SupplierTaskPort {
  async removeTasksSourcedFromSupplier(): Promise<void> {
    return;
  }
}

/**
 * Calendar review events — Calendar module not yet in V5.
 * Spec requires create/update on reviewDate; adapter is a narrow stub.
 */
export type SupplierCalendarPort = {
  upsertReviewEvent(input: {
    organizationId: string;
    supplierId: string;
    name: string;
    reference: string;
    reviewDate: Date | null;
    businessUnitId?: string;
  }): Promise<void>;
  removeReviewEvent(input: {
    organizationId: string;
    supplierId: string;
  }): Promise<void>;
};

export class NoOpSupplierCalendarAdapter implements SupplierCalendarPort {
  async upsertReviewEvent(): Promise<void> {
    return;
  }
  async removeReviewEvent(): Promise<void> {
    return;
  }
}

/**
 * Supplier-linked incident aggregates for dashboard stats.
 * Wired to Incident module via public service in route composition.
 */
export type SupplierIncidentStatsPort = {
  countLinkedIncidents(input: {
    organizationId: string;
    identity: import("../../security").SecurityIdentity;
  }): Promise<{
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
  }>;
};

export class NoOpSupplierIncidentStatsAdapter
  implements SupplierIncidentStatsPort
{
  async countLinkedIncidents(): Promise<{
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
  }> {
    return { totalIncidents: 0, openIncidents: 0, resolvedIncidents: 0 };
  }
}

/**
 * Role-based list visibility — IAM roles not yet on SecurityIdentity.
 * Development returns org-wide access.
 */
export type SupplierListScope =
  | { mode: "all" }
  | {
      mode: "businessUnits";
      businessUnitIds: string[];
    };

export type SupplierListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<SupplierListScope>;
};

export class DevAllSuppliersListScopeAdapter
  implements SupplierListScopePort
{
  async resolveScope(): Promise<SupplierListScope> {
    return { mode: "all" };
  }
}
