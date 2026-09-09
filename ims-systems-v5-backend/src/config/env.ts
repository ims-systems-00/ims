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
  });

export type AppConfig = z.infer<typeof envSchema>;

export type EnvSource = Record<string, string | undefined>;

export function loadConfig(env: EnvSource = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }
  return result.data;
}
