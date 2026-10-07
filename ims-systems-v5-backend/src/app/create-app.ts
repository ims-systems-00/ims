import express, { type Express, type Router } from "express";
import "../types/express-augmentation";
import type { AppConfig } from "../config";
import type { Logger } from "../infrastructure/logging/logger";
import type { MongoConnection } from "../infrastructure/mongodb/connection";
import type { EmailSystem } from "../infrastructure/queue";
import { createSecurityPorts, type SecurityPorts } from "../security";
import { correlationIdMiddleware } from "./middleware/correlation-id";
import { corsMiddleware } from "./middleware/cors";
import { requestLoggerMiddleware } from "./middleware/request-logger";
import { securityContextMiddleware } from "./middleware/security-context";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { createV1Router } from "./routes/v1";

export type CreateAppOptions = {
  config: AppConfig;
  logger: Logger;
  mongo: MongoConnection;
  security?: SecurityPorts;
  /** Shared email/queue facade for future module adapters. */
  email?: EmailSystem;
  /** Extra routers mounted under `/api/v1` (tests / temporary platform probes). */
  additionalV1Routers?: Router[];
};

export type CreatedApp = {
  app: Express;
  security: SecurityPorts;
};

/**
 * Compose the Express application (no listen / process lifecycle).
 */
export function createApp(options: CreateAppOptions): CreatedApp {
  const { config, logger, mongo } = options;
  const security = options.security ?? createSecurityPorts(config);
  const app = express();

  app.disable("x-powered-by");
  if (options.email) {
    app.locals.email = options.email;
  }
  app.use(corsMiddleware());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(correlationIdMiddleware());
  app.use(requestLoggerMiddleware(logger));
  app.use(securityContextMiddleware(security));

  const v1 = createV1Router({
    mongo,
    security,
    email: options.email,
    config,
    logger,
  });
  for (const router of options.additionalV1Routers ?? []) {
    v1.use(router);
  }
  app.use("/api/v1", v1);

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return { app, security };
}
