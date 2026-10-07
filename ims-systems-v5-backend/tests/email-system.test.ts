import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config";
import { createLogger } from "../src/infrastructure/logging/logger";
import { createEmailTransport } from "../src/infrastructure/email";
import {
  createEmailSystem,
  emailJobDataSchema,
  QUEUE_NAMES,
} from "../src/infrastructure/queue";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("email job schema", () => {
  it("accepts a transactional raw payload", () => {
    const parsed = emailJobDataSchema.parse({
      to: "ada@demo.local",
      subject: "Welcome",
      html: "<p>Hello</p>",
      category: "notification",
    });
    expect(parsed.kind).toBe("raw");
    expect(parsed.category).toBe("notification");
  });

  it("rejects invalid recipients", () => {
    expect(() =>
      emailJobDataSchema.parse({
        to: "not-an-email",
        subject: "X",
        html: "<p>x</p>",
      })
    ).toThrow();
  });
});

describe("createEmailSystem", () => {
  const baseEnv = {
    NODE_ENV: "test",
    PORT: "3001",
    MONGODB_URI: "mongodb://127.0.0.1:27017/ims_v5_test",
    LOG_LEVEL: "silent",
    SECURITY_PROVIDER: "development-stub",
    REDIS_URL: "redis://127.0.0.1:6379",
    EMAIL_ENABLED: "false",
    EMAIL_PROVIDER: "logging",
    EMAIL_QUEUE_ENABLED: "false",
    EMAIL_WORKER_IN_API: "false",
  };

  it("returns disabled mode when EMAIL_ENABLED=false", async () => {
    const config = loadConfig(baseEnv);
    const logger = createLogger({ level: "silent" });
    const email = createEmailSystem({ config, logger });

    const result = await email.sendTransactional({
      to: "ada@demo.local",
      subject: "Hello",
      html: "<p>Hi</p>",
      category: "notification",
    });

    expect(result.mode).toBe("disabled");
    await email.close();
  });

  it("sends directly via logging transport when queue is disabled", async () => {
    const config = loadConfig({
      ...baseEnv,
      EMAIL_ENABLED: "true",
      EMAIL_PROVIDER: "logging",
      EMAIL_QUEUE_ENABLED: "false",
    });
    const logger = createLogger({ level: "silent" });
    const email = createEmailSystem({ config, logger });

    const result = await email.sendTransactional({
      to: "ada@demo.local",
      subject: "Hello",
      html: "<p>Hi</p>",
      category: "transactional",
    });

    expect(result.mode).toBe("direct");
    expect(result.result?.provider).toBe("logging");
    expect(result.result?.accepted).toEqual(["ada@demo.local"]);
    await email.close();
  });

  it("uses bulk category defaults on sendBulk", async () => {
    const config = loadConfig({
      ...baseEnv,
      EMAIL_ENABLED: "true",
      EMAIL_QUEUE_ENABLED: "false",
    });
    const logger = createLogger({ level: "silent" });
    const email = createEmailSystem({ config, logger });
    const sendSpy = vi.spyOn(email.transport, "send");

    await email.sendBulk({
      to: ["a@demo.local", "b@demo.local"],
      subject: "Update",
      html: "<p>News</p>",
    });

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "bulk",
        subject: "Update",
      })
    );
    await email.close();
  });
});

describe("email config validation", () => {
  it("requires Mailtrap credentials when enabled with mailtrap provider", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        PORT: "3001",
        MONGODB_URI: "mongodb://127.0.0.1:27017/ims_v5_dev",
        LOG_LEVEL: "info",
        SECURITY_PROVIDER: "development-stub",
        EMAIL_ENABLED: "true",
        EMAIL_PROVIDER: "mailtrap",
        MAILTRAP_USER: "",
        MAILTRAP_PASS: "",
        MAIL_FROM: "",
      })
    ).toThrow(/MAILTRAP_USER|MAILTRAP_PASS|MAIL_FROM/);
  });

  it("accepts mailtrap config when credentials are present", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      PORT: "3001",
      MONGODB_URI: "mongodb://127.0.0.1:27017/ims_v5_dev",
      LOG_LEVEL: "info",
      SECURITY_PROVIDER: "development-stub",
      EMAIL_ENABLED: "true",
      EMAIL_PROVIDER: "mailtrap",
      MAILTRAP_USER: "trap-user",
      MAILTRAP_PASS: "trap-pass",
      MAIL_FROM: "hello@imssystems.tech",
      EMAIL_QUEUE_ENABLED: "false",
    });
    expect(config.EMAIL_PROVIDER).toBe("mailtrap");
    expect(config.MAILTRAP_HOST).toBe("sandbox.smtp.mailtrap.io");
    expect(config.MAILTRAP_PORT).toBe(2525);
  });

  it("requires SendGrid credentials when enabled with sendgrid provider", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        PORT: "3001",
        MONGODB_URI: "mongodb://127.0.0.1:27017/ims_v5_dev",
        LOG_LEVEL: "info",
        SECURITY_PROVIDER: "development-stub",
        EMAIL_ENABLED: "true",
        EMAIL_PROVIDER: "sendgrid",
        SENDGRID_API_KEY: "",
        MAIL_FROM: "",
      })
    ).toThrow(/SENDGRID_API_KEY|MAIL_FROM/);
  });
});

describe("createEmailTransport", () => {
  it("forces logging transport when email is disabled", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      PORT: "3001",
      MONGODB_URI: "mongodb://127.0.0.1:27017/ims_v5_test",
      LOG_LEVEL: "silent",
      SECURITY_PROVIDER: "development-stub",
      EMAIL_ENABLED: "false",
      EMAIL_PROVIDER: "mailtrap",
      MAILTRAP_USER: "u",
      MAILTRAP_PASS: "p",
      MAIL_FROM: "hello@imssystems.tech",
    });
    const transport = createEmailTransport(
      config,
      createLogger({ level: "silent" })
    );
    expect(transport.name).toBe("logging");
  });

  it("selects mailtrap transport when enabled", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      PORT: "3001",
      MONGODB_URI: "mongodb://127.0.0.1:27017/ims_v5_dev",
      LOG_LEVEL: "silent",
      SECURITY_PROVIDER: "development-stub",
      EMAIL_ENABLED: "true",
      EMAIL_PROVIDER: "mailtrap",
      MAILTRAP_USER: "u",
      MAILTRAP_PASS: "p",
      MAIL_FROM: "hello@imssystems.tech",
    });
    const transport = createEmailTransport(
      config,
      createLogger({ level: "silent" })
    );
    expect(transport.name).toBe("mailtrap");
  });
});

describe("queue names", () => {
  it("keeps stable queue identifiers", () => {
    expect(QUEUE_NAMES.emailTransactional).toBe("email-transactional");
    expect(QUEUE_NAMES.emailBulk).toBe("email-bulk");
  });
});
