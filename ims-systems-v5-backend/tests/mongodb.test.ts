import { afterEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createLogger } from "../src/infrastructure/logging/logger";
import { createMongoConnection } from "../src/infrastructure/mongodb/connection";

describe("MongoDB connection lifecycle", () => {
  let memoryServer: MongoMemoryServer | undefined;

  afterEach(async () => {
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = undefined;
    }
  });

  it("connects and disconnects cleanly", async () => {
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri("ims_v5_mongo_lifecycle");
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
