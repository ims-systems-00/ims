import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Prefer the system mongod binary when available.
 * Avoids fragile downloaded binary MD5/lock issues in local CI/dev.
 */
export async function createMemoryMongo(
  dbName = "ims_v5_test"
): Promise<MongoMemoryServer> {
  return MongoMemoryServer.create({
    instance: { dbName },
    binary: {
      systemBinary: process.env.MONGOMS_SYSTEM_BINARY ?? "/usr/bin/mongod",
    },
  });
}
