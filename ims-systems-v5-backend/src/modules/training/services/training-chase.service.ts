import type { Logger } from "pino";
import type { TrainingService } from "./training.service";

/**
 * Daily chase / reminder scheduler for Training & Competency.
 * Mirrors ASL chase schedule pattern.
 */
export function createTrainingChaseService(deps: {
  service: TrainingService;
  logger: Logger;
}) {
  async function runOnce(): Promise<void> {
    const orgIds = await deps.service.listOrganizationIds();
    for (const organizationId of orgIds) {
      try {
        const result = await deps.service.runDailyChase(organizationId);
        if (result.sessionReminders || result.expiring || result.expired) {
          deps.logger.info(
            {
              organizationId,
              sessionReminders: result.sessionReminders,
              expiring: result.expiring,
              expired: result.expired,
            },
            "Training chase cycle complete"
          );
        }
      } catch (error) {
        deps.logger.error(
          { err: error, organizationId },
          "Training chase cycle failed"
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
      deps.logger.info("Training chase schedule started");
    },
    stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
  };
}

export type TrainingChaseService = ReturnType<typeof createTrainingChaseService>;

export function startTrainingChaseSchedule(input: {
  service: TrainingChaseService;
  logger: Logger;
  intervalMs?: number;
}): void {
  input.service.start(input.intervalMs);
}
