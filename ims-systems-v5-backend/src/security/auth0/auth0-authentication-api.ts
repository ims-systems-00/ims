/**
 * Auth0 Authentication API client (Database connection).
 * Used by the V5 BFF for register / password login / forgot-password / refresh.
 * Client secret must never leave the backend.
 */

import {
  AppError,
  ConflictError,
  UnauthorizedError,
  ValidationAppError,
} from "../../shared/errors/app-error";

export type Auth0TokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
};

export type Auth0SignupInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type Auth0AuthenticationApiConfig = {
  domain: string;
  audience: string;
  dbConnection: string;
  spaClientId: string;
  ropgClientId: string;
  ropgClientSecret: string;
  /** Injected for tests. Defaults to global fetch. */
  fetchFn?: typeof fetch;
};

type Auth0ErrorBody = {
  error?: string;
  error_description?: string | Record<string, unknown>;
  message?: string | Record<string, unknown>;
  code?: string;
  name?: string;
  /** Auth0 signup often returns an object here (password strength rules). */
  description?: string | Record<string, unknown>;
  statusCode?: number;
};

function normalizeDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Auth0 rule messages use printf-style placeholders filled from `format`
 * (e.g. "At least %d characters" + format: [15]).
 */
function interpolateAuth0Template(
  template: string,
  format: unknown
): string {
  if (!Array.isArray(format) || format.length === 0) return template;
  let index = 0;
  return template.replace(/%[sd]/g, () => {
    const value = format[index++];
    return value === undefined || value === null ? "" : String(value);
  });
}

function formatPasswordRuleHint(rule: Record<string, unknown>): string | null {
  // Only surface failed rules — Auth0 includes verified:true rules in the same list.
  if (rule.verified === true) return null;

  if (typeof rule.message === "string" && rule.message.trim()) {
    return interpolateAuth0Template(rule.message, rule.format);
  }

  // Fallback for known codes when message is missing.
  if (rule.code === "lengthAtLeast" && Array.isArray(rule.format) && rule.format[0] != null) {
    return `At least ${String(rule.format[0])} characters in length`;
  }
  if (typeof rule.code === "string" && rule.code.trim()) return rule.code;
  return null;
}

/**
 * Auth0 password-strength / policy errors put a structured object in `description`.
 * Never pass that object as Error.message (becomes "[object Object]").
 */
function formatAuth0Message(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return interpolateAuth0Template(record.message, record.format);
    }
    if (Array.isArray(record.rules)) {
      const ruleHints = record.rules
        .map((rule) => {
          if (!rule || typeof rule !== "object") return null;
          return formatPasswordRuleHint(rule as Record<string, unknown>);
        })
        .filter((hint): hint is string => Boolean(hint));
      if (ruleHints.length > 0) {
        return `Password does not meet requirements: ${ruleHints.join("; ")}`;
      }
      return "Password does not meet requirements";
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapAuth0SignupError(body: Auth0ErrorBody): AppError {
  const code = (body.code ?? body.error ?? body.name ?? "").toLowerCase();
  const message = formatAuth0Message(
    body.description ?? body.message ?? body.error_description,
    "Unable to create account"
  );

  // Only rewrite when Auth0’s own error code is definitive.
  if (code === "user_exists" || code.endsWith("user_exists")) {
    return new ConflictError("An account with this email already exists");
  }

  if (
    code === "invalid_password" ||
    code === "passwordstrengtherror" ||
    code === "password_strength_error"
  ) {
    return new ValidationAppError(message, body.description ?? body);
  }

  // Pass Auth0’s message through for customers (e.g. "Invalid sign up").
  // Do not rewrite into operator checklists — those belong in ops docs.
  return new ValidationAppError(message, body.description ?? body);
}

function mapAuth0TokenError(body: Auth0ErrorBody, status: number): AppError {
  const error = (body.error ?? "").toLowerCase();
  const description = formatAuth0Message(
    body.error_description ?? body.message,
    "Authentication failed"
  );

  if (
    error === "invalid_grant" ||
    error === "access_denied" ||
    status === 401 ||
    status === 403
  ) {
    return new UnauthorizedError("Invalid email or password");
  }

  if (error === "invalid_request" || status === 400) {
    return new ValidationAppError(description);
  }

  return new AppError({
    message:
      description === "Authentication failed"
        ? "Unable to sign in"
        : description,
    statusCode: status >= 400 && status < 600 ? status : 502,
    code: "AUTH0_TOKEN_ERROR",
  });
}

export class Auth0AuthenticationApi {
  private readonly domain: string;
  private readonly audience: string;
  private readonly dbConnection: string;
  private readonly spaClientId: string;
  private readonly ropgClientId: string;
  private readonly ropgClientSecret: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: Auth0AuthenticationApiConfig) {
    this.domain = normalizeDomain(config.domain);
    this.audience = config.audience;
    this.dbConnection = config.dbConnection;
    this.spaClientId = config.spaClientId;
    this.ropgClientId = config.ropgClientId;
    this.ropgClientSecret = config.ropgClientSecret;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  assertConfigured(): void {
    const missing: string[] = [];
    if (!this.domain) missing.push("AUTH0_DOMAIN");
    if (!this.audience) missing.push("AUTH0_AUDIENCE");
    if (!this.dbConnection) missing.push("AUTH0_DB_CONNECTION");
    if (!this.spaClientId) missing.push("AUTH0_SPA_CLIENT_ID");
    if (!this.ropgClientId) missing.push("AUTH0_ROPG_CLIENT_ID");
    if (!this.ropgClientSecret) missing.push("AUTH0_ROPG_CLIENT_SECRET");
    if (missing.length > 0) {
      throw new AppError({
        message: `Auth0 BFF is not configured: missing ${missing.join(", ")}`,
        statusCode: 503,
        code: "AUTH0_BFF_NOT_CONFIGURED",
      });
    }
  }

  async signup(input: Auth0SignupInput): Promise<void> {
    this.assertConfigured();
    const url = `https://${this.domain}/dbconnections/signup`;
    const userMetadata: Record<string, string> = {};
    if (input.firstName?.trim()) userMetadata.firstName = input.firstName.trim();
    if (input.lastName?.trim()) userMetadata.lastName = input.lastName.trim();
    if (input.phone?.trim()) userMetadata.phone = input.phone.trim();

    const response = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.spaClientId,
        email: input.email.trim().toLowerCase(),
        password: input.password,
        connection: this.dbConnection,
        name:
          [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
          undefined,
        user_metadata:
          Object.keys(userMetadata).length > 0 ? userMetadata : undefined,
      }),
    });

    if (response.ok) return;

    let body: Auth0ErrorBody = {};
    try {
      body = (await response.json()) as Auth0ErrorBody;
    } catch {
      /* ignore */
    }
    throw mapAuth0SignupError(body);
  }

  async loginWithPassword(
    email: string,
    password: string
  ): Promise<Auth0TokenResponse> {
    this.assertConfigured();
    return this.tokenRequest({
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      username: email.trim().toLowerCase(),
      password,
      realm: this.dbConnection,
      audience: this.audience,
      scope: "openid profile email offline_access",
      client_id: this.ropgClientId,
      client_secret: this.ropgClientSecret,
    });
  }

  async refresh(refreshToken: string): Promise<Auth0TokenResponse> {
    this.assertConfigured();
    return this.tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.ropgClientId,
      client_secret: this.ropgClientSecret,
    });
  }

  /**
   * Triggers Auth0's change-password email. Always succeeds from the caller's
   * perspective when Auth0 accepts the request (no email enumeration).
   */
  async requestPasswordChange(email: string): Promise<void> {
    this.assertConfigured();
    const url = `https://${this.domain}/dbconnections/change_password`;
    const response = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.spaClientId,
        email: email.trim().toLowerCase(),
        connection: this.dbConnection,
      }),
    });

    if (response.ok) return;

    // Auth0 still returns 200 for unknown emails in many configs; treat other
    // failures as operational without revealing whether the email exists.
    let body: Auth0ErrorBody = {};
    try {
      body = (await response.json()) as Auth0ErrorBody;
    } catch {
      /* ignore */
    }
    throw new AppError({
      message:
        body.error_description ??
        body.message ??
        "Unable to start password reset",
      statusCode: 502,
      code: "AUTH0_CHANGE_PASSWORD_FAILED",
    });
  }

  private async tokenRequest(
    body: Record<string, string>
  ): Promise<Auth0TokenResponse> {
    const url = `https://${this.domain}/oauth/token`;
    const response = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = (await response.json().catch(() => ({}))) as Auth0ErrorBody & {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    if (!response.ok || !raw.access_token) {
      throw mapAuth0TokenError(raw, response.status);
    }

    return {
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      expiresIn: raw.expires_in ?? 86400,
      tokenType: raw.token_type ?? "Bearer",
    };
  }
}

export function createAuth0AuthenticationApiFromConfig(config: {
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  AUTH0_DB_CONNECTION: string;
  AUTH0_SPA_CLIENT_ID: string;
  AUTH0_ROPG_CLIENT_ID: string;
  AUTH0_ROPG_CLIENT_SECRET: string;
}): Auth0AuthenticationApi {
  return new Auth0AuthenticationApi({
    domain: config.AUTH0_DOMAIN,
    audience: config.AUTH0_AUDIENCE,
    dbConnection: config.AUTH0_DB_CONNECTION,
    spaClientId: config.AUTH0_SPA_CLIENT_ID,
    ropgClientId: config.AUTH0_ROPG_CLIENT_ID,
    ropgClientSecret: config.AUTH0_ROPG_CLIENT_SECRET,
  });
}
