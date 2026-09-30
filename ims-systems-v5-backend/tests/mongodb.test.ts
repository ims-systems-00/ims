import { afterEach, describe, expect, it } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { createLogger } from "../src/infrastructure/logging/logger";
import { createMongoConnection } from "../src/infrastructure/mongodb/connection";
import { createMemoryMongo } from "./helpers/memory-mongo";

describe("MongoDB connection lifecycle", () => {
  let memoryServer: MongoMemoryServer | undefined;

  afterEach(async () => {
    if (memoryServer) {
      try {
        await memoryServer.stop({ doCleanup: true, force: true });
      } catch {
        // Ignore teardown failures from system mongod binary / sandbox kill limits.
      }
      memoryServer = undefined;
    }
  });

  it("connects and disconnects cleanly", async () => {
    memoryServer = await createMemoryMongo("ims_v5_mongo_lifecycle");
    const uri = memoryServer.getUri();
    const logger = createLogger({ level: "silent" });
    const mongo = createMongoConnection({ uri, logger });

    expect(mongo.isConnected()).toBe(false);
    await mongo.connect();
    expect(mongo.isConnected()).toBe(true);
    await mongo.disconnect();
    expect(mongo.isConnected()).toBe(false);
  });

  it("fails clearly on an invalid connection string host", async () => {
    const logger = createLogger({ level: "silent" });
    const mongo = createMongoConnection({
      uri: "mongodb://127.0.0.1:1/ims_v5_unreachable?serverSelectionTimeoutMS=500",
      logger,
    });

    await expect(mongo.connect()).rejects.toBeTruthy();
    expect(mongo.isConnected()).toBe(false);
  });
});
