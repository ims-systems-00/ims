/**
 * Floating Alice chatbot — intent-routed retrieve-then-answer with citations.
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  cardsToPromptBlock,
  RECORD_CONTEXT_CHAR_BUDGET,
  toDetailCard,
  toListCard,
} from "../lib/context-cards";
import {
  routeChatIntent,
  type AiChatIntent,
  type AiIntentModule,
} from "../lib/intent-router";
import type { AiContextPort, AiGptPort } from "../ports";
import type { AiChatThreadRepository } from "../repositories/ai-chat-thread.repository";
import { AI_RESOURCE } from "../types";
import type {
  AiChatCitation,
  AiChatPageContext,
  AiChatPinnedRecord,
  AiChatThread,
  AiChatThreadSummary,
  AiContextCard,
  ChatStreamEvent,
  StreamChatInput,
} from "../types/chat";

const CHAT_SYSTEM = `You are Alice, the iMS Systems AI assistant embedded in an organisation's IMS.
You answer in Markdown using UK English.
You MUST only use the organisation records provided in the context block — never invent references (e.g. RK-, TASK-, DOC-) or rows.
Match the user's requested module and filters (e.g. tasks vs risks, high priority, open).
If the context block says no records were retrieved, say none were found matching the request — do not fall back to unrelated modules from earlier conversation.
For list questions, prefer a compact Markdown table or bullets using only returned references and links.
Prefer concise, actionable guidance tied to the cited records.
Never claim you changed record status; you are advisory unless the user uses an explicit confirmed action in the UI.`;

const CHAT_MAX_TOKENS = 1000;
const HISTORY_TURNS = 4;
const HISTORY_CONTENT_CAP = 600;
const MAX_PIN_DETAIL = 2;
const MAX_LIST_CARDS = 6;
const MAX_CROSS_CARDS = 8;
const MAX_DETAIL_CARDS = 3;

const LISTABLE_MODULES = new Set<AiIntentModule>([
  "tasks",
  "risks",
  "incidents",
  "audits",
  "documents",
  "compliance",
  "ofi",
]);

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

function uniqueCards(cards: AiContextCard[]): AiContextCard[] {
  const seen = new Set<string>();
  const out: AiContextCard[] = [];
  for (const card of cards) {
    const key = `${card.module}:${card.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(card);
  }
  return out;
}

function toCitations(cards: AiContextCard[]): AiChatCitation[] {
  return cards.map((card) => ({
    module: card.module,
    id: card.id,
    reference: card.reference,
    title: card.title,
    href: card.href,
  }));
}

function extractSearchQuery(message: string, pageContext?: AiChatPageContext): string {
  const trimmed = message.trim();
  if (trimmed.length >= 2) return trimmed.slice(0, 200);
  return pageContext?.moduleHint?.trim() || "open";
}

function priorModuleFromConversation(
  conversation: StreamChatInput["conversation"]
): string | null {
  if (!conversation?.length) return null;
  const lastAssistant = [...conversation]
    .reverse()
    .find((row) => row.role === "assistant" && row.content?.trim());
  if (!lastAssistant) return null;
  const text = lastAssistant.content;
  const hit = text.match(
    /\b(tasks?|risks?|incidents?|audits?|documents?|compliance|ofi)\b/i
  );
  if (!hit) return null;
  const word = hit[1]!.toLowerCase();
  if (word.startsWith("task")) return "tasks";
  if (word.startsWith("risk")) return "risks";
  if (word.startsWith("incident")) return "incidents";
  if (word.startsWith("audit")) return "audits";
  if (word.startsWith("document")) return "documents";
  if (word === "compliance") return "compliance";
  if (word === "ofi") return "ofi";
  return null;
}

function capHistory(
  conversation: StreamChatInput["conversation"]
): Array<{ role: "user" | "assistant"; content: string }> {
  return (conversation ?? [])
    .filter((row) => row.content?.trim())
    .slice(-HISTORY_TURNS * 2)
    .map((row) => {
      let content = row.content.trim();
      // Drop huge prior tables / dumps that burn tokens.
      if (content.length > HISTORY_CONTENT_CAP) {
        content = `${content.slice(0, HISTORY_CONTENT_CAP - 1)}…`;
      }
      return {
        role: row.role as "user" | "assistant",
        content,
      };
    });
}

function logChatTelemetry(input: {
  intent: AiChatIntent;
  cardCount: number;
  promptChars: number;
  empty: boolean;
}): void {
  // No PII bodies — module/mode/counts only.
  console.info(
    "[alice-chat]",
    JSON.stringify({
      module: input.intent.primaryModule,
      mode: input.intent.mode,
      cardCount: input.cardCount,
      promptChars: input.promptChars,
      empty: input.empty,
      filters: input.intent.filters,
    })
  );
}

export type AiChatServiceDeps = {
  threads: AiChatThreadRepository;
  authorizer: Authorizer;
  gpt: AiGptPort;
  context: AiContextPort;
};

export type AiChatService = ReturnType<typeof createAiChatService>;

export function createAiChatService(deps: AiChatServiceDeps) {
  const { threads, authorizer, gpt, context } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: AI_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError("User does not have permission to access AI");
    }
  }

  async function gatherPinnedDetail(
    identity: SecurityIdentity,
    organizationId: string,
    input: StreamChatInput
  ): Promise<AiContextCard[]> {
    const cards: AiContextCard[] = [];
    const pinned = [
      ...(input.pinnedRecords ?? []),
      ...((input.pageContext?.selectedIds ?? []).map((row) => ({
        module: row.module,
        id: row.id,
      })) as AiChatPinnedRecord[]),
    ].slice(0, MAX_PIN_DETAIL);

    for (const pin of pinned) {
      if (!pin.module || !pin.id) continue;
      const card = await context.getRecordCard({
        organizationId,
        identity,
        module: pin.module,
        id: pin.id,
      });
      if (!card) continue;
      const detail = toDetailCard(card);
      const activities = await context.getActivitiesSummary({
        organizationId,
        module: pin.module,
        id: pin.id,
        limit: 2,
      });
      if (activities.length > 0) {
        detail.summary = `${detail.summary}\nRecent: ${activities.join("; ")}`;
      }
      cards.push(toDetailCard(detail));
    }
    return cards;
  }

  /**
   * Intent-only retrieval. Empty result means empty — never dump unrelated modules.
   */
  async function gatherCards(
    identity: SecurityIdentity,
    organizationId: string,
    input: StreamChatInput,
    intent: AiChatIntent
  ): Promise<AiContextCard[]> {
    const pinned = await gatherPinnedDetail(identity, organizationId, input);
    const cards: AiContextCard[] = [...pinned];

    // One-hop expand: follow-up about a cited id → that detail card only (+ pins).
    const idMention = input.message.match(
      /\b(?:about|regarding|for)\s+([A-Z]{1,6}-?[A-Z0-9-]{2,})\b/i
    );
    if (idMention?.[1] && intent.mode === "detail") {
      const searched = await context.searchRecords({
        organizationId,
        identity,
        query: idMention[1],
        limit: 2,
      });
      for (const hit of searched.slice(0, MAX_DETAIL_CARDS - pinned.length)) {
        const full = await context.getRecordCard({
          organizationId,
          identity,
          module: hit.module,
          id: hit.id,
        });
        if (full) cards.push(toDetailCard(full));
        else cards.push(toDetailCard(hit));
      }
      return uniqueCards(cards).slice(0, MAX_DETAIL_CARDS);
    }

    if (intent.mode === "list" && LISTABLE_MODULES.has(intent.primaryModule)) {
      const open = await context.listOpenByModule({
        organizationId,
        identity,
        module: intent.primaryModule,
        limit: MAX_LIST_CARDS,
        filters: intent.filters,
      });
      cards.push(...open.map(toListCard));
      return uniqueCards(cards).slice(0, MAX_LIST_CARDS + pinned.length);
    }

    if (intent.mode === "detail" && LISTABLE_MODULES.has(intent.primaryModule)) {
      const query = extractSearchQuery(input.message, input.pageContext);
      const searched = await context.searchRecords({
        organizationId,
        identity,
        query,
        limit: MAX_DETAIL_CARDS,
      });
      for (const hit of searched) {
        if (intent.primaryModule !== "general" && hit.module !== intent.primaryModule) {
          continue;
        }
        const full = await context.getRecordCard({
          organizationId,
          identity,
          module: hit.module,
          id: hit.id,
        });
        cards.push(toDetailCard(full ?? hit));
      }
      return uniqueCards(cards).slice(0, MAX_DETAIL_CARDS + pinned.length);
    }

    if (intent.mode === "cross_search" || intent.mode === "clarify") {
      const query = extractSearchQuery(input.message, input.pageContext);
      const searched = await context.searchRecords({
        organizationId,
        identity,
        query,
        limit: MAX_CROSS_CARDS,
      });
      let filtered = searched.map(toListCard);
      if (intent.primaryModule !== "general") {
        const moduleHits = filtered.filter(
          (c) => c.module === intent.primaryModule
        );
        if (moduleHits.length > 0) filtered = moduleHits;
      }
      cards.push(...filtered);
      return uniqueCards(cards).slice(0, MAX_CROSS_CARDS + pinned.length);
    }

    // clarify with no useful path — pins only
    return uniqueCards(cards);
  }

  return {
    async listThreads(
      identity: SecurityIdentity | null | undefined
    ): Promise<AiChatThreadSummary[]> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return threads.listSummaries(organizationId, actor.subjectId, 30);
    },

    async getThread(
      identity: SecurityIdentity | null | undefined,
      threadId: string
    ): Promise<AiChatThread> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const thread = await threads.findById(
        organizationId,
        actor.subjectId,
        threadId
      );
      if (!thread) throw new NotFoundError("Chat thread not found");
      return thread;
    },

    async createThread(
      identity: SecurityIdentity | null | undefined,
      input?: { title?: string; pinnedRecords?: AiChatPinnedRecord[] }
    ): Promise<AiChatThread> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      return threads.create({
        organizationId,
        userId: actor.subjectId,
        title: input?.title,
        pinnedRecords: input?.pinnedRecords,
      });
    },

    async deleteThread(
      identity: SecurityIdentity | null | undefined,
      threadId: string
    ): Promise<void> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      const ok = await threads.delete(
        organizationId,
        actor.subjectId,
        threadId
      );
      if (!ok) throw new NotFoundError("Chat thread not found");
    },

    async streamChat(
      identity: SecurityIdentity | null | undefined,
      input: StreamChatInput,
      emit: (event: ChatStreamEvent) => void,
      signal?: AbortSignal
    ): Promise<void> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const message = input.message?.trim() ?? "";
      if (!message) throw new ValidationAppError("message is required");

      let threadId = input.threadId?.trim() || "";
      if (threadId) {
        const existing = await threads.findById(
          organizationId,
          actor.subjectId,
          threadId
        );
        if (!existing) throw new NotFoundError("Chat thread not found");
      } else {
        const created = await threads.create({
          organizationId,
          userId: actor.subjectId,
          title: message.slice(0, 80),
          pinnedRecords: input.pinnedRecords,
        });
        threadId = created.id;
      }

      const intent = routeChatIntent({
        message,
        pageHint: input.pageContext?.moduleHint,
        priorModule: priorModuleFromConversation(input.conversation),
      });

      const cards = await gatherCards(actor, organizationId, input, intent);
      const citations = toCitations(cards);
      emit({ type: "citations", citations });

      const pageBits = [
        input.pageContext?.pathname
          ? `Current page: ${input.pageContext.pathname}`
          : null,
        `Retrieval intent: module=${intent.primaryModule} mode=${intent.mode}` +
          (intent.filters.priorityHigh ? " priority=High" : "") +
          (intent.filters.openOnly ? " openOnly" : "") +
          (intent.filters.overdue ? " overdue" : ""),
      ]
        .filter(Boolean)
        .join("\n");

      const recordsBlock = cardsToPromptBlock(cards, RECORD_CONTEXT_CHAR_BUDGET);
      const prompt =
        `${pageBits ? `${pageBits}\n\n` : ""}` +
        `Organisation records (use only these):\n${recordsBlock}\n\n` +
        `User question:\n${message}`;

      logChatTelemetry({
        intent,
        cardCount: cards.length,
        promptChars: prompt.length,
        empty: cards.length === 0,
      });

      const conversation = capHistory(input.conversation);

      let assistantText = "";
      await gpt.streamText(
        {
          prompt,
          systemInstructions: [{ role: "system", content: CHAT_SYSTEM }],
          conversation,
          maxTokens: CHAT_MAX_TOKENS,
        },
        (chunk) => {
          assistantText += chunk;
          emit({ type: "token", text: chunk });
        },
        signal
      );

      const updated = await threads.appendMessages(
        organizationId,
        actor.subjectId,
        threadId,
        [
          { role: "user", content: message, citations: [] },
          {
            role: "assistant",
            content: assistantText || "I could not generate a response.",
            citations,
          },
        ],
        {
          title: message.slice(0, 80),
          pinnedRecords: input.pinnedRecords,
        }
      );

      const assistantMessage = updated?.messages.at(-1);
      emit({
        type: "done",
        threadId,
        messageId: assistantMessage?.id ?? "unknown",
        citations,
      });
    },
  };
}
