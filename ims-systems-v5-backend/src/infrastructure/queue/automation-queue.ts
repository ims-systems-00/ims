/**
 * BullMQ queue for compliance automation scans (N-11). Mirrors the
 * email system connection handling. When the queue is disabled the
 * adapter runs scans inline instead.
 */

import { Queue, Worker } from "bullmq";
import type { AppConfig } from "../../config";
import type { Logger } from "../logging/logger";
import { QUEUE_NAMES } from "./names";
import { createRedisClient } from "./redis-connection";

export type ComplianceAutomationJob = {
  organizationId: string;
  toolkitName: string;
  actorId: string;
};

export function createComplianceAutomationQueue(deps: {
  config: AppConfig;
  logger: Logger;
  handler: (job: ComplianceAutomationJob) => Promise<void>;
}) {
  const { config, logger, handler } = deps;
  const connection = createRedisClient({
    redisUrl: config.REDIS_URL,
    logger,
    connectionName: "ims-v5-automation-queue",
  });
  const queue = new Queue<ComplianceAutomationJob>(QUEUE_NAMES.complianceAutomation, {
    connection,
    defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
  });

  let worker: Worker<ComplianceAutomationJob> | null = null;

  return {
    async enqueue(job: ComplianceAutomationJob): Promise<void> {
      await queue.add("toolkit-provisioned", job, {
        jobId: `automation-${job.organizationId}-${job.toolkitName}-${Date.now()}`,
      });
    },
    startWorker(): void {
      if (worker) return;
      worker = new Worker<ComplianceAutomationJob>(
        QUEUE_NAMES.complianceAutomation,
        async (job) => handler(job.data),
        {
          connection: createRedisClient({
            redisUrl: config.REDIS_URL,
            logger,
            connectionName: "ims-v5-automation-worker",
          }),
          concurrency: 2,
        },
      );
      worker.on("failed", (job, err) => {
        logger.error(
          { jobId: job?.id, err: err.message },
          "Compliance automation job failed",
        );
      });
    },
    async close(): Promise<void> {
      await worker?.close();
      await queue.close();
      connection.disconnect();
    },
  };
}

export type ComplianceAutomationQueue = ReturnType<
  typeof createComplianceAutomationQueue
>;
