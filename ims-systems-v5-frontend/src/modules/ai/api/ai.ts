import { loadPublicEnv } from "@/shared/lib/env";
import { getActiveOrganisationId } from "@/shared/lib/active-organisation";
import { ApiClientError, mapStatusToCode } from "@/shared/lib/http/errors";
import { apiRequest } from "@/shared/lib/http";
import { getActiveAuthClient } from "@/security/runtime";
import type {
  AiResponse,
  CreateAiResponseInput,
  GptGenerateInput,
  ListAiResponsesParams,
  PaginatedAiResponses,
  StreamGptHandlers,
  UpdateAiResponseInput,
} from "../types";

const ALICE_SYSTEM_PROMPT = {
  role: "system" as const,
  content: `You are an AI assistant named Alice. You respond contents in Markdown format, you usually split your output into paragraphs 
  Always comprehend your answers when asked for any documentation or policies. Also try to explain or comprehend your general 
  answers with details as much as possible. Use UK english in your responses.`,
};

export function listAiResponses(
  params: ListAiResponsesParams = {}
): Promise<PaginatedAiResponses> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.moduleType) q.set("moduleType", params.moduleType);
  if (params.moduleId) q.set("moduleId", params.moduleId);
  if (params.sortDir) q.set("sortDir", params.sortDir);
  const qs = q.toString();
  return apiRequest<PaginatedAiResponses>(`/ai/responses${qs ? `?${qs}` : ""}`);
}

export function getAiResponse(id: string): Promise<AiResponse> {
  return apiRequest<AiResponse>(`/ai/responses/${encodeURIComponent(id)}`);
}

export function createAiResponse(
  input: CreateAiResponseInput
): Promise<AiResponse> {
  return apiRequest<AiResponse>("/ai/responses", {
    method: "POST",
    body: input,
  });
}

export function updateAiResponse(
  id: string,
  input: UpdateAiResponseInput
): Promise<AiResponse> {
  return apiRequest<AiResponse>(`/ai/responses/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteAiResponse(id: string): Promise<AiResponse> {
  return apiRequest<AiResponse>(`/ai/responses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function generateGptNormal(
  input: GptGenerateInput
): Promise<{ responseMessage: string }> {
  return apiRequest<{ responseMessage: string }>("/ai/gpt-normal", {
    method: "POST",
    body: {
      prompt: input.prompt,
      systemInstructions: [ALICE_SYSTEM_PROMPT, ...input.systemInstructions],
      conversation: input.conversation,
    },
  });
}

/**
 * Stream Alice text via fetch (axios/XHR cannot stream in browsers).
 */
export async function streamGptResponse(
  input: GptGenerateInput,
  handlers: StreamGptHandlers
): Promise<string> {
  const env = loadPublicEnv();
  const url = `${env.VITE_API_BASE_URL}/ai/gpt-stream`;
  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `fe-ai-${Date.now()}`;

  const headers: Record<string, string> = {
    Accept: "text/plain",
    "Content-Type": "application/json",
    "x-correlation-id": correlationId,
  };

  const activeOrgId = getActiveOrganisationId();
  if (activeOrgId) headers["x-org-id"] = activeOrgId;

  const authClient = getActiveAuthClient();
  if (authClient) {
    const token = await authClient.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: input.prompt,
        systemInstructions: [ALICE_SYSTEM_PROMPT, ...input.systemInstructions],
        conversation: input.conversation,
      }),
      signal: handlers.signal,
    });
  } catch (error) {
    if (handlers.signal?.aborted) return "";
    throw new ApiClientError({
      message: "Network request failed",
      status: 0,
      code: "NETWORK_ERROR",
      details: error instanceof Error ? error.message : undefined,
      correlationId,
    });
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code = mapStatusToCode(response.status);
    try {
      const payload = (await response.json()) as {
        message?: string;
        error?: { message?: string; code?: string };
        code?: string;
      };
      message =
        payload.error?.message ??
        payload.message ??
        message;
      code = payload.error?.code ?? payload.code ?? code;
    } catch {
      // Non-JSON error body — keep status-based message.
    }
    throw new ApiClientError({
      message,
      status: response.status,
      code,
      correlationId: response.headers.get("x-correlation-id") ?? correlationId,
    });
  }

  if (!response.body) {
    throw new ApiClientError({
      message: "Empty stream response from API",
      status: response.status,
      code: "UNKNOWN_ERROR",
      correlationId,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (!chunk) continue;
    fullText += chunk;
    handlers.onChunk(chunk);
  }

  return fullText;
}
