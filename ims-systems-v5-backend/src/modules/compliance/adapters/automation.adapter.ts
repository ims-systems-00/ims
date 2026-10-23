/**
 * Real ComplianceAutomationPort (N-11): enqueues the post-provision
 * scan on BullMQ when the queue is enabled, otherwise runs it inline
 * (fire-and-forget). Never throws — provisioning must not fail.
 */

import type { Logger } from "../../../infrastructure/logging/logger";
import type { ComplianceAutomationQueue } from "../../../infrastructure/queue/automation-queue";
import type { ComplianceAutomationRunner } from "../services/automation-runner.service";
import type { ComplianceAutomationPort } from "../ports";

export function createComplianceAutomationAdapter(deps: {
  runner: ComplianceAutomationRunner;
  queue?: ComplianceAutomationQueue | null;
  logger?: Logger;
}): ComplianceAutomationPort {
  return {
    async onToolkitProvisioned(input) {
      try {
        if (deps.queue) {
          await deps.queue.enqueue(input);
        } else {
          void deps.runner.runScan(input).catch((error) => {
            deps.logger?.error(
              { err: error instanceof Error ? error.message : String(error) },
              "Compliance automation inline scan failed",
            );
          });
        }
      } catch (error) {
        deps.logger?.error(
          { err: error instanceof Error ? error.message : String(error) },
          "Compliance automation enqueue failed",
        );
      }
    },
  };
}
