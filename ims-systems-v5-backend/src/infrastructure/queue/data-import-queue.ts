/**
 * BullMQ queue for Data Import background migration.
 * Mirrors automation-queue.ts. When Redis/queue is disabled the module
 * falls back to an inline fire-and-forget adapter.
 */

import { Queue, Worker } from "bullmq";
import type { AppConfig } from "../../config";
import type { Logger } from "../logging/logger";
import type { DataImportJob } from "../../modules/data-import/types";
import { QUEUE_NAMES } from "./names";
import { createRedisClient } from "./redis-connection";

export function createDataImportQueue(deps: {
  config: AppConfig;
  logger: Logger;
  handler: (job: DataImportJob) => Promise<void>;
}) {
  const { config, logger, handler } = deps;
  const connection = createRedisClient({
    redisUrl: config.REDIS_URL,
    logger,
    connectionName: "ims-v5-data-import-queue",
  });
  const queue = new Queue<DataImportJob>(QUEUE_NAMES.dataImport, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });

  let worker: Worker<DataImportJob> | null = null;

  return {
    async enqueue(job: DataImportJob): Promise<void> {
      await queue.add("migrate-sheet", job, {
        jobId: `data-import-${job.organizationId}-${job.module}-${Date.now()}`,
      });
    },
    startWorker(): void {
      if (worker) return;
      worker = new Worker<DataImportJob>(
        QUEUE_NAMES.dataImport,
        async (bullJob) => handler(bullJob.data),
        {
          connection: createRedisClient({
            redisUrl: config.REDIS_URL,
            logger,
            connectionName: "ims-v5-data-import-worker",
          }),
          concurrency: 2,
        }
      );
      worker.on("failed", (job, err) => {
        logger.error(
          { jobId: job?.id, err: err.message },
          "Data import job failed"
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

export type DataImportQueue = ReturnType<typeof createDataImportQueue>;
