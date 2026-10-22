import mongoose from "mongoose";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { createS3Client } from "../s3/object-storage";
import { createStripeClient } from "../stripe/create-stripe-client";
import { resolveProvisioningBucket } from "../../modules/organisation/adapters/files-bucket.adapter";
import type { AppConfig } from "../../config/env";

/**
 * Production / staging preflight (LIC-01, DEV_STUB_PRODUCTION_CUTOVER).
 *
 * `evaluateProdConfig` is pure config evaluation (unit-testable). The
 * connectivity probes in `runConnectivityChecks` verify Mongo, the Auth0
 * JWKS endpoint, the OpenFGA model, (optionally) a per-org S3 bucket,
 * Redis and Stripe test prices. Run via:
 *   pnpm preflight:prod [--offline] [--organization-id <id>]
 */

export type PreflightStatus = "pass" | "warn" | "fail";

export interface PreflightCheck {
  id: string;
  area: string;
  status: PreflightStatus;
  message: string;
}

const pass = (id: string, area: string, message: string): PreflightCheck => ({
  id,
  area,
  status: "pass",
  message,
});
const warn = (id: string, area: string, message: string): PreflightCheck => ({
  id,
  area,
  status: "warn",
  message,
});
const fail = (id: string, area: string, message: string): PreflightCheck => ({
  id,
  area,
  status: "fail",
  message,
});

export const evaluateProdConfig = (config: AppConfig): PreflightCheck[] => {
  const checks: PreflightCheck[] = [];
  const isProd = config.NODE_ENV === "production";

  checks.push(
    isProd
      ? pass("env.node-env", "environment", "NODE_ENV=production")
      : warn(
          "env.node-env",
          "environment",
          `NODE_ENV=${config.NODE_ENV} — use production for the real cutover (a staging run may keep development NODE_ENV only if every other check passes and Stripe/Auth0 are test tenants)`,
        ),
  );

  checks.push(
    config.SECURITY_PROVIDER === "auth0-openfga"
      ? pass(
          "security.provider",
          "security",
          "SECURITY_PROVIDER=auth0-openfga (dev stubs unwired)",
        )
      : fail(
          "security.provider",
          "security",
          `SECURITY_PROVIDER=${config.SECURITY_PROVIDER} — dev stubs (DevAll/AcceptAny/NoOp) must never run in staging/production`,
        ),
  );

  checks.push(
    config.AUTH0_DOMAIN && config.AUTH0_AUDIENCE
      ? pass("security.auth0", "security", `Auth0 domain ${config.AUTH0_DOMAIN}, audience set`)
      : fail("security.auth0", "security", "AUTH0_DOMAIN / AUTH0_AUDIENCE missing — login cannot work"),
  );
  checks.push(
    config.AUTH0_SPA_CLIENT_ID
      ? pass("security.auth0.spa", "security", "Auth0 SPA client id configured for the frontend")
      : warn(
          "security.auth0.spa",
          "security",
          "AUTH0_SPA_CLIENT_ID empty — frontend signup/change-password flows need the SPA client id",
        ),
  );

  checks.push(
    config.OPENFGA_API_URL && config.OPENFGA_STORE_ID && config.OPENFGA_MODEL_ID
      ? pass("security.openfga.config", "security", `OpenFGA ${config.OPENFGA_API_URL} store/model configured`)
      : fail(
          "security.openfga.config",
          "security",
          "OPENFGA_API_URL / OPENFGA_STORE_ID / OPENFGA_MODEL_ID missing — authorization fails closed",
        ),
  );

  checks.push(
    /^https:\/\//i.test(config.CLIENT_URL)
      ? pass("app.client-url", "app", `CLIENT_URL=${config.CLIENT_URL}`)
      : fail(
          "app.client-url",
          "app",
          `CLIENT_URL=${config.CLIENT_URL} — must be the public https frontend origin (email links, billing redirects)`,
        ),
  );

  // Billing (LIC-01)
  if (!config.STRIPE_ENABLED) {
    checks.push(
      warn(
        "billing.enabled",
        "billing",
        "STRIPE_ENABLED=false — Go Live checkout unavailable (acceptable only for a non-billing staging)",
      ),
    );
  } else {
    const key = config.STRIPE_PRIVATE_KEY ?? "";
    checks.push(
      key.startsWith("sk_test_")
        ? pass("billing.key-mode", "billing", "Stripe TEST-mode key — safe for the staging smoke")
        : key.startsWith("sk_live_")
          ? warn(
              "billing.key-mode",
              "billing",
              "Stripe LIVE key in use — only expected for the real production cutover, not staging",
            )
          : fail("billing.key-mode", "billing", "STRIPE_PRIVATE_KEY is neither sk_test_ nor sk_live_"),
    );
    checks.push(
      config.STRIPE_WEBHOOK_SECRET
        ? pass("billing.webhook", "billing", "Stripe webhook secret set (checkout completion drives Go Live)")
        : fail(
            "billing.webhook",
            "billing",
            "STRIPE_WEBHOOK_SECRET missing — paid checkouts will not activate organisations",
          ),
    );
  }

  // Email
  if (!config.EMAIL_ENABLED) {
    checks.push(
      fail(
        "email.enabled",
        "email",
        "EMAIL_ENABLED=false — invitations, signature requests and audit reports will not be delivered",
      ),
    );
  } else if (config.EMAIL_PROVIDER === "logging") {
    checks.push(
      fail(
        "email.provider",
        "email",
        "EMAIL_PROVIDER=logging — mail is only written to logs, never delivered",
      ),
    );
  } else if (config.EMAIL_PROVIDER === "mailtrap") {
    checks.push(
      warn(
        "email.provider",
        "email",
        "EMAIL_PROVIDER=mailtrap — staging inbox only; switch to sendgrid for production",
      ),
    );
  } else {
    checks.push(pass("email.provider", "email", "EMAIL_PROVIDER=sendgrid"));
  }
  if (config.EMAIL_ENABLED) {
    checks.push(
      config.EMAIL_QUEUE_ENABLED
        ? pass(
            "email.queue",
            "email",
            "Email queue enabled (run pnpm worker:email or EMAIL_WORKER_IN_API=true)",
          )
        : warn(
            "email.queue",
            "email",
            "EMAIL_QUEUE_ENABLED=false — mail sends inline with requests (no retries)",
          ),
    );
  }

  // Files
  if (!config.FILES_ENABLED) {
    checks.push(fail("files.enabled", "files", "FILES_ENABLED=false — documents/avatars cannot upload"));
  } else if (config.FILES_PROVIDER !== "s3") {
    checks.push(
      fail(
        "files.provider",
        "files",
        `FILES_PROVIDER=${config.FILES_PROVIDER} — staging/production must use s3`,
      ),
    );
  } else {
    checks.push(pass("files.provider", "files", "FILES_PROVIDER=s3"));
    checks.push(
      config.AWS_BUCKET_SUFFIX.trim()
        ? pass(
            "files.bucket-suffix",
            "files",
            `Per-org buckets enabled (${config.AWS_BUCKET_SUFFIX.trim()}); org buckets auto-provision at create/Go Live`,
          )
        : fail(
            "files.bucket-suffix",
            "files",
            "AWS_BUCKET_SUFFIX empty — uploads fall back to a shared bucket, so per-organisation file isolation cannot be guaranteed",
          ),
    );
    const clientOrigin = config.CLIENT_URL.replace(/\/$/, "");
    checks.push(
      config.FILES_CORS_ORIGINS.some((o) => o.replace(/\/$/, "") === clientOrigin)
        ? pass("files.cors", "files", "FILES_CORS_ORIGINS includes CLIENT_URL (browser presigned uploads allowed)")
        : warn(
            "files.cors",
            "files",
            `FILES_CORS_ORIGINS (${config.FILES_CORS_ORIGINS.join(", ") || "empty"}) does not include CLIENT_URL — browser uploads may fail CORS`,
          ),
    );
  }

  checks.push(
    /localhost|127\.0\.0\.1/.test(config.MONGODB_URI)
      ? warn("mongo.uri", "data", "MONGODB_URI points at localhost — fine for local staging only")
      : pass("mongo.uri", "data", "MONGODB_URI points at a remote host"),
  );

  return checks;
};

export interface ConnectivityOptions {
  organizationId?: string;
  timeoutMs?: number;
}

export const runConnectivityChecks = async (
  config: AppConfig,
  options: ConnectivityOptions = {},
): Promise<PreflightCheck[]> => {
  const checks: PreflightCheck[] = [];
  const timeoutMs = options.timeoutMs ?? 8000;

  // Mongo
  try {
    const conn = await mongoose
      .createConnection(config.MONGODB_URI, { serverSelectionTimeoutMS: timeoutMs })
      .asPromise();
    await conn.db?.admin().ping();
    await conn.close();
    checks.push(pass("net.mongo", "data", "MongoDB reachable (ping ok)"));
  } catch (error) {
    checks.push(
      fail("net.mongo", "data", `MongoDB unreachable: ${error instanceof Error ? error.message : String(error)}`),
    );
  }

  // Auth0 JWKS
  const issuer = config.AUTH0_ISSUER.trim()
    ? config.AUTH0_ISSUER
    : config.AUTH0_DOMAIN.trim()
      ? `https://${config.AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "")}/`
      : "";
  if (issuer) {
    try {
      const url = `${issuer.replace(/\/$/, "")}/.well-known/jwks.json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      checks.push(
        res.ok
          ? pass("net.auth0-jwks", "security", `Auth0 JWKS reachable (${url})`)
          : fail("net.auth0-jwks", "security", `Auth0 JWKS returned HTTP ${res.status}`),
      );
    } catch (error) {
      checks.push(
        fail("net.auth0-jwks", "security", `Auth0 JWKS unreachable: ${error instanceof Error ? error.message : String(error)}`),
      );
    }
  }

  // OpenFGA model read
  if (config.OPENFGA_API_URL && config.OPENFGA_STORE_ID && config.OPENFGA_MODEL_ID) {
    try {
      const base = config.OPENFGA_API_URL.replace(/\/$/, "");
      const url = `${base}/stores/${config.OPENFGA_STORE_ID}/authorization-models/${config.OPENFGA_MODEL_ID}`;
      const res = await fetch(url, {
        headers: config.OPENFGA_API_TOKEN
          ? { Authorization: `Bearer ${config.OPENFGA_API_TOKEN}` }
          : {},
        signal: AbortSignal.timeout(timeoutMs),
      });
      checks.push(
        res.ok
          ? pass("net.openfga-model", "security", "OpenFGA store + authorization model readable")
          : fail(
              "net.openfga-model",
              "security",
              `OpenFGA model read returned HTTP ${res.status} (store/model id or token wrong) — authorization would fail closed`,
            ),
      );
    } catch (error) {
      checks.push(
        fail("net.openfga-model", "security", `OpenFGA unreachable: ${error instanceof Error ? error.message : String(error)}`),
      );
    }
  }

  // S3 bucket
  if (config.FILES_ENABLED && config.FILES_PROVIDER === "s3") {
    const bucket = options.organizationId
      ? resolveProvisioningBucket(config, options.organizationId)
      : config.AWS_PRIVATE_BUCKET.trim() || null;
    if (!bucket) {
      checks.push(
        warn(
          "net.s3-bucket",
          "files",
          "No bucket to probe (pass --organization-id <id> to check its per-org bucket, or set AWS_PRIVATE_BUCKET)",
        ),
      );
    } else {
      try {
        const client = createS3Client({
          region: config.AWS_REGION,
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        });
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        checks.push(pass("net.s3-bucket", "files", `S3 bucket ${bucket} reachable`));
      } catch (error) {
        checks.push(
          fail(
            "net.s3-bucket",
            "files",
            `S3 bucket ${bucket} check failed: ${error instanceof Error ? error.message : String(error)} (provision via org create/Go Live auto-provision or pnpm provision:files-buckets)`,
          ),
        );
      }
    }
  }

  // Redis when the email queue is on
  if (config.EMAIL_ENABLED && config.EMAIL_QUEUE_ENABLED) {
    try {
      const { default: Redis } = await import("ioredis");
      const redis = new Redis(config.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: timeoutMs,
        maxRetriesPerRequest: 0,
      });
      try {
        await redis.connect();
        await redis.ping();
        checks.push(pass("net.redis", "email", "Redis reachable (email queue)"));
      } finally {
        redis.disconnect();
      }
    } catch (error) {
      checks.push(
        fail("net.redis", "email", `Redis unreachable but EMAIL_QUEUE_ENABLED=true: ${error instanceof Error ? error.message : String(error)}`),
      );
    }
  }

  // Stripe test prices resolve in test mode
  if (config.STRIPE_ENABLED && config.STRIPE_PRIVATE_KEY.startsWith("sk_test_")) {
    try {
      const stripe = createStripeClient(config);
      const priceIds = [
        config.STRIPE_BU_PRICE,
        config.STRIPE_SA_PRICE,
        config.STRIPE_USER_PRICE,
        config.STRIPE_COMPLIANCE_PRICE,
        config.STRIPE_ADD_MODULE_PRICE,
        config.STRIPE_SUPPORT_PRICE,
      ].filter(Boolean);
      const sample = priceIds.slice(0, 3);
      for (const id of sample) await stripe.prices.retrieve(id);
      checks.push(
        pass("net.stripe-prices", "billing", `Stripe test-mode reachable; sampled ${sample.length} configured price(s) resolve`),
      );
    } catch (error) {
      checks.push(
        fail("net.stripe-prices", "billing", `Stripe price lookup failed: ${error instanceof Error ? error.message : String(error)}`),
      );
    }
  }

  return checks;
};

export const summarizePreflight = (checks: PreflightCheck[]) => ({
  pass: checks.filter((c) => c.status === "pass").length,
  warn: checks.filter((c) => c.status === "warn").length,
  fail: checks.filter((c) => c.status === "fail").length,
});
