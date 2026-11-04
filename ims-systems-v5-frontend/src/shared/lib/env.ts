import { z } from "zod";

const securityProviderSchema = z.enum(["development-stub", "auth0-openfga"]);

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
  /**
   * development-stub — local/test only (forbidden in Vite mode=production).
   * auth0-openfga — Auth0 SPA AuthN (adapter lands in rollout M4).
   */
  VITE_SECURITY_PROVIDER: securityProviderSchema.default("development-stub"),

  /** Auth0 SPA public config (required when VITE_SECURITY_PROVIDER=auth0-openfga). */
  VITE_AUTH0_DOMAIN: z.string().default(""),
  VITE_AUTH0_CLIENT_ID: z.string().default(""),
  VITE_AUTH0_AUDIENCE: z.string().default(""),
  /**
   * Optional Auth0 Organization id for single-org demos until M5 org switch.
   * Example: org_xxxxxxxx
   */
  VITE_AUTH0_ORGANIZATION_ID: z.string().default(""),
  /**
   * OnlyOffice Document Server origin (no trailing slash). Empty hides Edit.
   * Example: http://localhost:8088
   */
  VITE_ONLYOFFICE_URL: z.string().default(""),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type EnvSource = {
  VITE_API_BASE_URL?: string;
  VITE_SECURITY_PROVIDER?: string;
  VITE_AUTH0_DOMAIN?: string;
  VITE_AUTH0_CLIENT_ID?: string;
  VITE_AUTH0_AUDIENCE?: string;
  VITE_AUTH0_ORGANIZATION_ID?: string;
  VITE_ONLYOFFICE_URL?: string;
};

function readViteEnv(): EnvSource {
  return {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_SECURITY_PROVIDER: import.meta.env.VITE_SECURITY_PROVIDER,
    VITE_AUTH0_DOMAIN: import.meta.env.VITE_AUTH0_DOMAIN,
    VITE_AUTH0_CLIENT_ID: import.meta.env.VITE_AUTH0_CLIENT_ID,
    VITE_AUTH0_AUDIENCE: import.meta.env.VITE_AUTH0_AUDIENCE,
    VITE_AUTH0_ORGANIZATION_ID: import.meta.env.VITE_AUTH0_ORGANIZATION_ID,
    VITE_ONLYOFFICE_URL: import.meta.env.VITE_ONLYOFFICE_URL,
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

  if (result.data.VITE_SECURITY_PROVIDER === "auth0-openfga") {
    const missing: string[] = [];
    if (!result.data.VITE_AUTH0_DOMAIN.trim()) missing.push("VITE_AUTH0_DOMAIN");
    if (!result.data.VITE_AUTH0_CLIENT_ID.trim())
      missing.push("VITE_AUTH0_CLIENT_ID");
    if (!result.data.VITE_AUTH0_AUDIENCE.trim())
      missing.push("VITE_AUTH0_AUDIENCE");
    if (missing.length > 0) {
      throw new Error(
        `Invalid frontend configuration: ${missing.join(", ")} required when VITE_SECURITY_PROVIDER=auth0-openfga`
      );
    }
  }

  return result.data;
}
