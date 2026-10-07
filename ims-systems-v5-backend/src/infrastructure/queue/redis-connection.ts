import IORedis, { type RedisOptions } from "ioredis";
import type { Logger } from "../logging/logger";

/**
 * BullMQ requires `maxRetriesPerRequest: null` on shared connections.
 * Create one connection factory so Queue / Worker / QueueEvents stay consistent.
 */
export function createRedisConnectionOptions(redisUrl: string): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    // Lazy connect lets BullMQ own connect timing.
  };
}

export function createRedisClient(options: {
  redisUrl: string;
  logger: Logger;
  connectionName?: string;
}): IORedis {
  const { redisUrl, logger, connectionName } = options;
  const client = new IORedis(redisUrl, {
    ...createRedisConnectionOptions(redisUrl),
    connectionName: connectionName ?? "ims-v5",
  });

  client.on("connect", () => {
    logger.info({ connectionName }, "Redis connecting");
  });
  client.on("ready", () => {
    logger.info({ connectionName }, "Redis ready");
  });
  client.on("error", (error) => {
    logger.error({ err: error, connectionName }, "Redis error");
  });
  client.on("close", () => {
    logger.warn({ connectionName }, "Redis connection closed");
  });

  return client;
}
