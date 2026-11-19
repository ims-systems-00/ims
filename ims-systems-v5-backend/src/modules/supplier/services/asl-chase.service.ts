import type { Logger } from "pino";
import type { AslSupplierService } from "./asl-supplier.service";

/**
 * Daily chase / escalation scheduler for ASL suppliers.
 * Mirrors document-review-reminder schedule pattern.
 */
export function createAslChaseService(deps: {
  service: AslSupplierService;
  logger: Logger;
}) {
  async function runOnce(): Promise<void> {
    const orgIds = await deps.service.listOrganizationIds();
    for (const organizationId of orgIds) {
      try {
        const result = await deps.service.runDailyChase(organizationId);
        if (result.followUps || result.escalations) {
          deps.logger.info(
            {
              organizationId,
              followUps: result.followUps,
              escalations: result.escalations,
            },
            "ASL supplier chase cycle complete"
          );
        }
      } catch (error) {
        deps.logger.error(
          { err: error, organizationId },
          "ASL supplier chase cycle failed"
        );
      }
    }
  }

  let interval: ReturnType<typeof setInterval> | null = null;

  return {
    runOnce,
    start(intervalMs = 24 * 60 * 60 * 1000) {
      if (interval) return;
      void runOnce();
      interval = setInterval(() => {
        void runOnce();
      }, intervalMs);
      deps.logger.info("ASL supplier chase schedule started");
    },
    stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
  };
}

export type AslChaseService = ReturnType<typeof createAslChaseService>;

export function startAslChaseSchedule(input: {
  service: AslChaseService;
  logger: Logger;
  intervalMs?: number;
}): void {
  input.service.start(input.intervalMs);
}
