/**
 * Wire Stats ports to existing module public services.
 * Spec: docs/module-specifications/stats.md §5
 */

import type { AssetsService } from "../../assets";
import type { AuditService } from "../../audits";
import type { CustomerService } from "../../customers";
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
import type { UsersService } from "../../users";
import type { ComplianceApplicationPort } from "../../compliance";
import type { StatsModulePorts } from "../ports";
import {
  DevNoOrgTargetsAdapter,
  UnavailableComplianceAdapter,
  UnavailableInvoicesAdapter,
} from "../ports";

export type StatsPortsFromModulesInput = {
  risks: RiskService;
  incidents: IncidentService;
  audits: AuditService;
  ofi: OfiService;
  suppliers: SupplierService;
  inventory: AssetsService;
  managementReviews: ManagementReviewService;
  functionalUnits: FunctionalUnitService;
  users: UsersService;
  customers: CustomerService;
  compliance?: ComplianceApplicationPort;
};

export function createStatsPortsFromModules(
  input: StatsPortsFromModulesInput
): StatsModulePorts {
  return {
    risks: {
      stats: (identity) => input.risks.stats(identity),
      async listSample(identity, opts) {
        const listed = await input.risks.list(identity, {
          page: 1,
          pageSize: Math.min(opts.pageSize, 100),
          raisedFrom: opts.raisedFrom,
          raisedTo: opts.raisedTo,
          sort: "raisedOn",
          sortDir: "desc",
        });
        return listed.items;
      },
    },
    incidents: {
      stats: (identity) => input.incidents.stats(identity),
      async listSample(identity, opts) {
        const listed = await input.incidents.list(identity, {
          page: 1,
          pageSize: Math.min(opts.pageSize, 100),
          businessUnitIds: opts.businessUnitIds,
          sort: "raisedOn",
          sortDir: "desc",
        });
        return listed.items.map((item) => ({
          id: item.id,
          businessUnitId: item.businessUnitId,
          resolved: { status: item.resolved.status },
          raisedOn: item.raisedOn,
          priority: item.priority,
          resolvedOn: item.resolved.on,
        }));
      },
    },
    audits: {
      stats: (identity) => input.audits.stats(identity),
      async listSample(identity, opts) {
        const listed = await input.audits.list(identity, {
          page: 1,
          pageSize: Math.min(opts.pageSize, 100),
          sort: "updatedAt",
          sortDir: "desc",
        });
        return listed.items.map((item) => ({
          id: item.id,
          businessUnitId: item.businessUnitId,
          completed: { status: item.completed.status },
          identifications: item.identifications.map((row) => ({ id: row.id })),
        }));
      },
    },
    ofi: {
      stats: (identity) => input.ofi.stats(identity),
      async listSample(identity, opts) {
        const listed = await input.ofi.list(identity, {
          page: 1,
          pageSize: Math.min(opts.pageSize, 100),
          sort: "createdOn",
          sortDir: "desc",
        });
        return listed.items.map((item) => ({
          id: item.id,
          businessUnitId: item.businessUnitId,
          implemented: { status: item.implemented.status },
        }));
      },
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
      async listBusinessUnits(identity) {
        const listed = await input.functionalUnits.list(identity, {
          page: 1,
          pageSize: 100,
        });
        return listed.items
          .filter((unit) => isBusinessAccessType(unit.accessType as AccessType))
          .map((unit) => ({
            id: unit.id,
            name: unit.name,
            accessType: unit.accessType,
          }));
      },
      async listComplianceBodies(identity) {
        const listed = await input.functionalUnits.list(identity, {
          page: 1,
          pageSize: 100,
        });
        return listed.items
          .filter((unit) =>
            isComplianceAccessType(unit.accessType as AccessType)
          )
          .map((unit) => ({
            id: unit.id,
            name: unit.name,
            accessType: unit.accessType,
          }));
      },
      async resolveNames(identity, ids) {
        const unique = [...new Set(ids.filter(Boolean))];
        const names = new Map<string, string>();
        await Promise.all(
          unique.map(async (id) => {
            try {
              const unit = await input.functionalUnits.getById(identity, id);
              names.set(id, unit.name);
            } catch {
              // Leave unresolved — callers fall back to truncated id.
            }
          })
        );
        return names;
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
        const listed = await input.users.list(identity, {
          page: 1,
          pageSize: 100,
        });
        return listed.items.filter(
          (row) =>
            (row.membership?.workLocationType ?? "").toLowerCase() === "remote"
        ).length;
      },
      async sumStaffSalaries(identity) {
        const listed = await input.users.list(identity, {
          page: 1,
          pageSize: 100,
        });
        return listed.items.reduce((sum, row) => {
          const salary = row.membership?.salary;
          return sum + (typeof salary === "number" ? salary : 0);
        }, 0);
      },
    },
    customers: {
      async listSample(identity, opts) {
        const listed = await input.customers.list(identity, {
          page: 1,
          pageSize: Math.min(opts.pageSize, 100),
          sort: "createdOn",
          sortDir: "desc",
        });
        return listed.items.map((item) => ({
          id: item.id,
          name: item.name,
          stage: item.stage,
          contractValue: item.contractValue,
        }));
      },
    },
    invoices: new UnavailableInvoicesAdapter(),
    compliance: input.compliance
      ? {
          async frameworkPercentages(identity) {
            if (!identity.organizationId) return [];
            return input.compliance!.frameworkPercentages(
              identity.organizationId
            );
          },
        }
      : new UnavailableComplianceAdapter(),
    organisation: new DevNoOrgTargetsAdapter(),
  };
}
