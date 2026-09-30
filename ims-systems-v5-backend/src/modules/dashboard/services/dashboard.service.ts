/**
 * Dashboard application service — live aggregation composition.
 * Spec: docs/module-specifications/dashboard.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../shared";
import type { DashboardModulePorts } from "../ports";
import {
  DASHBOARD_RESOURCE,
  type DashboardModuleKey,
  type DashboardModuleStats,
  type LiveDashboard,
  type LiveDashboardQuery,
} from "../types";
import { buildHeadline } from "./headline";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

async function settle<T>(
  key: DashboardModuleKey,
  promise: Promise<T>,
  unavailable: DashboardModuleKey[]
): Promise<T | null> {
  try {
    return await promise;
  } catch {
    unavailable.push(key);
    return null;
  }
}

export type DashboardServiceDeps = {
  authorizer: Authorizer;
  ports: DashboardModulePorts;
};

export type DashboardService = ReturnType<typeof createDashboardService>;

export function createDashboardService(deps: DashboardServiceDeps) {
  const { authorizer, ports } = deps;

  async function assertAllowed(identity: SecurityIdentity): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action: "read",
      resourceType: DASHBOARD_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access the Dashboard"
      );
    }
  }

  async function aggregateLive(
    identity: SecurityIdentity,
    organizationId: string,
    _query: LiveDashboardQuery
  ): Promise<{
    modules: DashboardModuleStats;
    counts: LiveDashboard["counts"];
    unavailable: DashboardModuleKey[];
  }> {
    void _query;
    const unavailable: DashboardModuleKey[] = [];

    const [
      risks,
      incidents,
      audits,
      ofi,
      suppliers,
      inventory,
      managementReviews,
      businessUnits,
      complianceBodies,
      staff,
      remoteStaff,
      premises,
      openTasks,
    ] = await Promise.all([
      settle("risks", ports.risks.stats(identity), unavailable),
      settle("incidents", ports.incidents.stats(identity), unavailable),
      settle("audits", ports.audits.stats(identity), unavailable),
      settle("ofi", ports.ofi.stats(identity), unavailable),
      settle("suppliers", ports.suppliers.stats(identity), unavailable),
      settle("inventory", ports.inventory.stats(identity), unavailable),
      settle(
        "managementReviews",
        ports.managementReviews.stats(identity),
        unavailable
      ),
      settle(
        "functionalUnits",
        ports.functionalUnits.countBusinessUnits(identity),
        unavailable
      ),
      settle(
        "functionalUnits",
        ports.functionalUnits.countComplianceBodies(identity),
        unavailable
      ),
      settle("users", ports.users.countActiveStaff(identity), unavailable),
      settle("users", ports.users.countRemoteStaff(identity), unavailable),
      settle("businessPremises", ports.premises.countPremises(identity), unavailable),
      settle("tasks", ports.tasks.countOpenTasks(identity), unavailable),
    ]);

    const modules: DashboardModuleStats = {
      risks,
      incidents,
      audits,
      ofi,
      suppliers,
      inventory,
      managementReviews,
    };

    return {
      modules,
      counts: {
        businessUnits: businessUnits ?? 0,
        complianceBodies: complianceBodies ?? 0,
        staff: staff ?? 0,
        remoteStaff: remoteStaff ?? 0,
        premises: premises ?? 0,
        openTasks: openTasks ?? 0,
      },
      unavailable: [...new Set(unavailable)],
    };
  }

  return {
    async getOrganisationDashboard(
      identity: SecurityIdentity | null | undefined,
      query: LiveDashboardQuery = {}
    ): Promise<LiveDashboard> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor);

      const aggregated = await aggregateLive(actor, organizationId, query);

      return {
        context: "organisation",
        accurateAs: new Date().toISOString(),
        organizationId,
        headline: buildHeadline(aggregated.modules),
        counts: aggregated.counts,
        modules: aggregated.modules,
        unavailable: aggregated.unavailable,
        metricScope: "identity-list-scope",
      };
    },

    async getFunctionalUnitDashboard(
      identity: SecurityIdentity | null | undefined,
      functionalUnitId: string,
      query: LiveDashboardQuery = {}
    ): Promise<LiveDashboard> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor);

      const unit = await ports.functionalUnits.getById(actor, functionalUnitId);
      if (!unit) {
        throw new NotFoundError("Functional Unit not found");
      }

      const aggregated = await aggregateLive(actor, organizationId, query);

      return {
        context: "functional-unit",
        accurateAs: new Date().toISOString(),
        organizationId,
        functionalUnit: unit,
        headline: buildHeadline(aggregated.modules),
        counts: aggregated.counts,
        modules: aggregated.modules,
        unavailable: aggregated.unavailable,
        /**
         * Phase 1: module stats APIs do not accept a Functional Unit filter.
         * Metrics follow the caller's identity list-scope (org-wide in development).
         */
        metricScope: "identity-list-scope",
      };
    },
  };
}
