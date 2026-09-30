/**
 * Cross-module ports for Stats live aggregation.
 * Spec: docs/module-specifications/stats.md §5
 */

import type { SecurityIdentity } from "../../security";
import type { AuditStats } from "../audits";
import type { InventoryStats } from "../assets";
import type { IncidentStats } from "../incidents";
import type { ManagementReviewStats } from "../management-reviews";
import type { OfiStats } from "../ofi";
import type { Risk, RiskStats } from "../risks";
import type { SupplierStats } from "../suppliers";
import type { InvoiceMonthStat } from "./types";

export type StatsUnitRef = {
  id: string;
  name: string;
  accessType: string;
};

export type StatsRisksPort = {
  stats(identity: SecurityIdentity): Promise<RiskStats>;
  /** Bounded sample for trends / critical area (max pageSize 100 per call). */
  listSample(
    identity: SecurityIdentity,
    input: {
      pageSize: number;
      raisedFrom?: Date;
      raisedTo?: Date;
    }
  ): Promise<Risk[]>;
};

export type StatsIncidentsPort = {
  stats(identity: SecurityIdentity): Promise<IncidentStats>;
  listSample(
    identity: SecurityIdentity,
    input: { pageSize: number; businessUnitIds?: string[] }
  ): Promise<
    Array<{
      id: string;
      businessUnitId?: string;
      resolved: { status: boolean };
      raisedOn: Date;
      priority: string;
      resolvedOn: Date | null;
    }>
  >;
};

export type StatsAuditsPort = {
  stats(identity: SecurityIdentity): Promise<AuditStats>;
  listSample(
    identity: SecurityIdentity,
    input: { pageSize: number }
  ): Promise<
    Array<{
      id: string;
      businessUnitId: string;
      completed: { status: boolean };
      identifications: Array<{ id: string }>;
    }>
  >;
};

export type StatsOfiPort = {
  stats(identity: SecurityIdentity): Promise<OfiStats>;
  listSample(
    identity: SecurityIdentity,
    input: { pageSize: number }
  ): Promise<
    Array<{
      id: string;
      businessUnitId: string;
      implemented: { status: string };
    }>
  >;
};

export type StatsSuppliersPort = {
  stats(identity: SecurityIdentity): Promise<SupplierStats>;
};

export type StatsInventoryPort = {
  stats(identity: SecurityIdentity): Promise<InventoryStats>;
};

export type StatsManagementReviewsPort = {
  stats(identity: SecurityIdentity): Promise<ManagementReviewStats>;
};

export type StatsFunctionalUnitsPort = {
  listBusinessUnits(identity: SecurityIdentity): Promise<StatsUnitRef[]>;
  listComplianceBodies(identity: SecurityIdentity): Promise<StatsUnitRef[]>;
  resolveNames(
    identity: SecurityIdentity,
    ids: string[]
  ): Promise<Map<string, string>>;
};

export type StatsUsersPort = {
  countActiveStaff(identity: SecurityIdentity): Promise<number>;
  countRemoteStaff(identity: SecurityIdentity): Promise<number>;
  /** Membership salary sum for inventory people costs (bounded). */
  sumStaffSalaries(identity: SecurityIdentity): Promise<number>;
};

export type StatsCustomersPort = {
  listSample(
    identity: SecurityIdentity,
    input: { pageSize: number }
  ): Promise<
    Array<{
      id: string;
      name: string;
      stage: string;
      contractValue: number;
    }>
  >;
};

export type StatsInvoicesPort = {
  monthlySentLast12Months(
    identity: SecurityIdentity
  ): Promise<InvoiceMonthStat[]>;
};

export type StatsCompliancePort = {
  /** Returns null when Compliance module is unavailable. */
  frameworkPercentages(
    identity: SecurityIdentity
  ): Promise<Array<{ name: string; totalPercentage: number }> | null>;
};

export type StatsOrganisationPort = {
  /** P1–P4 target hours; nulls when Organisation module unavailable. */
  incidentResolutionTargets(
    identity: SecurityIdentity
  ): Promise<Record<"P1" | "P2" | "P3" | "P4", number | null>>;
};

export type StatsModulePorts = {
  risks: StatsRisksPort;
  incidents: StatsIncidentsPort;
  audits: StatsAuditsPort;
  ofi: StatsOfiPort;
  suppliers: StatsSuppliersPort;
  inventory: StatsInventoryPort;
  managementReviews: StatsManagementReviewsPort;
  functionalUnits: StatsFunctionalUnitsPort;
  users: StatsUsersPort;
  customers: StatsCustomersPort;
  invoices: StatsInvoicesPort;
  compliance: StatsCompliancePort;
  organisation: StatsOrganisationPort;
};

export class UnavailableComplianceAdapter implements StatsCompliancePort {
  async frameworkPercentages(): Promise<null> {
    return null;
  }
}

export class UnavailableInvoicesAdapter implements StatsInvoicesPort {
  async monthlySentLast12Months(): Promise<InvoiceMonthStat[]> {
    return [];
  }
}

export class DevNoOrgTargetsAdapter implements StatsOrganisationPort {
  async incidentResolutionTargets(): Promise<
    Record<"P1" | "P2" | "P3" | "P4", number | null>
  > {
    return { P1: null, P2: null, P3: null, P4: null };
  }
}

/** Development stubs — zeros / empty stats for unit tests without HTTP wiring. */
export class DevZeroStatsPorts implements StatsModulePorts {
  risks: StatsRisksPort = {
    async stats() {
      return {
        total: 0,
        open: 0,
        escalated: 0,
        mitigated: 0,
        accepted: 0,
        byScoreBand: { low: 0, medium: 0, high: 0 },
      };
    },
    async listSample() {
      return [];
    },
  };
  incidents: StatsIncidentsPort = {
    async stats() {
      return {
        total: 0,
        open: 0,
        escalated: 0,
        resolved: 0,
        byPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
      };
    },
    async listSample() {
      return [];
    },
  };
  audits: StatsAuditsPort = {
    async stats() {
      return {
        total: 0,
        scheduled: 0,
        completed: 0,
        upcoming: 0,
        byType: { Internal: 0, External: 0 },
      };
    },
    async listSample() {
      return [];
    },
  };
  ofi: StatsOfiPort = {
    async stats() {
      return { total: 0, pending: 0, inProgress: 0, implemented: 0 };
    },
    async listSample() {
      return [];
    },
  };
  suppliers: StatsSuppliersPort = {
    async stats() {
      return {
        procurementValue: 0,
        supplierIncidents: {
          totalIncidents: 0,
          openIncidents: 0,
          resolvedIncidents: 0,
        },
        supplierCompliance: {
          compliant: 0,
          inCompliant: 0,
          percentage: 0,
          riskLevel: "Safe",
        },
      };
    },
  };
  inventory: StatsInventoryPort = {
    async stats() {
      return { categories: [], totalCount: 0, totalCost: 0 };
    },
  };
  managementReviews: StatsManagementReviewsPort = {
    async stats() {
      return { total: 0, scheduled: 0, completed: 0, upcoming: 0 };
    },
  };
  functionalUnits: StatsFunctionalUnitsPort = {
    async listBusinessUnits() {
      return [];
    },
    async listComplianceBodies() {
      return [];
    },
    async resolveNames() {
      return new Map();
    },
  };
  users: StatsUsersPort = {
    async countActiveStaff() {
      return 0;
    },
    async countRemoteStaff() {
      return 0;
    },
    async sumStaffSalaries() {
      return 0;
    },
  };
  customers: StatsCustomersPort = {
    async listSample() {
      return [];
    },
  };
  invoices = new UnavailableInvoicesAdapter();
  compliance = new UnavailableComplianceAdapter();
  organisation = new DevNoOrgTargetsAdapter();
}
