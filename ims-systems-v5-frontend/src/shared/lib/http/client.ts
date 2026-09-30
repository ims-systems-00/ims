import { loadPublicEnv } from "../env";
import { ApiClientError, mapStatusToCode } from "./errors";
import { apiErrorSchema, apiSuccessSchema } from "./types";
import type { AuthClient } from "@/security/auth-client";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * Optional auth client for future credential attachment (Auth0 later).
   * The development stub does not establish production transport.
   */
  authClient?: AuthClient;
};

function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fe-${Date.now()}`;
}

/**
 * Platform HTTP client for the V5 backend.
 * Modules should call this via module `api/` functions — not raw fetch in UI.
 *
 * Paths are relative to VITE_API_BASE_URL (which includes `/api/v1`).
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const env = loadPublicEnv();
  const method = options.method ?? "GET";
  const correlationId = createCorrelationId();
  const url = `${env.VITE_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-correlation-id": correlationId,
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.authClient) {
    await options.authClient.getIdentity();
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    throw new ApiClientError({
      message: "Network request failed",
      status: 0,
      code: "NETWORK_ERROR",
      details: error instanceof Error ? error.message : undefined,
      correlationId,
    });
  }

  const responseCorrelationId =
    response.headers.get("x-correlation-id") ?? correlationId;

  let payload: unknown = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new ApiClientError({
        message: "Invalid JSON response from API",
        status: response.status,
        code: mapStatusToCode(response.status),
        correlationId: responseCorrelationId,
      });
    }
  }

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    if (parsedError.success) {
      throw new ApiClientError({
        message: parsedError.data.error.message,
        status: response.status,
        code: parsedError.data.error.code,
        details: parsedError.data.error.details,
        correlationId:
          parsedError.data.correlationId ?? responseCorrelationId,
      });
    }

    throw new ApiClientError({
      message: `Request failed with status ${response.status}`,
      status: response.status,
      code: mapStatusToCode(response.status),
      correlationId: responseCorrelationId,
    });
  }

  const parsedSuccess = apiSuccessSchema.safeParse(payload);
  if (!parsedSuccess.success) {
    throw new ApiClientError({
      message: "Unexpected API success payload shape",
      status: response.status,
      code: "UNKNOWN_ERROR",
      details: parsedSuccess.error.issues,
      correlationId: responseCorrelationId,
    });
  }

  return parsedSuccess.data.data as T;
}
