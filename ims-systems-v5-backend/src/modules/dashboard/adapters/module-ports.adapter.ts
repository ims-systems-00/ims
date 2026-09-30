/**
 * Wire Dashboard ports to existing module public services.
 * Spec: docs/module-specifications/dashboard.md §5 / §10
 */

import type { AuditService } from "../../audits";
import type { AssetsService } from "../../assets";
import type { BusinessPremiseService } from "../../business-premise";
import type { FunctionalUnitService } from "../../functional-units";
import {
  isBusinessAccessType,
  isComplianceAccessType,
  type AccessType,
} from "../../functional-units";
import type { IncidentService } from "../../incidents";
import type { ManagementReviewService } from "../../management-reviews";
import type { OfiService } from "../../ofi";
import type { RiskService } from "../../risks";
import type { SupplierService } from "../../suppliers";
import type { TaskService } from "../../tasks";
import type { UsersService } from "../../users";
import type { DashboardModulePorts } from "../ports";

export type DashboardPortsFromModulesInput = {
  risks: RiskService;
  incidents: IncidentService;
  audits: AuditService;
  ofi: OfiService;
  suppliers: SupplierService;
  inventory: AssetsService;
  managementReviews: ManagementReviewService;
  functionalUnits: FunctionalUnitService;
  users: UsersService;
  businessPremises: BusinessPremiseService;
  tasks: TaskService;
};

export function createDashboardPortsFromModules(
  input: DashboardPortsFromModulesInput
): DashboardModulePorts {
  return {
    risks: {
      stats: (identity) => input.risks.stats(identity),
    },
    incidents: {
      stats: (identity) => input.incidents.stats(identity),
    },
    audits: {
      stats: (identity) => input.audits.stats(identity),
    },
    ofi: {
      stats: (identity) => input.ofi.stats(identity),
    },
    suppliers: {
      stats: (identity) => input.suppliers.stats(identity),
    },
    inventory: {
      stats: (identity) => input.inventory.getStats(identity),
    },
    managementReviews: {
      stats: (identity) => input.managementReviews.stats(identity),
    },
    functionalUnits: {
      async countBusinessUnits(identity) {
        const listed = await input.functionalUnits.list(identity, {
          page: 1,
          pageSize: 100,
        });
        return listed.items.filter((unit) =>
          isBusinessAccessType(unit.accessType as AccessType)
        ).length;
      },
      async countComplianceBodies(identity) {
        const listed = await input.functionalUnits.list(identity, {
          page: 1,
          pageSize: 100,
        });
        return listed.items.filter((unit) =>
          isComplianceAccessType(unit.accessType as AccessType)
        ).length;
      },
      async getById(identity, id) {
        try {
          const unit = await input.functionalUnits.getById(identity, id);
          return {
            id: unit.id,
            name: unit.name,
            accessType: unit.accessType,
            reference: unit.reference,
          };
        } catch {
          return null;
        }
      },
    },
    users: {
      async countActiveStaff(identity) {
        const listed = await input.users.list(identity, {
          page: 1,
          pageSize: 1,
        });
        return listed.total;
      },
      async countRemoteStaff(identity) {
        // Bounded sample — Users list has no remote filter; count within first page window.
        const listed = await input.users.list(identity, {
          page: 1,
          pageSize: 100,
        });
        return listed.items.filter(
          (row) =>
            (row.membership?.workLocationType ?? "").toLowerCase() === "remote"
        ).length;
      },
    },
    premises: {
      async countPremises(identity) {
        const listed = await input.businessPremises.list(identity, {
          page: 1,
          pageSize: 1,
          sort: "createdOn",
          sortDir: "desc",
        });
        return listed.total;
      },
    },
    tasks: {
      async countOpenTasks(identity) {
        const listed = await input.tasks.list(identity, {
          page: 1,
          pageSize: 1,
          statusPreset: "incomplete",
        });
        return listed.total;
      },
    },
  };
}
