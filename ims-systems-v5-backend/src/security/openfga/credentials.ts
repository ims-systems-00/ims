import { CredentialsMethod } from "@openfga/sdk";
import type { AppConfig } from "../../config";

type OpenFgaClientCredentials = {
  method: CredentialsMethod.ClientCredentials;
  config: {
    clientId: string;
    clientSecret: string;
    apiTokenIssuer: string;
    apiAudience: string;
  };
};

type OpenFgaApiTokenCredentials = {
  method: CredentialsMethod.ApiToken;
  config: {
    token: string;
  };
};

export type OpenFgaCredentials =
  | OpenFgaClientCredentials
  | OpenFgaApiTokenCredentials;

/**
 * Prefer OAuth client credentials (Auth0 FGA / Okta FGA) when configured.
 * Fall back to a static API token only when client credentials are absent.
 * Local unauthenticated OpenFGA returns undefined.
 */
export function resolveOpenFgaCredentials(
  config: Pick<
    AppConfig,
    | "OPENFGA_CLIENT_ID"
    | "OPENFGA_CLIENT_SECRET"
    | "OPENFGA_API_TOKEN_ISSUER"
    | "OPENFGA_API_AUDIENCE"
    | "OPENFGA_API_TOKEN"
  >
): OpenFgaCredentials | undefined {
  const clientId = config.OPENFGA_CLIENT_ID.trim();
  const clientSecret = config.OPENFGA_CLIENT_SECRET.trim();
  const apiTokenIssuer = config.OPENFGA_API_TOKEN_ISSUER.trim();
  const apiAudience = config.OPENFGA_API_AUDIENCE.trim();

  if (clientId || clientSecret || apiTokenIssuer || apiAudience) {
    const missing: string[] = [];
    if (!clientId) missing.push("OPENFGA_CLIENT_ID");
    if (!clientSecret) missing.push("OPENFGA_CLIENT_SECRET");
    if (!apiTokenIssuer) missing.push("OPENFGA_API_TOKEN_ISSUER");
    if (!apiAudience) missing.push("OPENFGA_API_AUDIENCE");
    if (missing.length > 0) {
      throw new Error(
        `Incomplete OpenFGA client credentials; set ${missing.join(", ")} (or clear all OPENFGA_CLIENT_* / issuer / audience for local no-auth)`
      );
    }
    return {
      method: CredentialsMethod.ClientCredentials,
      config: {
        clientId,
        clientSecret,
        apiTokenIssuer,
        apiAudience,
      },
    };
  }

  const apiToken = config.OPENFGA_API_TOKEN.trim();
  if (apiToken) {
    return {
      method: CredentialsMethod.ApiToken,
      config: { token: apiToken },
    };
  }

  return undefined;
}

/**
 * Mint a short-lived bearer token via client_credentials for one-off probes
 * (preflight). Returns null when credentials are not client-based.
 */
export async function fetchOpenFgaAccessToken(
  credentials: OpenFgaCredentials | undefined,
  options: { timeoutMs?: number } = {}
): Promise<string | null> {
  if (!credentials) return null;
  if (credentials.method === CredentialsMethod.ApiToken) {
    return credentials.config.token;
  }

  const { clientId, clientSecret, apiTokenIssuer, apiAudience } =
    credentials.config;
  const issuerBase = apiTokenIssuer.replace(/\/$/, "");
  const tokenUrl = issuerBase.includes("://")
    ? `${issuerBase}/oauth/token`
    : `https://${issuerBase}/oauth/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    audience: apiAudience,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
  });

  if (!response.ok) {
    throw new Error(
      `OpenFGA token exchange failed with HTTP ${response.status}`
    );
  }

  const payload = (await response.json()) as { access_token?: unknown };
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("OpenFGA token exchange response missing access_token");
  }
  return payload.access_token;
}
