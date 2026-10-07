import type { Express } from "express";
import { loadConfig, type AppConfig, type EnvSource } from "../../src/config";
import { createLogger } from "../../src/infrastructure/logging/logger";
import {
  createMongoConnection,
  type MongoConnection,
} from "../../src/infrastructure/mongodb/connection";
import { createEmailSystem } from "../../src/infrastructure/queue";
import { createApp } from "../../src/app/create-app";
import { createMemoryMongo } from "./memory-mongo";
import type { MongoMemoryServer } from "mongodb-memory-server";

export type TestContext = {
  app: Express;
  mongo: MongoConnection;
  config: AppConfig;
  memoryServer: MongoMemoryServer;
  cleanup: () => Promise<void>;
};

export async function createTestApp(
  overrides: EnvSource = {}
): Promise<TestContext> {
  const memoryServer = await createMemoryMongo("ims_v5_test");
  const uri = memoryServer.getUri();

  const config = loadConfig({
    NODE_ENV: "test",
    PORT: "3001",
    MONGODB_URI: uri,
    LOG_LEVEL: "silent",
    SECURITY_PROVIDER: "development-stub",
    EMAIL_ENABLED: "false",
    EMAIL_PROVIDER: "logging",
    EMAIL_QUEUE_ENABLED: "false",
    REPORT_BUG_SUPPORT_EMAILS: "support@example.local",
    ...overrides,
  });

  const logger = createLogger({ level: "silent" });
  const mongo = createMongoConnection({ uri: config.MONGODB_URI, logger });
  const email = createEmailSystem({ config, logger });
  await mongo.connect();

  const { app } = createApp({ config, logger, mongo, email });

  return {
    app,
    mongo,
    config,
    memoryServer,
    cleanup: async () => {
      await email.close();
      await mongo.disconnect();
      try {
        await memoryServer.stop({ doCleanup: true, force: true });
      } catch {
        // System mongod + sandbox can leave a stuck process handle; ignore teardown noise.
      }
    },
  };
}
