import mongoose from "mongoose";
import type { Logger } from "../logging/logger";

export type MongoConnection = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
};

export function createMongoConnection(options: {
  uri: string;
  logger: Logger;
}): MongoConnection {
  const { uri, logger } = options;
  let connected = false;

  return {
    async connect() {
      try {
        await mongoose.connect(uri);
        connected = true;
        logger.info("MongoDB connected");
      } catch (error) {
        connected = false;
        logger.error({ err: error }, "MongoDB connection failed");
        throw error;
      }
    },
    async disconnect() {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      connected = false;
      logger.info("MongoDB disconnected");
    },
    isConnected() {
      return connected && mongoose.connection.readyState === 1;
    },
  };
}
