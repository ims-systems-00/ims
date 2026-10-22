/**
 * Compliance automation runner (N-11).
 *
 * Mirrors the V4 automation scan: when a toolkit is provisioned, scan
 * the operational modules for existing records in the organisation
 * (risks, incidents, OFIs, audits, management reviews, documents).
 * The scan result is persisted as an automation run and the actor is
 * notified which modules already hold records — the candidate set for
 * auto-compliance. Catalogue templates carry no module→control
 * automation mapping in V5 today, so controls are not auto-implemented;
 * that mapping is the remaining product definition.
 */

import { getAuditModel } from "../../audits/repositories/audit.model";
import { getDocumentTreeModel } from "../../document-management/repositories/document-tree.model";
import { getIncidentModel } from "../../incidents/repositories/incident.model";
import { getManagementReviewModel } from "../../management-reviews/repositories/management-review.model";
import { getOfiModel } from "../../ofi/repositories/ofi.model";
import { getRiskModel } from "../../risks/repositories/risk.model";
import type { AutomationRunRepository } from "../repositories/automation-run.model";
import type { ComplianceToolkitName } from "../types";

export type AutomationScanResult = {
  scannedModules: { module: string; recordCount: number }[];
  modulesWithRecords: string[];
};

type Counter = { countDocuments: (filter: Record<string, unknown>) => Promise<number> };

const MODULE_COUNTERS: { module: string; counter: () => Counter }[] = [
  { module: "risks", counter: () => getRiskModel() as unknown as Counter },
  { module: "incidents", counter: () => getIncidentModel() as unknown as Counter },
  { module: "ofi", counter: () => getOfiModel() as unknown as Counter },
  { module: "audits", counter: () => getAuditModel() as unknown as Counter },
  {
    module: "managementReviews",
    counter: () => getManagementReviewModel() as unknown as Counter,
  },
  {
    module: "documents",
    counter: () => getDocumentTreeModel() as unknown as Counter,
  },
];

export function createComplianceAutomationRunner(deps: {
  runs: AutomationRunRepository;
  notify?: (input: {
    organizationId: string;
    actorId: string;
    toolkitName: string;
    modulesWithRecords: string[];
  }) => Promise<void>;
  counters?: { module: string; count: (organizationId: string) => Promise<number> }[];
}) {
  const counters =
    deps.counters ??
    MODULE_COUNTERS.map((m) => ({
      module: m.module,
      count: (organizationId: string) =>
        m.counter().countDocuments({ organizationId, deletedAt: null }),
    }));

  return {
    async runScan(input: {
      organizationId: string;
      toolkitName: ComplianceToolkitName;
      actorId: string;
    }): Promise<AutomationScanResult> {
      const scannedModules = await Promise.all(
        counters.map(async (c) => ({
          module: c.module,
          recordCount: await c.count(input.organizationId).catch(() => 0),
        })),
      );
      const modulesWithRecords = scannedModules
        .filter((m) => m.recordCount > 0)
        .map((m) => m.module);
      await deps.runs.record({
        organizationId: input.organizationId,
        toolkitName: input.toolkitName,
        actorId: input.actorId,
        scannedModules,
        modulesWithRecords,
      });
      if (deps.notify) {
        await deps.notify({
          organizationId: input.organizationId,
          actorId: input.actorId,
          toolkitName: input.toolkitName,
          modulesWithRecords,
        }).catch(() => undefined);
      }
      return { scannedModules, modulesWithRecords };
    },
  };
}

export type ComplianceAutomationRunner = ReturnType<
  typeof createComplianceAutomationRunner
>;
