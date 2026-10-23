/**
 * OpenAI chat completions adapter for Alice (stream + normal).
 * Mirrors V4 PromptEngineering (gpt stream / gpt-normal).
 */

import OpenAI from "openai";
import type { AiGptPort } from "../ports";
import type { GptGenerateInput, GptMessage } from "../types";

export type OpenAiGptAdapterOptions = {
  apiKey: string;
  model?: string;
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

export function createOpenAiGptAdapter(
  options: OpenAiGptAdapterOptions
): AiGptPort {
  const client = new OpenAI({ apiKey: options.apiKey });
  const model = options.model?.trim() || "gpt-3.5-turbo";
  const maxTokens = options.maxTokens ?? 2550;
  const temperature = options.temperature ?? 0.2;

  return {
    async streamText(input, onChunk, signal) {
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
    },

    async generateText(input) {
      const completion = await client.chat.completions.create({
        model,
        messages: toChatMessages(input),
        max_tokens: maxTokens,
        temperature,
      });
      return completion.choices[0]?.message?.content ?? "";
    },
  };
}
