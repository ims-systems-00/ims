import { config as loadDotenv } from "dotenv";
import type { Server } from "node:http";
import { loadConfig } from "../config";
import { createLogger } from "../infrastructure/logging/logger";
import { createMongoConnection } from "../infrastructure/mongodb/connection";
import { createEmailSystem } from "../infrastructure/queue";
import { createApp } from "./create-app";

loadDotenv();

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.LOG_LEVEL });
  const mongo = createMongoConnection({
    uri: config.MONGODB_URI,
    logger,
  });
  const email = createEmailSystem({ config, logger });

  await mongo.connect();

  const { app } = createApp({ config, logger, mongo, email });

  if (
    config.EMAIL_ENABLED &&
    config.EMAIL_QUEUE_ENABLED &&
    config.EMAIL_WORKER_IN_API
  ) {
    email.startWorkers();
    logger.warn(
      "Email workers running inside the API process (dev only). Prefer `pnpm worker:email` in production."
    );
  }

  const host = "0.0.0.0";
  const server: Server = app.listen(config.PORT, host, () => {
    logger.info(
      {
        host,
        port: config.PORT,
        env: config.NODE_ENV,
        emailEnabled: config.EMAIL_ENABLED,
        emailQueueEnabled: config.EMAIL_QUEUE_ENABLED,
        emailProvider: config.EMAIL_PROVIDER,
        filesEnabled: config.FILES_ENABLED,
        filesProvider: config.FILES_PROVIDER,
      },
      "HTTP server listening"
    );
  });

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");

    const forceExitTimer = setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    server.close(async (closeError) => {
      if (closeError) {
        logger.error({ err: closeError }, "Error closing HTTP server");
      }
      try {
        await email.close();
      } catch (error) {
        logger.error({ err: error }, "Error closing email system");
      }
      try {
        await mongo.disconnect();
      } catch (error) {
        logger.error({ err: error }, "Error disconnecting MongoDB");
      }
      logger.info("Shutdown complete");
      process.exit(closeError ? 1 : 0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error: unknown) => {
  // Config/startup failures before logger may exist.
  console.error(error);
  process.exit(1);
});
