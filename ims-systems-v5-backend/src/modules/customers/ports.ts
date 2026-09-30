/**
 * Cross-module ports for Customer Management (CRM).
 * Spec: docs/module-specifications/customers.md §5
 */

import type { SecurityIdentity } from "../../security";
import type {
  CustomerIncidentOverviewBucket,
  CustomerInvoiceStatusBucket,
  InteractionAnalytics,
} from "./types";

export type CustomerNotificationPort = {
  notifyStageChanged(input: {
    organizationId: string;
    customerId: string;
    name: string;
    reference: string;
    previousStage: string;
    stage: string;
    accountManagerId?: string;
    createdBy: string;
  }): Promise<void>;
  notifyStatusChanged(input: {
    organizationId: string;
    customerId: string;
    name: string;
    reference: string;
    previousStatus: string;
    status: string;
    accountManagerId?: string;
    createdBy: string;
  }): Promise<void>;
  notifyAccountManagerAssigned(input: {
    organizationId: string;
    customerId: string;
    name: string;
    reference: string;
    accountManagerId: string;
  }): Promise<void>;
};

export class NoOpCustomerNotificationAdapter
  implements CustomerNotificationPort
{
  async notifyStageChanged(): Promise<void> {
    return;
  }
  async notifyStatusChanged(): Promise<void> {
    return;
  }
  async notifyAccountManagerAssigned(): Promise<void> {
    return;
  }
}

export type CustomerTaskPort = {
  removeTasksSourcedFromCustomer(input: {
    organizationId: string;
    customerId: string;
  }): Promise<void>;
};

export class NoOpCustomerTaskAdapter implements CustomerTaskPort {
  async removeTasksSourcedFromCustomer(): Promise<void> {
    return;
  }
}

/**
 * Invoice aggregates for Live customer overview / MY CRM.
 * Invoice submodule is out of CRM scope — narrow stub until Invoice lands.
 */
export type CustomerInvoiceStatsPort = {
  getCustomerInvoiceOverview(input: {
    organizationId: string;
    customerId: string;
    identity: SecurityIdentity;
  }): Promise<{
    totalInvoices: number;
    byStatus: CustomerInvoiceStatusBucket[];
  }>;
  getManagerInvoiceAnalysisThisMonth(input: {
    organizationId: string;
    managerId: string;
    identity: SecurityIdentity;
  }): Promise<CustomerInvoiceStatusBucket[]>;
};

export class NoOpCustomerInvoiceStatsAdapter
  implements CustomerInvoiceStatsPort
{
  async getCustomerInvoiceOverview(): Promise<{
    totalInvoices: number;
    byStatus: CustomerInvoiceStatusBucket[];
  }> {
    return { totalInvoices: 0, byStatus: [] };
  }
  async getManagerInvoiceAnalysisThisMonth(): Promise<
    CustomerInvoiceStatusBucket[]
  > {
    return [];
  }
}

/**
 * Incident aggregates for Live customer overview.
 * Wired to Incident module via public service in route composition.
 */
export type CustomerIncidentStatsPort = {
  countLinkedIncidents(input: {
    organizationId: string;
    customerId: string;
    identity: SecurityIdentity;
  }): Promise<CustomerIncidentOverviewBucket[]>;
};

export class NoOpCustomerIncidentStatsAdapter
  implements CustomerIncidentStatsPort
{
  async countLinkedIncidents(): Promise<CustomerIncidentOverviewBucket[]> {
    return [];
  }
}

/**
 * Email campaign metrics for MY CRM.
 * Email Campaign submodule is out of scope — narrow stub.
 */
export type CustomerCampaignStatsPort = {
  getManagerCampaignStats(input: {
    organizationId: string;
    managerId: string;
    identity: SecurityIdentity;
  }): Promise<{
    activeCampaign: number;
    closedCampaign: number;
    monthlyCampaign: Array<{ month: string; count: number }>;
    latestCampaign: string;
  }>;
};

export class NoOpCustomerCampaignStatsAdapter
  implements CustomerCampaignStatsPort
{
  async getManagerCampaignStats(): Promise<{
    activeCampaign: number;
    closedCampaign: number;
    monthlyCampaign: Array<{ month: string; count: number }>;
    latestCampaign: string;
  }> {
    return {
      activeCampaign: 0,
      closedCampaign: 0,
      monthlyCampaign: [],
      latestCampaign: "No recent campaign",
    };
  }
}

/**
 * Timeline / Activity interaction analytics for MY CRM.
 * Activity module not yet in V5 — narrow stub.
 */
export type CustomerInteractionStatsPort = {
  getManagerInteractionAnalytics(input: {
    organizationId: string;
    managerId: string;
    identity: SecurityIdentity;
  }): Promise<{
    weekly: InteractionAnalytics;
    monthly: InteractionAnalytics;
  }>;
};

const emptyInteractions: InteractionAnalytics = {
  totalInteractions: 0,
  customersEngaged: 0,
  topCustomers: [],
};

export class NoOpCustomerInteractionStatsAdapter
  implements CustomerInteractionStatsPort
{
  async getManagerInteractionAnalytics(): Promise<{
    weekly: InteractionAnalytics;
    monthly: InteractionAnalytics;
  }> {
    return { weekly: emptyInteractions, monthly: emptyInteractions };
  }
}

/**
 * Role-based list visibility — IAM roles not yet on SecurityIdentity.
 * Development returns org-wide access.
 */
export type CustomerListScope =
  | { mode: "all" }
  | {
      mode: "businessUnits";
      businessUnitIds: string[];
      /** When true, also include customers with no business unit. */
      includeUnassigned?: boolean;
    };

export type CustomerListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<CustomerListScope>;
};

export class DevAllCustomersListScopeAdapter
  implements CustomerListScopePort
{
  async resolveScope(): Promise<CustomerListScope> {
    return { mode: "all" };
  }
}
