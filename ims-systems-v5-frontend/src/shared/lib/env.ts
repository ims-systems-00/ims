import { z } from "zod";

const securityProviderSchema = z.enum(["development-stub"]);

/**
 * Absolute http(s) URL, or a same-origin path (e.g. `/api/v1` behind Nginx).
 */
function isApiBaseUrl(value: string): boolean {
  if (value.startsWith("/")) {
    return value === "/api/v1" || value.startsWith("/api/v1/");
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Public (browser-safe) Vite environment. Never put secrets in VITE_*.
 */
const publicEnvSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .min(1, "VITE_API_BASE_URL is required")
    .refine(
      isApiBaseUrl,
      "VITE_API_BASE_URL must be an absolute http(s) URL or a same-origin path such as /api/v1"
    )
    .transform((value) => value.replace(/\/$/, "")),
  VITE_SECURITY_PROVIDER: securityProviderSchema.default("development-stub"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type EnvSource = {
  VITE_API_BASE_URL?: string;
  VITE_SECURITY_PROVIDER?: string;
};

function readViteEnv(): EnvSource {
  return {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_SECURITY_PROVIDER: import.meta.env.VITE_SECURITY_PROVIDER,
  };
}

export function loadPublicEnv(
  source: EnvSource = readViteEnv(),
  mode: string | undefined = import.meta.env.MODE
): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid frontend configuration: ${details}`);
  }

  if (
    mode === "production" &&
    result.data.VITE_SECURITY_PROVIDER === "development-stub"
  ) {
    throw new Error(
      "Invalid frontend configuration: VITE_SECURITY_PROVIDER: development-stub is not allowed when MODE=production"
    );
  }

  return result.data;
}
