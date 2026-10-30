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
const securityProviderSchema = z.enum(["development-stub", "auth0-openfga"]);
const emailProviderSchema = z.enum(["mailtrap", "sendgrid", "logging"]);
const filesProviderSchema = z.enum(["s3", "memory", "local"]);
const aiProviderSchema = z.enum(["openai", "groq"]);
const booleanFromEnv = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((value) => value === true || value === "true" || value === "1");

function requireNonEmpty(
  value: string | undefined,
  path: string,
  message: string,
  ctx: z.RefinementCtx
): void {
  if (!value?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message,
    });
  }
}

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
    /**
     * development-stub — local/test only (forbidden in production).
     * auth0-openfga — Auth0 JWT AuthN + OpenFGA AuthZ (adapters land in rollout M3/M6).
     */
    SECURITY_PROVIDER: securityProviderSchema.default("development-stub"),

    /** Auth0 API / tenant (required when SECURITY_PROVIDER=auth0-openfga). */
    AUTH0_DOMAIN: z.string().default(""),
    AUTH0_AUDIENCE: z.string().default(""),
    /**
     * Issuer URL for JWT validation. Empty = derived as `https://${AUTH0_DOMAIN}/`.
     */
    AUTH0_ISSUER: z.string().default(""),

    /**
     * Auth0 Database connection name for embedded signup / password grant / reset.
     * Example: Username-Password-Authentication
     */
    AUTH0_DB_CONNECTION: z.string().default("Username-Password-Authentication"),
    /**
     * Public SPA client id used for Auth0 dbconnections/signup + change_password.
     * Never expose a client secret via VITE_*.
     */
    AUTH0_SPA_CLIENT_ID: z.string().default(""),
    /**
     * Confidential app (Password + Refresh Token grants) for Resource Owner Password.
     * Client secret is backend-only.
     */
    AUTH0_ROPG_CLIENT_ID: z.string().default(""),
    AUTH0_ROPG_CLIENT_SECRET: z.string().default(""),

    /**
     * Machine-to-Machine app authorized for the Auth0 Management API.
     * Unlocks session revocation (N-13) and Auth0 Organization
     * provisioning at Go Live (N-09). Optional until configured;
     * preflight warns when absent under auth0-openfga.
     */
    AUTH0_MGMT_CLIENT_ID: z.string().default(""),
    AUTH0_MGMT_CLIENT_SECRET: z.string().default(""),

    /** OpenFGA store (required when SECURITY_PROVIDER=auth0-openfga). */
    OPENFGA_API_URL: z.string().default(""),
    OPENFGA_STORE_ID: z.string().default(""),
    OPENFGA_MODEL_ID: z.string().default(""),
    /** Optional API token / client credentials depending on deployment. */
    OPENFGA_API_TOKEN: z.string().default(""),

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
     * Comma-separated internal inboxes for Contact IMS enquiries
     * (demo booking + get started). Empty disables submissions.
     */
    CONTACT_IMS_SUPPORT_EMAILS: z
      .string()
      .default("support@imssystems.tech")
      .transform((value) =>
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      )
      .pipe(z.array(z.string().email())),

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

    /** Max single-file upload size in bytes (default 25 MiB). */
    FILES_MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(26_214_400),

    /**
     * Comma-separated browser origins allowed by S3 CORS (used by the
     * bucket provisioning script; presigned browser PUT/GET needs this).
     */
    FILES_CORS_ORIGINS: z
      .string()
      .default("http://localhost:3000,http://localhost:7864")
      .transform((value) =>
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      )
      .pipe(z.array(z.string().url()).min(1)),

    /** Local disk provider: directory for stored objects (demo / dev without AWS). */
    FILES_LOCAL_ROOT: z.string().default(".local-files"),
    /**
     * Public base URL for local signed object GET/PUT (no trailing slash).
     * Default uses PORT on localhost.
     */
    FILES_LOCAL_PUBLIC_BASE_URL: z.string().default(""),
    /** HMAC secret for local signed URLs. Use a strong value outside development. */
    FILES_LOCAL_SIGNING_SECRET: z
      .string()
      .default("dev-local-files-signing-secret"),

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

    /**
     * Stripe billing (see docs/module-specifications/stripe-payments.md).
     * When false, Go Live / org billing keep no-op adapters (safe default).
     */
    STRIPE_ENABLED: booleanFromEnv.default(false),
    STRIPE_PRIVATE_KEY: z.string().default(""),
    STRIPE_WEBHOOK_SECRET: z.string().default(""),
    STRIPE_BU_PRICE: z.string().default(""),
    STRIPE_SA_PRICE: z.string().default(""),
    STRIPE_USER_PRICE: z.string().default(""),
    STRIPE_COMPLIANCE_PRICE: z.string().default(""),
    STRIPE_ADD_MODULE_PRICE: z.string().default(""),
    STRIPE_SUPPORT_PRICE: z.string().default(""),
    /** FE origin for Checkout success/cancel and Billing Portal return. */
    CLIENT_URL: z.string().default("http://localhost:3000"),

    /**
     * Alice LLM provider.
     * - openai — production default (OPEN_AI_API_KEY + OPEN_AI_MODEL)
     * - groq — local/dev OpenAI-compatible API (GROQ_API_KEY + GROQ_MODEL)
     */
    AI_PROVIDER: aiProviderSchema.default("openai"),
    /**
     * OpenAI API key for Alice (Analytical Assistant).
     * Empty when AI_PROVIDER=openai → GPT endpoints use NoOp (HTTP 503).
     * Env name matches V4: OPEN_AI_API_KEY.
     */
    OPEN_AI_API_KEY: z.string().default(""),
    /** Chat model when AI_PROVIDER=openai (gpt-3.5-turbo is deprecated). */
    OPEN_AI_MODEL: z.string().default("gpt-4o-mini"),
    /** Groq API key when AI_PROVIDER=groq. */
    GROQ_API_KEY: z.string().default(""),
    /** Chat model when AI_PROVIDER=groq. */
    GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),

    /**
     * OnlyOffice Document Server (Document Management in-preview Office edit).
     * When ONLYOFFICE_ENABLED=false, editor-session endpoints reject clearly.
     */
    ONLYOFFICE_ENABLED: booleanFromEnv.default(false),
    /** Browser-facing Document Server origin (no trailing slash), e.g. http://localhost:8088 */
    ONLYOFFICE_URL: z.string().default(""),
    /** Shared HS256 secret with Document Server JWT_SECRET. */
    ONLYOFFICE_JWT_SECRET: z.string().default("dev-onlyoffice-jwt-secret"),
    /**
     * API base URL reachable by the Document Server for editor callbacks
     * (no trailing slash), e.g. http://host.docker.internal:3001/api/v1
     */
    ONLYOFFICE_CALLBACK_BASE_URL: z.string().default(""),
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
    if (value.NODE_ENV === "production" && value.AI_PROVIDER === "groq") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_PROVIDER"],
        message:
          "AI_PROVIDER=groq is not allowed when NODE_ENV=production (use openai)",
      });
    }

    if (value.ONLYOFFICE_ENABLED) {
      requireNonEmpty(
        value.ONLYOFFICE_URL,
        "ONLYOFFICE_URL",
        "ONLYOFFICE_URL is required when ONLYOFFICE_ENABLED=true",
        ctx
      );
      requireNonEmpty(
        value.ONLYOFFICE_CALLBACK_BASE_URL,
        "ONLYOFFICE_CALLBACK_BASE_URL",
        "ONLYOFFICE_CALLBACK_BASE_URL is required when ONLYOFFICE_ENABLED=true",
        ctx
      );
      requireNonEmpty(
        value.ONLYOFFICE_JWT_SECRET,
        "ONLYOFFICE_JWT_SECRET",
        "ONLYOFFICE_JWT_SECRET is required when ONLYOFFICE_ENABLED=true",
        ctx
      );
    }

    if (value.SECURITY_PROVIDER === "auth0-openfga") {
      requireNonEmpty(
        value.AUTH0_DOMAIN,
        "AUTH0_DOMAIN",
        "AUTH0_DOMAIN is required when SECURITY_PROVIDER=auth0-openfga",
        ctx
      );
      requireNonEmpty(
        value.AUTH0_AUDIENCE,
        "AUTH0_AUDIENCE",
        "AUTH0_AUDIENCE is required when SECURITY_PROVIDER=auth0-openfga",
        ctx
      );
      if (!value.AUTH0_ISSUER?.trim() && !value.AUTH0_DOMAIN?.trim()) {
        requireNonEmpty(
          value.AUTH0_ISSUER,
          "AUTH0_ISSUER",
          "AUTH0_ISSUER or AUTH0_DOMAIN is required when SECURITY_PROVIDER=auth0-openfga",
          ctx
        );
      }
      requireNonEmpty(
        value.OPENFGA_API_URL,
        "OPENFGA_API_URL",
        "OPENFGA_API_URL is required when SECURITY_PROVIDER=auth0-openfga",
        ctx
      );
      requireNonEmpty(
        value.OPENFGA_STORE_ID,
        "OPENFGA_STORE_ID",
        "OPENFGA_STORE_ID is required when SECURITY_PROVIDER=auth0-openfga",
        ctx
      );
      requireNonEmpty(
        value.OPENFGA_MODEL_ID,
        "OPENFGA_MODEL_ID",
        "OPENFGA_MODEL_ID is required when SECURITY_PROVIDER=auth0-openfga",
        ctx
      );
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

    if (value.STRIPE_ENABLED) {
      const requiredStripe = [
        ["STRIPE_PRIVATE_KEY", value.STRIPE_PRIVATE_KEY],
        ["STRIPE_WEBHOOK_SECRET", value.STRIPE_WEBHOOK_SECRET],
        ["STRIPE_BU_PRICE", value.STRIPE_BU_PRICE],
        ["STRIPE_SA_PRICE", value.STRIPE_SA_PRICE],
        ["STRIPE_USER_PRICE", value.STRIPE_USER_PRICE],
        ["STRIPE_COMPLIANCE_PRICE", value.STRIPE_COMPLIANCE_PRICE],
        ["STRIPE_ADD_MODULE_PRICE", value.STRIPE_ADD_MODULE_PRICE],
        ["STRIPE_SUPPORT_PRICE", value.STRIPE_SUPPORT_PRICE],
        ["CLIENT_URL", value.CLIENT_URL],
      ] as const;
      for (const [path, field] of requiredStripe) {
        requireNonEmpty(
          field,
          path,
          `${path} is required when STRIPE_ENABLED=true`,
          ctx
        );
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

  const config = result.data;
  if (
    config.SECURITY_PROVIDER === "auth0-openfga" &&
    !config.AUTH0_ISSUER.trim() &&
    config.AUTH0_DOMAIN.trim()
  ) {
    const domain = config.AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(
      /\/$/,
      ""
    );
    return {
      ...config,
      AUTH0_ISSUER: `https://${domain}/`,
    };
  }

  return config;
}
