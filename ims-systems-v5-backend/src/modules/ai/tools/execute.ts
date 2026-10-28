/**
 * Dispatch + execute Alice chat tools under permissioned AiContextPort.
 */

import type { SecurityIdentity } from "../../../security";
import { ValidationAppError } from "../../../shared";
import { cardsToPromptBlock, toListCard } from "../lib/context-cards";
import type { AiContextPort } from "../ports";
import type { AiContextCard } from "../types/chat";
import {
  getActivitiesArgsSchema,
  getRecordArgsSchema,
  listIncidentsArgsSchema,
  listLimitOnlySchema,
  listRisksArgsSchema,
  listTasksArgsSchema,
  proposeCreateOfiArgsSchema,
  proposeCreateTaskArgsSchema,
  searchDocumentsArgsSchema,
  searchRecordsArgsSchema,
} from "./schemas";

export type AliceToolExecuteContext = {
  organizationId: string;
  identity: SecurityIdentity;
  context: AiContextPort;
};

export type AliceToolResult = {
  ok: boolean;
  tool: string;
  cards: AiContextCard[];
  /** Compact text for the model tool message. */
  content: string;
  /** Non-card payloads (e.g. confirmed-write proposals). */
  meta?: Record<string, unknown>;
};

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new ValidationAppError("Tool arguments must be valid JSON");
  }
}

function cardsContent(tool: string, cards: AiContextCard[]): string {
  if (cards.length === 0) {
    return JSON.stringify({
      tool,
      count: 0,
      message: "No matching organisation records found.",
      records: [],
    });
  }
  return JSON.stringify({
    tool,
    count: cards.length,
    records: cards.map((c) => ({
      module: c.module,
      id: c.id,
      reference: c.reference,
      title: c.title,
      status: c.status,
      href: c.href,
      summary: c.summary,
    })),
  });
}

export async function executeAliceTool(
  name: string,
  rawArgs: string,
  ctx: AliceToolExecuteContext
): Promise<AliceToolResult> {
  const { organizationId, identity, context } = ctx;

  switch (name) {
    case "list_risks": {
      const args = listRisksArgsSchema.parse(parseArgs(rawArgs));
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "risks",
        limit: args.limit,
        filters: {
          riskStatus: args.status,
          updatedSinceDays: args.updatedSinceDays,
          openOnly: !args.status || args.status === "Open",
        },
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "list_tasks": {
      const args = listTasksArgsSchema.parse(parseArgs(rawArgs));
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "tasks",
        limit: args.limit,
        filters: {
          priority: args.priority,
          priorityHigh: args.priority === "High",
          openOnly: args.incomplete !== false,
          overdue: args.overdue,
          updatedSinceDays: args.updatedSinceDays,
        },
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "list_incidents": {
      const args = listIncidentsArgsSchema.parse(parseArgs(rawArgs));
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "incidents",
        limit: args.limit,
        filters: {
          priorityHigh: args.priorityHigh,
          openOnly: true,
        },
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "list_ofi": {
      const args = listLimitOnlySchema.parse(parseArgs(rawArgs));
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "ofi",
        limit: args.limit,
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "list_audits": {
      const args = listLimitOnlySchema.parse(parseArgs(rawArgs));
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "audits",
        limit: args.limit,
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "list_documents": {
      const args = listLimitOnlySchema.parse(parseArgs(rawArgs));
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "documents",
        limit: args.limit,
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "get_record": {
      const args = getRecordArgsSchema.parse(parseArgs(rawArgs));
      const card = await context.getRecordCard({
        organizationId,
        identity,
        module: args.module,
        id: args.id,
      });
      const cards = card ? [card] : [];
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "search_records": {
      const args = searchRecordsArgsSchema.parse(parseArgs(rawArgs));
      let cards = await context.searchRecords({
        organizationId,
        identity,
        query: args.query,
        limit: args.limit,
      });
      if (args.modules?.length) {
        const allow = new Set(args.modules);
        cards = cards.filter((c) => allow.has(c.module as never));
      }
      cards = cards.map(toListCard).slice(0, args.limit);
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "search_documents": {
      const args = searchDocumentsArgsSchema.parse(parseArgs(rawArgs));
      const searchDocs =
        context.searchDocuments?.bind(context) ??
        (async () => {
          const all = await context.searchRecords({
            organizationId,
            identity,
            query: args.query,
            limit: args.limit,
          });
          return all.filter((c) => c.module === "documents");
        });
      const cards = await searchDocs({
        organizationId,
        identity,
        query: args.query,
        limit: args.limit,
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: cardsContent(name, cards),
      };
    }
    case "get_activities": {
      const args = getActivitiesArgsSchema.parse(parseArgs(rawArgs));
      const lines = await context.getActivitiesSummary({
        organizationId,
        module: args.module,
        id: args.id,
        limit: args.limit,
      });
      return {
        ok: true,
        tool: name,
        cards: [],
        content: JSON.stringify({
          tool: name,
          module: args.module,
          id: args.id,
          activities: lines,
        }),
        meta: { activities: lines },
      };
    }
    case "propose_create_task": {
      const args = proposeCreateTaskArgsSchema.parse(parseArgs(rawArgs));
      const proposal = {
        action: "create_task",
        requiresUiConfirmation: true,
        payload: args,
        message:
          "No task was created. Ask the user to confirm in the UI before any write.",
      };
      return {
        ok: true,
        tool: name,
        cards: [],
        content: JSON.stringify(proposal),
        meta: proposal,
      };
    }
    case "propose_create_ofi": {
      const args = proposeCreateOfiArgsSchema.parse(parseArgs(rawArgs));
      const proposal = {
        action: "create_ofi",
        requiresUiConfirmation: true,
        payload: args,
        message:
          "No OFI was created. Ask the user to confirm in the UI before any write.",
      };
      return {
        ok: true,
        tool: name,
        cards: [],
        content: JSON.stringify(proposal),
        meta: proposal,
      };
    }
    default:
      throw new ValidationAppError(`Unknown tool: ${name}`);
  }
}

/** Format cards for optional prompt injection (pins). */
export function pinnedCardsBlock(cards: AiContextCard[]): string {
  if (cards.length === 0) return "";
  return `Pinned / page-selected records:\n${cardsToPromptBlock(cards)}\n`;
}
