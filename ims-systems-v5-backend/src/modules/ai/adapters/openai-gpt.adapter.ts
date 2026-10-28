/**
 * OpenAI-compatible chat completions adapter for Alice (stream + normal).
 * Supports OpenAI and Groq (OpenAI-compatible base URL).
 */

import OpenAI from "openai";
import { AppError } from "../../../shared";
import type { AiGptPort } from "../ports";
import type { GptGenerateInput, GptMessage } from "../types";

export const GROQ_OPENAI_COMPAT_BASE_URL = "https://api.groq.com/openai/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export type OpenAiGptAdapterOptions = {
  apiKey: string;
  model?: string;
  /** OpenAI-compatible base URL (Groq: https://api.groq.com/openai/v1). */
  baseURL?: string;
  /** Used in error messages (openai | groq). */
  providerLabel?: string;
  maxTokens?: number;
  temperature?: number;
};

function toChatMessages(
  input: GptGenerateInput
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const map = (message: GptMessage): OpenAI.Chat.ChatCompletionMessageParam => ({
    role: message.role,
    content: message.content ?? "",
  });

  return [
    ...input.conversation.map(map),
    ...input.systemInstructions.map(map),
    { role: "user", content: input.prompt },
  ];
}

function mapProviderError(error: unknown, providerLabel: string): never {
  const err = error as {
    status?: number;
    code?: string;
    message?: string;
    error?: { message?: string; code?: string };
  };
  const code = err.code ?? err.error?.code;
  const raw = err.error?.message ?? err.message ?? `${providerLabel} request failed`;
  const label = providerLabel === "groq" ? "Groq" : "OpenAI";

  if (code === "model_not_found" || /deprecated|model_not_found/i.test(raw)) {
    throw new AppError({
      message: `Alice model is unavailable for ${label}. Check OPEN_AI_MODEL / GROQ_MODEL.`,
      statusCode: 502,
      code: "AI_MODEL_UNAVAILABLE",
      cause: error,
    });
  }

  if (
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted" ||
    /credit_balance_exhausted|insufficient_quota|billing/i.test(raw)
  ) {
    throw new AppError({
      message: `${label} billing/credits are exhausted for the configured API key.`,
      statusCode: 502,
      code: "AI_QUOTA_EXHAUSTED",
      cause: error,
    });
  }

  if (/Incorrect API key|invalid_api_key|authentication/i.test(raw)) {
    throw new AppError({
      message: `${label} API key is invalid. Update OPEN_AI_API_KEY or GROQ_API_KEY.`,
      statusCode: 502,
      code: "AI_INVALID_API_KEY",
      cause: error,
    });
  }

  throw new AppError({
    message: `Alice generation failed: ${raw}`,
    statusCode: typeof err.status === "number" && err.status >= 400 ? 502 : 500,
    code: "AI_PROVIDER_ERROR",
    cause: error,
  });
}

export function createOpenAiGptAdapter(
  options: OpenAiGptAdapterOptions
): AiGptPort {
  const providerLabel = options.providerLabel?.trim() || "openai";
  const client = new OpenAI({
    apiKey: options.apiKey,
    ...(options.baseURL?.trim()
      ? { baseURL: options.baseURL.trim() }
      : {}),
  });
  const model =
    options.model?.trim() ||
    (providerLabel === "groq" ? DEFAULT_GROQ_MODEL : DEFAULT_OPENAI_MODEL);
  const maxTokens = options.maxTokens ?? 2550;
  const temperature = options.temperature ?? 0.2;

  return {
    async streamText(input, onChunk, signal) {
      try {
        const stream = await client.chat.completions.create(
          {
            model,
            messages: toChatMessages(input),
            max_tokens: maxTokens,
            temperature,
            stream: true,
          },
          { signal }
        );

        for await (const part of stream) {
          if (signal?.aborted) break;
          const text = part.choices[0]?.delta?.content ?? "";
          if (text) onChunk(text);
        }
      } catch (error) {
        if (signal?.aborted) return;
        mapProviderError(error, providerLabel);
      }
    },

    async generateText(input) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: toChatMessages(input),
          max_tokens: maxTokens,
          temperature,
        });
        return completion.choices[0]?.message?.content ?? "";
      } catch (error) {
        mapProviderError(error, providerLabel);
      }
    },
  };
}
