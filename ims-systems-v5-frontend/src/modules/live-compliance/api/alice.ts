import { apiRequest } from "@/shared/lib/http";
import { ApiClientError, mapStatusToCode } from "@/shared/lib/http/errors";
import { loadPublicEnv } from "@/shared/lib/env";
import { authHeaders } from "../lib/live-stream";
import type {
  AliceDraft,
  AliceDraftStatus,
  AliceRunEvent,
  AliceTaskId,
  JourneyResponse,
} from "../types";

const BASE = "/live-compliance";

/**
 * Run an ALICE task. The server streams NDJSON: status lines, then the draft.
 * Resolves with the draft; rejects with ApiClientError on failure.
 */
export async function runAliceTask(input: {
  task: AliceTaskId;
  ref: string | null;
  onStatus?: (message: string) => void;
  signal?: AbortSignal;
}): Promise<AliceDraft> {
  const env = loadPublicEnv();
  const headers = await authHeaders({
    Accept: "application/x-ndjson",
    "Content-Type": "application/json",
  });
  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_BASE_URL}${BASE}/alice/tasks/${input.task}/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ref: input.ref }),
      signal: input.signal,
    });
  } catch (error) {
    throw new ApiClientError({
      message: "Network request failed",
      status: 0,
      code: "NETWORK_ERROR",
      details: error instanceof Error ? error.message : undefined,
    });
  }
  if (!response.ok || !response.body) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string; error?: { message?: string } };
      message = payload.error?.message ?? payload.message ?? message;
    } catch {
      // keep status message
    }
    throw new ApiClientError({ message, status: response.status, code: mapStatusToCode(response.status) });
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let draft: AliceDraft | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as AliceRunEvent;
    if (event.type === "status") input.onStatus?.(event.message);
    else if (event.type === "draft") draft = event.draft;
    else if (event.type === "error") {
      throw new ApiClientError({ message: event.message, status: 502, code: "ALICE_FAILED" });
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      handle(buffer.slice(0, index));
      buffer = buffer.slice(index + 1);
    }
  }
  handle(buffer);
  if (!draft) {
    throw new ApiClientError({ message: "ALICE did not return a draft", status: 502, code: "ALICE_FAILED" });
  }
  return draft;
}

export function listAliceDrafts(status?: AliceDraftStatus, limit = 20): Promise<AliceDraft[]> {
  const qs = new URLSearchParams({ limit: String(limit), ...(status ? { status } : {}) });
  return apiRequest<AliceDraft[]>(`${BASE}/alice/drafts?${qs.toString()}`);
}

export function getAliceDraft(id: string): Promise<AliceDraft> {
  return apiRequest<AliceDraft>(`${BASE}/alice/drafts/${encodeURIComponent(id)}`);
}

export function approveAliceDraft(id: string): Promise<AliceDraft> {
  return apiRequest<AliceDraft>(`${BASE}/alice/drafts/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export function discardAliceDraft(id: string): Promise<AliceDraft> {
  return apiRequest<AliceDraft>(`${BASE}/alice/drafts/${encodeURIComponent(id)}/discard`, { method: "POST" });
}

export function getJourney(): Promise<JourneyResponse> {
  return apiRequest<JourneyResponse>(`${BASE}/journey`);
}

export function setJourneyStep(step: string, done: boolean): Promise<JourneyResponse> {
  return apiRequest<JourneyResponse>(`${BASE}/journey/${encodeURIComponent(step)}/complete`, {
    method: "POST",
    body: { done },
  });
}
