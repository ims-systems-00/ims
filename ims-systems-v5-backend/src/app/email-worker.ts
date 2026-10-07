import { config as loadDotenv } from "dotenv";
import { loadConfig } from "../config";
import { createLogger } from "../infrastructure/logging/logger";
import { createEmailSystem } from "../infrastructure/queue";

loadDotenv();

/**
 * Dedicated email worker process.
 *
 * Usage:
 *   pnpm worker:email
 *
 * Requires EMAIL_ENABLED=true, EMAIL_QUEUE_ENABLED=true, REDIS_URL,
 * and a real EMAIL_PROVIDER (sendgrid) for production delivery.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({
    level: config.LOG_LEVEL,
    name: "ims-systems-v5-email-worker",
  });

  if (!config.EMAIL_ENABLED) {
    throw new Error(
      "EMAIL_ENABLED must be true to run the email worker process"
    );
  }
  if (!config.EMAIL_QUEUE_ENABLED) {
    throw new Error(
      "EMAIL_QUEUE_ENABLED must be true to run the email worker process"
    );
  }

  const email = createEmailSystem({ config, logger });
  email.startWorkers();

  logger.info(
    {
      env: config.NODE_ENV,
      provider: config.EMAIL_PROVIDER,
      redisUrl: config.REDIS_URL.replace(/\/\/.*@/, "//***@"),
    },
    "Email worker process listening for jobs"
  );

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down email worker");

    const forceExitTimer = setTimeout(() => {
      logger.error("Forced email worker shutdown after timeout");
      process.exit(1);
    }, 15_000);
    forceExitTimer.unref();

    try {
      await email.close();
      logger.info("Email worker shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "Email worker shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
