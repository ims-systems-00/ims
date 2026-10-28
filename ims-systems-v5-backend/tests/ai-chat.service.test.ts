/**
 * Legacy gather/intent path retired — agent behaviour covered in ai-chat.agent.test.ts.
 * Keep a smoke import so the service still constructs.
 */
import { describe, expect, it } from "vitest";
import { createAiChatService } from "../src/modules/ai/services/ai-chat.service";
import type { AiGptPort } from "../src/modules/ai/ports";

describe("createAiChatService (agent)", () => {
  it("constructs with completeTurn-capable gpt port", () => {
    const gpt: AiGptPort = {
      async streamText() {},
      async generateText() {
        return "";
      },
      async completeTurn() {
        return { content: "ok", toolCalls: [], finishReason: "stop" };
      },
    };
    const service = createAiChatService({
      threads: {} as never,
      authorizer: {} as never,
      gpt,
      context: {
        searchRecords: async () => [],
        getRecordCard: async () => null,
        listOpenByModule: async () => [],
        getActivitiesSummary: async () => [],
      },
    });
    expect(service.streamChat).toBeTypeOf("function");
  });
});
