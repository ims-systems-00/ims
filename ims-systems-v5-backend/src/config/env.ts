import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]);
const logLevelSchema = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);
const securityProviderSchema = z.enum(["development-stub"]);
const emailProviderSchema = z.enum(["mailtrap", "sendgrid", "logging"]);
const filesProviderSchema = z.enum(["s3", "memory"]);
const booleanFromEnv = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((value) => value === true || value === "true" || value === "1");

function requireMailFrom(
  value: { MAIL_FROM: string },
  ctx: z.RefinementCtx
): void {
  if (!value.MAIL_FROM?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["MAIL_FROM"],
      message: "MAIL_FROM is required when EMAIL_ENABLED=true for this provider",
    });
  } else if (!z.string().email().safeParse(value.MAIL_FROM).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["MAIL_FROM"],
      message: "MAIL_FROM must be a valid email address",
    });
  }
}

const envSchema = z
  .object({
    NODE_ENV: nodeEnvSchema.default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    MONGODB_URI: z
      .string()
      .min(1, "MONGODB_URI is required")
      .refine(
        (uri) => uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://"),
        "MONGODB_URI must be a mongodb:// or mongodb+srv:// connection string"
      ),
    LOG_LEVEL: logLevelSchema.default("info"),
    SECURITY_PROVIDER: securityProviderSchema.default("development-stub"),

    /** Redis connection used by BullMQ email queues. */
    REDIS_URL: z
      .string()
      .default("redis://127.0.0.1:6379")
      .refine(
        (uri) => uri.startsWith("redis://") || uri.startsWith("rediss://"),
        "REDIS_URL must be a redis:// or rediss:// connection string"
      ),

    /**
     * When false, enqueue helpers resolve without delivering mail
     * (useful for tests / local work without a provider).
     */
    EMAIL_ENABLED: booleanFromEnv.default(false),

    /**
     * Transport implementation.
     * - mailtrap: SMTP to Mailtrap inbox (recommended for local/dev)
     * - sendgrid: SendGrid API (production path)
     * - logging: writes intended mail to the logger (never sends)
     */
    EMAIL_PROVIDER: emailProviderSchema.default("logging"),

    SENDGRID_API_KEY: z.string().default(""),

    /** Mailtrap SMTP credentials (Email Testing → Inbox → SMTP Settings). */
    MAILTRAP_HOST: z.string().default("sandbox.smtp.mailtrap.io"),
    MAILTRAP_PORT: z.coerce.number().int().positive().default(2525),
    MAILTRAP_USER: z.string().default(""),
    MAILTRAP_PASS: z.string().default(""),

    MAIL_FROM: z.string().default(""),
    MAIL_FROM_NAME: z.string().min(1).default("iMS Systems"),

    /**
     * Comma-separated support inbox list for Report Bug forwards.
     * Example: support@imssystems.tech,ops@imssystems.tech
     */
    REPORT_BUG_SUPPORT_EMAILS: z
      .string()
      .default("support@imssystems.tech")
      .transform((value) =>
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      )
      .pipe(z.array(z.string().email()).min(1)),

    /**
     * When true, mail is enqueued on BullMQ (requires Redis).
     * When false, mail is handed to the transport immediately in-process.
     */
    EMAIL_QUEUE_ENABLED: booleanFromEnv.default(false),

    /**
     * When true, the API process also runs email workers.
     * Prefer a dedicated `pnpm worker:email` process in production.
     */
    EMAIL_WORKER_IN_API: booleanFromEnv.default(false),

    /** Max concurrent jobs for the transactional email worker. */
    EMAIL_TRANSACTIONAL_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive()
      .default(5),

    /** Max concurrent jobs for the bulk email worker. */
    EMAIL_BULK_CONCURRENCY: z.coerce.number().int().positive().default(2),

    /**
     * Bulk send rate limit (BullMQ worker limiter).
     * Example: 30 emails / 60_000ms.
     */
    EMAIL_BULK_RATE_MAX: z.coerce.number().int().positive().default(30),
    EMAIL_BULK_RATE_DURATION_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),

    /**
     * File Handler / S3.
     * When FILES_ENABLED=false, upload/view/delete endpoints reject with a clear error
     * unless FILES_PROVIDER=memory (tests / local without AWS).
     */
    FILES_ENABLED: booleanFromEnv.default(false),
    FILES_PROVIDER: filesProviderSchema.default("memory"),

    AWS_REGION: z.string().default("eu-west-2"),
    /** Prefer standard names; AWS_ID/AWS_SECRET also accepted via process aliases in .env docs. */
    AWS_ACCESS_KEY_ID: z.string().default(""),
    AWS_SECRET_ACCESS_KEY: z.string().default(""),
    /** Private/shared bucket used outside production (V4: AWS_TEST_BUCKET_NAME). */
    AWS_PRIVATE_BUCKET: z.string().default(""),
    /**
     * Production private bucket suffix (V4: AWS_BUCKET_NAME).
     * Final bucket = `${organizationId}${AWS_BUCKET_SUFFIX}`.
     */
    AWS_BUCKET_SUFFIX: z.string().default(""),
    /** Public/media bucket (logos, avatars). Optional. V4: AWS_PUBLIC_BUCKET_NAME. */
    AWS_PUBLIC_BUCKET: z.string().default(""),

    /** Upload signed URL TTL (seconds). V4 default ~3h. */
    FILES_UPLOAD_URL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(10_800),
    /** View/download signed URL TTL (seconds). V4 default ~12h. */
    FILES_VIEW_URL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(43_200),

    /**
     * Comma-separated allowed upload path prefixes (x-file-path).
     * Empty = any non-empty path allowed (sanitized).
     */
    ALLOWED_FILE_PATHS: z
      .string()
      .default(
        "agenda,audit_attachments,contract,inventory_software_attachments,minutes,sla,general,onboarding,isoEvidence,profile,cqcReport,cqcEvidence,risks,cips,tasks,incidents,crms,staffwallet"
      )
      .transform((value) =>
        value
          .split(",")
          .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
          .filter(Boolean)
      ),
  })
  .superRefine((value, ctx) => {
    if (
      value.NODE_ENV === "production" &&
      value.SECURITY_PROVIDER === "development-stub"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SECURITY_PROVIDER"],
        message:
          "SECURITY_PROVIDER=development-stub is not allowed when NODE_ENV=production",
      });
    }

    if (value.EMAIL_ENABLED && value.EMAIL_PROVIDER === "mailtrap") {
      if (!value.MAILTRAP_USER?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MAILTRAP_USER"],
          message:
            "MAILTRAP_USER is required when EMAIL_ENABLED=true and EMAIL_PROVIDER=mailtrap",
        });
      }
      if (!value.MAILTRAP_PASS?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MAILTRAP_PASS"],
          message:
            "MAILTRAP_PASS is required when EMAIL_ENABLED=true and EMAIL_PROVIDER=mailtrap",
        });
      }
      requireMailFrom(value, ctx);
    }

    if (value.EMAIL_ENABLED && value.EMAIL_PROVIDER === "sendgrid") {
      if (!value.SENDGRID_API_KEY?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SENDGRID_API_KEY"],
          message:
            "SENDGRID_API_KEY is required when EMAIL_ENABLED=true and EMAIL_PROVIDER=sendgrid",
        });
      }
      requireMailFrom(value, ctx);
    }

    if (
      value.EMAIL_ENABLED &&
      value.EMAIL_QUEUE_ENABLED &&
      !value.REDIS_URL?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["REDIS_URL"],
        message:
          "REDIS_URL is required when EMAIL_ENABLED=true and EMAIL_QUEUE_ENABLED=true",
      });
    }

    if (value.FILES_ENABLED && value.FILES_PROVIDER === "s3") {
      if (!value.AWS_ACCESS_KEY_ID?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AWS_ACCESS_KEY_ID"],
          message:
            "AWS_ACCESS_KEY_ID is required when FILES_ENABLED=true and FILES_PROVIDER=s3",
        });
      }
      if (!value.AWS_SECRET_ACCESS_KEY?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AWS_SECRET_ACCESS_KEY"],
          message:
            "AWS_SECRET_ACCESS_KEY is required when FILES_ENABLED=true and FILES_PROVIDER=s3",
        });
      }
      if (
        !value.AWS_PRIVATE_BUCKET?.trim() &&
        !value.AWS_BUCKET_SUFFIX?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AWS_PRIVATE_BUCKET"],
          message:
            "AWS_PRIVATE_BUCKET (or AWS_BUCKET_SUFFIX for production) is required when FILES_ENABLED=true and FILES_PROVIDER=s3",
        });
      }
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

export type EnvSource = Record<string, string | undefined>;

export function loadConfig(env: EnvSource = process.env): AppConfig {
  const normalized: EnvSource = {
    ...env,
    AWS_ACCESS_KEY_ID:
      env.AWS_ACCESS_KEY_ID || env.AWS_ID || env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY:
      env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET || env.AWS_SECRET_ACCESS_KEY,
    AWS_PRIVATE_BUCKET:
      env.AWS_PRIVATE_BUCKET ||
      env.AWS_TEST_BUCKET_NAME ||
      env.AWS_PRIVATE_BUCKET,
    AWS_BUCKET_SUFFIX:
      env.AWS_BUCKET_SUFFIX || env.AWS_BUCKET_NAME || env.AWS_BUCKET_SUFFIX,
    AWS_PUBLIC_BUCKET:
      env.AWS_PUBLIC_BUCKET ||
      env.AWS_PUBLIC_BUCKET_NAME ||
      env.AWS_PUBLIC_BUCKET,
  };
  const result = envSchema.safeParse(normalized);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }
  return result.data;
}
