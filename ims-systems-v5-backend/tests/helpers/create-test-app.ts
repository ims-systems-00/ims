import type { Express } from "express";
import { loadConfig, type AppConfig } from "../../src/config";
import { createLogger } from "../../src/infrastructure/logging/logger";
import {
  createMongoConnection,
  type MongoConnection,
} from "../../src/infrastructure/mongodb/connection";
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
  overrides: Partial<Record<keyof AppConfig, string>> = {}
): Promise<TestContext> {
  const memoryServer = await createMemoryMongo("ims_v5_test");
  const uri = memoryServer.getUri();

  const config = loadConfig({
    NODE_ENV: "test",
    PORT: "3001",
    MONGODB_URI: uri,
    LOG_LEVEL: "silent",
    SECURITY_PROVIDER: "development-stub",
    ...overrides,
  });

  const logger = createLogger({ level: "silent" });
  const mongo = createMongoConnection({ uri: config.MONGODB_URI, logger });
  await mongo.connect();

  const { app } = createApp({ config, logger, mongo });

  return {
    app,
    mongo,
    config,
    memoryServer,
    cleanup: async () => {
      await mongo.disconnect();
      try {
        await memoryServer.stop({ doCleanup: true, force: true });
      } catch {
        // System mongod + sandbox can leave a stuck process handle; ignore teardown noise.
      }
    },
  };
}
