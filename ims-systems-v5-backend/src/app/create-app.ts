import express, { type Express, type Router } from "express";
import "../types/express-augmentation";
import type { AppConfig } from "../config";
import type { Logger } from "../infrastructure/logging/logger";
import type { MongoConnection } from "../infrastructure/mongodb/connection";
import { createEmailSystem, type EmailSystem } from "../infrastructure/queue";
import { createStripeClient } from "../infrastructure/stripe/create-stripe-client";
import {
  composeGoLiveSideEffects,
  createFilesBucketSideEffectsAdapter,
  createGoLiveNotifySideEffectsAdapter,
  type OrganisationGoLiveSideEffectsPort,
} from "../modules/organisation";
import { createOrganisationRepository } from "../modules/organisation/repositories/organisation.repository";
import {
  createStripeGoLiveSideEffectsAdapter,
  createStripePaymentService,
  createStripeWebhookRouter,
  type OrganisationBillingPort,
  type StripePaymentService,
} from "../modules/payments";
import {
  createSecurityPorts,
  type SecurityPorts,
  type Auth0AuthenticationApi,
} from "../security";
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
  /** Shared email/queue facade; defaults to createEmailSystem(config) when omitted. */
  email?: EmailSystem;
  /** Extra routers mounted under `/api/v1` (tests / temporary platform probes). */
  additionalV1Routers?: Router[];
  /** Test injection for Auth0 BFF Authentication API client. */
  auth0Api?: Auth0AuthenticationApi;
  /** Test injection: override Stripe payment service composition. */
  stripePayments?: StripePaymentService | null;
};

export type CreatedApp = {
  app: Express;
  security: SecurityPorts;
  /** Start optional background jobs; returns a stop function. */
  startBackgroundJobs?: () => () => void;
};

function composeBillingAndGoLive(deps: {
  config: AppConfig;
  logger: Logger;
  email: EmailSystem;
  stripePayments?: StripePaymentService | null;
}): {
  billing?: OrganisationBillingPort;
  goLiveSideEffects?: OrganisationGoLiveSideEffectsPort;
  stripePayments?: StripePaymentService;
} {
  const notify = createGoLiveNotifySideEffectsAdapter({
    email: deps.email,
    supportEmails: deps.config.REPORT_BUG_SUPPORT_EMAILS,
    logger: deps.logger,
  });
  // N-09: per-org file bucket provisioning (no-op unless FILES s3).
  const fileBuckets = createFilesBucketSideEffectsAdapter({
    config: deps.config,
    logger: deps.logger,
  });

  if (deps.stripePayments === null) {
    return {
      goLiveSideEffects: composeGoLiveSideEffects([notify, fileBuckets]),
    };
  }

  if (deps.stripePayments) {
    const organisations = createOrganisationRepository();
    const stripeGoLive = createStripeGoLiveSideEffectsAdapter({
      payments: deps.stripePayments,
      organisations,
      logger: deps.logger,
    });
    return {
      billing: deps.stripePayments,
      goLiveSideEffects: composeGoLiveSideEffects([stripeGoLive, notify, fileBuckets]),
      stripePayments: deps.stripePayments,
    };
  }

  if (!deps.config.STRIPE_ENABLED) {
    return {
      goLiveSideEffects: composeGoLiveSideEffects([notify, fileBuckets]),
    };
  }

  const organisations = createOrganisationRepository();
  const stripe = createStripeClient(deps.config);
  const payments = createStripePaymentService({
    stripe,
    config: deps.config,
    organisations,
    logger: deps.logger,
  });
  const stripeGoLive = createStripeGoLiveSideEffectsAdapter({
    payments,
    organisations,
    logger: deps.logger,
  });
  return {
    billing: payments,
    goLiveSideEffects: composeGoLiveSideEffects([stripeGoLive, notify, fileBuckets]),
    stripePayments: payments,
  };
}

/**
 * Compose the Express application (no listen / process lifecycle).
 */
export function createApp(options: CreateAppOptions): CreatedApp {
  const { config, logger, mongo } = options;
  const security = options.security ?? createSecurityPorts(config);
  // N-07: always wire EmailSystem so campaigns/report-bug never silently NoOp in boot.
  const email =
    options.email ?? createEmailSystem({ config, logger });
  const app = express();

  app.disable("x-powered-by");
  app.locals.email = email;
  app.use(corsMiddleware());
  app.use(correlationIdMiddleware());

  const billingWiring = composeBillingAndGoLive({
    config,
    logger,
    email,
    stripePayments: options.stripePayments,
  });

  // Stripe webhooks need the raw body for signature verification — before JSON parser.
  if (billingWiring.stripePayments) {
    app.use(
      "/api/v1/webhooks/stripe",
      express.raw({ type: "application/json" }),
      createStripeWebhookRouter(billingWiring.stripePayments)
    );
  }

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(requestLoggerMiddleware(logger));
  app.use(securityContextMiddleware(security));

  const v1 = createV1Router({
    mongo,
    security,
    email,
    config,
    logger,
    auth0Api: options.auth0Api,
    goLiveSideEffects: billingWiring.goLiveSideEffects,
    billing: billingWiring.billing,
  });
  for (const router of options.additionalV1Routers ?? []) {
    v1.router.use(router);
  }
  app.use("/api/v1", v1.router);

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return {
    app,
    security,
    startBackgroundJobs: v1.startBackgroundJobs,
  };
}
