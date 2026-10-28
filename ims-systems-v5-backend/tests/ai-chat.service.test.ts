import { describe, expect, it } from "vitest";
import type { AiContextPort, AiGptPort } from "../src/modules/ai/ports";
import { createAiChatService } from "../src/modules/ai/services/ai-chat.service";
import type { AiContextCard, ChatStreamEvent } from "../src/modules/ai/types/chat";
import type { SecurityIdentity } from "../src/security";

const identity = {
  subjectId: "user-1",
  organizationId: "org-1",
} as SecurityIdentity;

function taskCard(id: string, title: string): AiContextCard {
  return {
    module: "tasks",
    id,
    reference: `TSK-${id}`,
    title,
    status: "Pending",
    summary: `TSK-${id} · ${title} · Priority: High`,
    href: `/tasks?task=${id}`,
  };
}

function riskCard(id: string, title: string): AiContextCard {
  return {
    module: "risks",
    id,
    reference: `RK-${id}`,
    title,
    status: "Open",
    summary: `RK-${id} · ${title}`,
    href: `/risks?risk=${id}`,
  };
}

describe("createAiChatService intent gather", () => {
  it("fetches tasks list for high-priority ASAP and never dumps risks", async () => {
    const calls: string[] = [];
    const context: AiContextPort = {
      async searchRecords() {
        calls.push("search");
        return [riskCard("r1", "Should not appear")];
      },
      async getRecordCard() {
        return null;
      },
      async listOpenByModule(input) {
        calls.push(`list:${input.module}`);
        expect(input.module).toBe("tasks");
        expect(input.filters?.priorityHigh).toBe(true);
        return [taskCard("t1", "Urgent follow-up")];
      },
      async getActivitiesSummary() {
        return [];
      },
    };

    let capturedPrompt = "";
    const gpt: AiGptPort = {
      async streamText(input, onChunk) {
        capturedPrompt = input.prompt;
        expect(input.maxTokens).toBe(1000);
        onChunk("Here are your high priority tasks.");
      },
      async generateText() {
        return "";
      },
    };

    const threads = {
      async listSummaries() {
        return [];
      },
      async findById() {
        return null;
      },
      async create(input: { title?: string }) {
        return {
          id: "thread-1",
          organizationId: "org-1",
          userId: "user-1",
          title: input.title ?? "Chat",
          pinnedRecords: [],
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
      async delete() {
        return true;
      },
      async appendMessages(
        _org: string,
        _user: string,
        threadId: string,
        messages: Array<{ role: string; content: string }>
      ) {
        return {
          id: threadId,
          organizationId: "org-1",
          userId: "user-1",
          title: "Chat",
          pinnedRecords: [],
          messages: messages.map((m, i) => ({
            id: `m${i}`,
            role: m.role,
            content: m.content,
            citations: [],
            createdAt: new Date().toISOString(),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
    };

    const service = createAiChatService({
      threads: threads as never,
      authorizer: {
        allow: async () => true,
      } as never,
      gpt,
      context,
    });

    const events: ChatStreamEvent[] = [];
    await service.streamChat(
      identity,
      {
        message: "Show high priority tasks that need attention ASAP",
        pageContext: {
          pathname: "/dashboard",
          moduleHint: "other",
          selectedIds: [],
        },
        conversation: [
          {
            role: "assistant",
            content: "Here are open risks:\n| RK-DEMO | Demo risk |",
          },
        ],
      },
      (e) => events.push(e)
    );

    expect(calls).toContain("list:tasks");
    expect(calls).not.toContain("search");
    expect(capturedPrompt).toMatch(/TSK-t1|Urgent follow-up/);
    expect(capturedPrompt).not.toMatch(/RK-DEMO|Should not appear|RK-r1/);
    const citations = events.find((e) => e.type === "citations");
    expect(citations?.type).toBe("citations");
    if (citations?.type === "citations") {
      expect(citations.citations[0]?.module).toBe("tasks");
    }
  });

  it("says empty context when no cards — does not invent prior risk refs in prompt", async () => {
    const context: AiContextPort = {
      async searchRecords() {
        return [];
      },
      async getRecordCard() {
        return null;
      },
      async listOpenByModule() {
        return [];
      },
      async getActivitiesSummary() {
        return [];
      },
    };

    let capturedPrompt = "";
    const gpt: AiGptPort = {
      async streamText(input, onChunk) {
        capturedPrompt = input.prompt;
        onChunk("None found.");
      },
      async generateText() {
        return "";
      },
    };

    const threads = {
      async findById() {
        return null;
      },
      async create() {
        return {
          id: "thread-2",
          organizationId: "org-1",
          userId: "user-1",
          title: "Chat",
          pinnedRecords: [],
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
      async appendMessages(
        _o: string,
        _u: string,
        threadId: string,
        messages: Array<{ role: string; content: string }>
      ) {
        return {
          id: threadId,
          organizationId: "org-1",
          userId: "user-1",
          title: "Chat",
          pinnedRecords: [],
          messages: messages.map((m, i) => ({
            id: `m${i}`,
            role: m.role,
            content: m.content,
            citations: [],
            createdAt: new Date().toISOString(),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
    };

    const service = createAiChatService({
      threads: threads as never,
      authorizer: { allow: async () => true } as never,
      gpt,
      context,
    });

    await service.streamChat(
      identity,
      {
        message: "Show high priority tasks ASAP",
        conversation: [
          { role: "assistant", content: "Risks: RK-DEMO, RK-FAKE" },
        ],
      },
      () => undefined
    );

    expect(capturedPrompt).toMatch(/none were found|No organisation records/i);
    expect(capturedPrompt).not.toMatch(/RK-DEMO|RK-FAKE/);
    expect(capturedPrompt.length).toBeLessThan(3000);
  });
});
