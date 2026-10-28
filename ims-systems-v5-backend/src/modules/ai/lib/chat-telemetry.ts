/**
 * Alice chat telemetry + lightweight SLO checks (no PII bodies).
 */

export type AliceChatTelemetryEvent = {
  tools: string[];
  toolArgKeys: string[][];
  resultCounts: number[];
  rounds: number;
  empty: boolean;
  promptCharsApprox: number;
  latencyMs: number;
  moduleHint?: string;
};

/** Soft latency SLO for a full agent turn (ms). */
export const ALICE_CHAT_LATENCY_SLO_MS = 15_000;

export function logAliceChatTelemetry(event: AliceChatTelemetryEvent): void {
  const sloBreach = event.latencyMs > ALICE_CHAT_LATENCY_SLO_MS;
  console.info(
    "[alice-chat]",
    JSON.stringify({
      ...event,
      sloBreach,
      sloMs: ALICE_CHAT_LATENCY_SLO_MS,
    })
  );
}

/**
 * Detect obvious prompt-injection payloads in user text (defense-in-depth).
 * Does not block; orchestrator can append a caution to the system hint.
 */
export function detectPromptInjectionSignals(text: string): boolean {
  return (
    /\bignore (all |any )?(previous|prior|above) (instructions|prompts)\b/i.test(
      text
    ) ||
    /\byou are now\b.*\b(system|developer)\b/i.test(text) ||
    /\bdisregard (your|the) (system|safety)\b/i.test(text)
  );
}
