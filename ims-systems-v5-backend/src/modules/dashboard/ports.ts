/**
 * Cross-module ports for live Dashboard aggregation.
 * Spec: docs/module-specifications/dashboard.md §5
 */

import type { SecurityIdentity } from "../../security";
import type { AuditStats } from "../audits";
import type { InventoryStats } from "../assets";
import type { IncidentStats } from "../incidents";
import type { ManagementReviewStats } from "../management-reviews";
import type { OfiStats } from "../ofi";
import type { RiskStats } from "../risks";
import type { SupplierStats } from "../suppliers";
import type { FunctionalUnitSummary } from "./types";

export type DashboardRisksPort = {
  stats(identity: SecurityIdentity): Promise<RiskStats>;
};

export type DashboardIncidentsPort = {
  stats(identity: SecurityIdentity): Promise<IncidentStats>;
};

export type DashboardAuditsPort = {
  stats(identity: SecurityIdentity): Promise<AuditStats>;
};

export type DashboardOfiPort = {
  stats(identity: SecurityIdentity): Promise<OfiStats>;
};

export type DashboardSuppliersPort = {
  stats(identity: SecurityIdentity): Promise<SupplierStats>;
};

export type DashboardInventoryPort = {
  stats(identity: SecurityIdentity): Promise<InventoryStats>;
};

export type DashboardManagementReviewsPort = {
  stats(identity: SecurityIdentity): Promise<ManagementReviewStats>;
};

export type DashboardFunctionalUnitsPort = {
  countBusinessUnits(identity: SecurityIdentity): Promise<number>;
  countComplianceBodies(identity: SecurityIdentity): Promise<number>;
  getById(
    identity: SecurityIdentity,
    id: string
  ): Promise<FunctionalUnitSummary | null>;
};

export type DashboardUsersPort = {
  countActiveStaff(identity: SecurityIdentity): Promise<number>;
  countRemoteStaff(identity: SecurityIdentity): Promise<number>;
};

export type DashboardPremisesPort = {
  countPremises(identity: SecurityIdentity): Promise<number>;
};

export type DashboardTasksPort = {
  countOpenTasks(identity: SecurityIdentity): Promise<number>;
};

export type DashboardModulePorts = {
  risks: DashboardRisksPort;
  incidents: DashboardIncidentsPort;
  audits: DashboardAuditsPort;
  ofi: DashboardOfiPort;
  suppliers: DashboardSuppliersPort;
  inventory: DashboardInventoryPort;
  managementReviews: DashboardManagementReviewsPort;
  functionalUnits: DashboardFunctionalUnitsPort;
  users: DashboardUsersPort;
  premises: DashboardPremisesPort;
  tasks: DashboardTasksPort;
};

/** Development stubs — zeros / empty stats for unit tests without HTTP wiring. */
export class DevZeroDashboardPorts implements DashboardModulePorts {
  risks = {
    async stats(): Promise<RiskStats> {
      return {
        total: 0,
        open: 0,
        escalated: 0,
        mitigated: 0,
        accepted: 0,
        byScoreBand: { low: 0, medium: 0, high: 0 },
      };
    },
  };
  incidents = {
    async stats(): Promise<IncidentStats> {
      return {
        total: 0,
        open: 0,
        escalated: 0,
        resolved: 0,
        byPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
      };
    },
  };
  audits = {
    async stats(): Promise<AuditStats> {
      return {
        total: 0,
        scheduled: 0,
        completed: 0,
        upcoming: 0,
        byType: { Internal: 0, External: 0 },
      };
    },
  };
  ofi = {
    async stats(): Promise<OfiStats> {
      return { total: 0, pending: 0, inProgress: 0, implemented: 0 };
    },
  };
  suppliers = {
    async stats(): Promise<SupplierStats> {
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
  inventory = {
    async stats(): Promise<InventoryStats> {
      return { categories: [], totalCount: 0, totalCost: 0 };
    },
  };
  managementReviews = {
    async stats(): Promise<ManagementReviewStats> {
      return { total: 0, scheduled: 0, completed: 0, upcoming: 0 };
    },
  };
  functionalUnits = {
    async countBusinessUnits(): Promise<number> {
      return 0;
    },
    async countComplianceBodies(): Promise<number> {
      return 0;
    },
    async getById(): Promise<FunctionalUnitSummary | null> {
      return null;
    },
  };
  users = {
    async countActiveStaff(): Promise<number> {
      return 0;
    },
    async countRemoteStaff(): Promise<number> {
      return 0;
    },
  };
  premises = {
    async countPremises(): Promise<number> {
      return 0;
    },
  };
  tasks = {
    async countOpenTasks(): Promise<number> {
      return 0;
    },
  };
}
