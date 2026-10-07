import { Queue, type JobsOptions } from "bullmq";
import type { AppConfig } from "../../config";
import {
  createEmailTransport,
  type EmailTransport,
  type OutgoingEmail,
  type SendEmailResult,
} from "../email";
import type { Logger } from "../logging/logger";
import {
  emailJobDataSchema,
  type EmailJobData,
} from "./email-jobs";
import { createEmailWorkers, type EmailWorkers } from "./email.worker";
import { QUEUE_NAMES } from "./names";
import { createRedisClient } from "./redis-connection";

export type EnqueueEmailInput = Omit<EmailJobData, "kind"> & {
  kind?: "raw";
};

export type EnqueueEmailResult = {
  mode: "queued" | "direct" | "disabled";
  queue?: string;
  jobId?: string;
  result?: SendEmailResult;
};

export type EmailSystem = {
  transport: EmailTransport;
  /** Enqueue (or directly send) a single / small transactional email. */
  sendTransactional: (input: EnqueueEmailInput) => Promise<EnqueueEmailResult>;
  /**
   * Enqueue bulk / customer-communication mail.
   * Uses a rate-limited queue — prefer one recipient per job for large lists
   * (fan-out from the producer), or a modest recipient array per job.
   */
  sendBulk: (input: EnqueueEmailInput) => Promise<EnqueueEmailResult>;
  /** Start in-process workers (API-embedded or dedicated worker process). */
  startWorkers: () => EmailWorkers;
  close: () => Promise<void>;
};

const DEFAULT_TRANSACTIONAL_JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 5_000 },
};

const DEFAULT_BULK_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 5_000 },
};

function toOutgoing(data: EmailJobData): OutgoingEmail {
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

/**
 * Production email + queue facade.
 *
 * - EMAIL_ENABLED=false → no delivery (logging transport / disabled mode)
 * - EMAIL_QUEUE_ENABLED=false → send via transport immediately
 * - EMAIL_QUEUE_ENABLED=true → enqueue on BullMQ (Redis)
 */
export function createEmailSystem(options: {
  config: AppConfig;
  logger: Logger;
}): EmailSystem {
  const { config, logger } = options;
  const transport = createEmailTransport(config, logger);

  let transactionalQueue: Queue<EmailJobData> | null = null;
  let bulkQueue: Queue<EmailJobData> | null = null;
  let workers: EmailWorkers | null = null;
  const redisClients: ReturnType<typeof createRedisClient>[] = [];

  const ensureQueues = () => {
    if (transactionalQueue && bulkQueue) {
      return { transactionalQueue, bulkQueue };
    }

    const transactionalConnection = createRedisClient({
      redisUrl: config.REDIS_URL,
      logger,
      connectionName: "ims-v5-email-tx-queue",
    });
    const bulkConnection = createRedisClient({
      redisUrl: config.REDIS_URL,
      logger,
      connectionName: "ims-v5-email-bulk-queue",
    });
    redisClients.push(transactionalConnection, bulkConnection);

    transactionalQueue = new Queue<EmailJobData>(QUEUE_NAMES.emailTransactional, {
      connection: transactionalConnection,
      defaultJobOptions: DEFAULT_TRANSACTIONAL_JOB_OPTS,
    });
    bulkQueue = new Queue<EmailJobData>(QUEUE_NAMES.emailBulk, {
      connection: bulkConnection,
      defaultJobOptions: DEFAULT_BULK_JOB_OPTS,
    });

    return { transactionalQueue, bulkQueue };
  };

  const deliverDirect = async (
    data: EmailJobData
  ): Promise<EnqueueEmailResult> => {
    if (!config.EMAIL_ENABLED) {
      logger.debug(
        { category: data.category, subject: data.subject },
        "Email disabled — skipping send"
      );
      return { mode: "disabled" };
    }
    const result = await transport.send(toOutgoing(data));
    return { mode: "direct", result };
  };

  const enqueue = async (
    queueName: typeof QUEUE_NAMES.emailTransactional | typeof QUEUE_NAMES.emailBulk,
    input: EnqueueEmailInput
  ): Promise<EnqueueEmailResult> => {
    const data = emailJobDataSchema.parse({
      kind: "raw",
      ...input,
    });

    if (!config.EMAIL_ENABLED) {
      return { mode: "disabled" };
    }

    if (!config.EMAIL_QUEUE_ENABLED) {
      return deliverDirect(data);
    }

    const queues = ensureQueues();
    const queue =
      queueName === QUEUE_NAMES.emailBulk
        ? queues.bulkQueue
        : queues.transactionalQueue;

    const job = await queue.add(data.category, data, {
      ...(data.dedupeKey
        ? { jobId: data.dedupeKey, removeOnComplete: true }
        : {}),
    });

    logger.info(
      {
        queue: queueName,
        jobId: job.id,
        category: data.category,
        correlationId: data.correlationId,
        organizationId: data.organizationId,
      },
      "Email job enqueued"
    );

    return {
      mode: "queued",
      queue: queueName,
      jobId: job.id,
    };
  };

  return {
    transport,
    sendTransactional: (input) =>
      enqueue(QUEUE_NAMES.emailTransactional, {
        ...input,
        category: input.category ?? "transactional",
      }),
    sendBulk: (input) =>
      enqueue(QUEUE_NAMES.emailBulk, {
        ...input,
        category: input.category ?? "bulk",
      }),
    startWorkers() {
      if (workers) {
        return workers;
      }
      workers = createEmailWorkers({ config, transport, logger });
      logger.info(
        {
          transactionalConcurrency: config.EMAIL_TRANSACTIONAL_CONCURRENCY,
          bulkConcurrency: config.EMAIL_BULK_CONCURRENCY,
          bulkRateMax: config.EMAIL_BULK_RATE_MAX,
          bulkRateDurationMs: config.EMAIL_BULK_RATE_DURATION_MS,
        },
        "Email workers started"
      );
      return workers;
    },
    async close() {
      if (workers) {
        await workers.close();
        workers = null;
      }
      await Promise.all(
        [transactionalQueue, bulkQueue]
          .filter((queue): queue is Queue<EmailJobData> => Boolean(queue))
          .map((queue) => queue.close())
      );
      transactionalQueue = null;
      bulkQueue = null;
      await Promise.all(redisClients.map((client) => client.quit().catch(() => undefined)));
      redisClients.length = 0;
      logger.info("Email system closed");
    },
  };
}
