import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";
import {
  evaluateProdConfig,
  summarizePreflight,
} from "../src/infrastructure/preflight/prod-preflight";

const prodFixture = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb+srv://cluster.example.net/ims",
  SECURITY_PROVIDER: "auth0-openfga",
  AUTH0_DOMAIN: "staging-tenant.eu.auth0.com",
  AUTH0_AUDIENCE: "https://api.ims.example",
  AUTH0_SPA_CLIENT_ID: "spa-client-id",
  OPENFGA_API_URL: "https://api.openfga.example",
  OPENFGA_STORE_ID: "01-store",
  OPENFGA_MODEL_ID: "01-model",
  CLIENT_URL: "https://staging.ims.example",
  STRIPE_ENABLED: "true",
  STRIPE_PRIVATE_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  STRIPE_BU_PRICE: "price_bu",
  STRIPE_SA_PRICE: "price_sa",
  STRIPE_USER_PRICE: "price_user",
  STRIPE_COMPLIANCE_PRICE: "price_comp",
  STRIPE_ADD_MODULE_PRICE: "price_mod",
  STRIPE_SUPPORT_PRICE: "price_sup",
  EMAIL_ENABLED: "true",
  EMAIL_PROVIDER: "sendgrid",
  SENDGRID_API_KEY: "SG.test",
  MAIL_FROM: "no-reply@ims.example",
  FILES_ENABLED: "true",
  FILES_PROVIDER: "s3",
  AWS_ACCESS_KEY_ID: "AKIA-test",
  AWS_SECRET_ACCESS_KEY: "secret",
  AWS_BUCKET_SUFFIX: "-ims-staging",
  FILES_CORS_ORIGINS: "https://staging.ims.example",
};

const byId = (checks: ReturnType<typeof evaluateProdConfig>, id: string) =>
  checks.find((c) => c.id === id);

describe("evaluateProdConfig", () => {
  it("passes a full production fixture with zero fails", () => {
    const checks = evaluateProdConfig(loadConfig(prodFixture));
    expect(checks.filter((c) => c.status === "fail")).toEqual([]);
    expect(byId(checks, "security.provider")?.status).toBe("pass");
    expect(byId(checks, "billing.key-mode")?.status).toBe("pass");
    expect(byId(checks, "files.bucket-suffix")?.status).toBe("pass");
  });

  it("fails on the development stub provider", () => {
    const checks = evaluateProdConfig(
      loadConfig({
        NODE_ENV: "development",
        MONGODB_URI: "mongodb://127.0.0.1:27017/ims",
        SECURITY_PROVIDER: "development-stub",
      }),
    );
    expect(byId(checks, "security.provider")?.status).toBe("fail");
    expect(summarizePreflight(checks).fail).toBeGreaterThan(0);
  });

  it("fails when email is disabled (invitations/reports would not deliver)", () => {
    const checks = evaluateProdConfig(
      loadConfig({ ...prodFixture, EMAIL_ENABLED: "false" }),
    );
    expect(byId(checks, "email.enabled")?.status).toBe("fail");
  });

  it("warns on a live Stripe key (staging must use test mode)", () => {
    const checks = evaluateProdConfig(
      loadConfig({ ...prodFixture, STRIPE_PRIVATE_KEY: "sk_live_123" }),
    );
    expect(byId(checks, "billing.key-mode")?.status).toBe("warn");
  });

  it("fails when files fall back to a shared bucket (no suffix)", () => {
    const checks = evaluateProdConfig(
      loadConfig({ ...prodFixture, AWS_BUCKET_SUFFIX: "", AWS_PRIVATE_BUCKET: "shared" }),
    );
    expect(byId(checks, "files.bucket-suffix")?.status).toBe("fail");
  });

  it("fails on a non-https CLIENT_URL", () => {
    const checks = evaluateProdConfig(
      loadConfig({ ...prodFixture, CLIENT_URL: "http://staging.ims.example" }),
    );
    expect(byId(checks, "app.client-url")?.status).toBe("fail");
  });
});
