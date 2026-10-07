import { Worker, type Job } from "bullmq";
import type { AppConfig } from "../../config";
import type { EmailTransport, OutgoingEmail } from "../email";
import type { Logger } from "../logging/logger";
import { parseEmailJobData, type EmailJobData } from "./email-jobs";
import { QUEUE_NAMES } from "./names";
import { createRedisClient } from "./redis-connection";

function toOutgoingEmail(data: EmailJobData): OutgoingEmail {
  return {
    to: data.to,
    subject: data.subject,
    html: data.html,
    ...(data.text ? { text: data.text } : {}),
    ...(data.replyTo ? { replyTo: data.replyTo } : {}),
    ...(data.attachments ? { attachments: data.attachments } : {}),
    category: data.category,
    ...(data.correlationId ? { correlationId: data.correlationId } : {}),
    ...(data.organizationId ? { organizationId: data.organizationId } : {}),
  };
}

async function processEmailJob(
  job: Job<EmailJobData>,
  transport: EmailTransport,
  logger: Logger
) {
  const data = parseEmailJobData(job.data);
  logger.info(
    {
      queue: job.queueName,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      category: data.category,
      correlationId: data.correlationId,
      organizationId: data.organizationId,
    },
    "Processing email job"
  );

  return transport.send(toOutgoingEmail(data));
}

export type EmailWorkers = {
  transactional: Worker<EmailJobData>;
  bulk: Worker<EmailJobData>;
  close: () => Promise<void>;
};

/**
 * Start BullMQ workers that deliver queued email jobs via the configured transport.
 */
export function createEmailWorkers(options: {
  config: AppConfig;
  transport: EmailTransport;
  logger: Logger;
}): EmailWorkers {
  const { config, transport, logger } = options;

  const transactionalConnection = createRedisClient({
    redisUrl: config.REDIS_URL,
    logger,
    connectionName: "ims-v5-email-tx-worker",
  });
  const bulkConnection = createRedisClient({
    redisUrl: config.REDIS_URL,
    logger,
    connectionName: "ims-v5-email-bulk-worker",
  });

  const transactional = new Worker<EmailJobData>(
    QUEUE_NAMES.emailTransactional,
    (job) => processEmailJob(job, transport, logger),
    {
      connection: transactionalConnection,
      concurrency: config.EMAIL_TRANSACTIONAL_CONCURRENCY,
    }
  );

  const bulk = new Worker<EmailJobData>(
    QUEUE_NAMES.emailBulk,
    (job) => processEmailJob(job, transport, logger),
    {
      connection: bulkConnection,
      concurrency: config.EMAIL_BULK_CONCURRENCY,
      limiter: {
        max: config.EMAIL_BULK_RATE_MAX,
        duration: config.EMAIL_BULK_RATE_DURATION_MS,
      },
    }
  );

  const bindEvents = (worker: Worker<EmailJobData>, label: string) => {
    worker.on("completed", (job) => {
      logger.info({ queue: label, jobId: job.id }, "Email job completed");
    });
    worker.on("failed", (job, error) => {
      logger.error(
        {
          queue: label,
          jobId: job?.id,
          attemptsMade: job?.attemptsMade,
          err: error,
        },
        "Email job failed"
      );
    });
    worker.on("error", (error) => {
      logger.error({ queue: label, err: error }, "Email worker error");
    });
  };

  bindEvents(transactional, QUEUE_NAMES.emailTransactional);
  bindEvents(bulk, QUEUE_NAMES.emailBulk);

  return {
    transactional,
    bulk,
    async close() {
      await Promise.all([transactional.close(), bulk.close()]);
      await Promise.all([
        transactionalConnection.quit().catch(() => undefined),
        bulkConnection.quit().catch(() => undefined),
      ]);
      logger.info("Email workers closed");
    },
  };
}
