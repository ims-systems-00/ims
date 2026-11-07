/**
 * Dispatch + execute Alice chat tools under permissioned AiContextPort.
 */

import type { SecurityIdentity } from "../../../security";
import { ValidationAppError } from "../../../shared";
import { cardsToPromptBlock, toListCard } from "../lib/context-cards";
import {
  resolveAliceDirectory,
  resolvePersonIdsByName,
  resolveUnitIdsByName,
} from "../lib/resolve-directory";
import { toAbsoluteAppHref } from "../lib/rewrite-app-urls";
import type { AiContextPort } from "../ports";
import type { AiContextCard } from "../types/chat";
import {
  analyticsComplianceArgsSchema,
  analyticsOrgHealthArgsSchema,
  analyticsRisksArgsSchema,
  getActivitiesArgsSchema,
  getRecordArgsSchema,
  listComplianceArgsSchema,
  listIncidentsArgsSchema,
  listLimitOnlySchema,
  listOfiArgsSchema,
  listRisksArgsSchema,
  listTasksArgsSchema,
  proposeCreateOfiArgsSchema,
  proposeCreateTaskArgsSchema,
  resolveDirectoryArgsSchema,
  searchDocumentsArgsSchema,
  searchRecordsArgsSchema,
} from "./schemas";

async function resolveNameFilters(
  organizationId: string,
  names: {
    raisedByName?: string;
    ownerName?: string;
    assigneeName?: string;
    personName?: string;
    unitName?: string;
  }
): Promise<
  | {
      ok: true;
      raisedByIds?: string[];
      ownerIds?: string[];
      assigneeIds?: string[];
      involvedPersonIds?: string[];
      businessUnitIds?: string[];
      meta: Record<string, unknown>;
    }
  | { ok: false; content: string; meta: Record<string, unknown> }
> {
  const meta: Record<string, unknown> = {};
  const out: {
    raisedByIds?: string[];
    ownerIds?: string[];
    assigneeIds?: string[];
    involvedPersonIds?: string[];
    businessUnitIds?: string[];
  } = {};

  const resolvePeople = async (
    label: string,
    name: string | undefined,
    key: "raisedByIds" | "ownerIds" | "assigneeIds" | "involvedPersonIds"
  ) => {
    if (!name) return true;
    const { ids, matches } = await resolvePersonIdsByName(
      organizationId,
      name,
      5
    );
    meta[label] = matches.map((m) => ({ id: m.id, name: m.name }));
    if (ids.length === 0) {
      return false;
    }
    out[key] = ids;
    return true;
  };

  if (
    !(await resolvePeople("raisedByMatches", names.raisedByName, "raisedByIds"))
  ) {
    return {
      ok: false,
      content: JSON.stringify({
        status: "zero_results",
        message: `No organisation member matched "${names.raisedByName}".`,
        meta,
      }),
      meta: { status: "zero_results", ...meta },
    };
  }
  if (!(await resolvePeople("ownerMatches", names.ownerName, "ownerIds"))) {
    return {
      ok: false,
      content: JSON.stringify({
        status: "zero_results",
        message: `No organisation member matched "${names.ownerName}".`,
        meta,
      }),
      meta: { status: "zero_results", ...meta },
    };
  }
  if (
    !(await resolvePeople("assigneeMatches", names.assigneeName, "assigneeIds"))
  ) {
    return {
      ok: false,
      content: JSON.stringify({
        status: "zero_results",
        message: `No organisation member matched "${names.assigneeName}".`,
        meta,
      }),
      meta: { status: "zero_results", ...meta },
    };
  }
  if (
    !(await resolvePeople(
      "personMatches",
      names.personName,
      "involvedPersonIds"
    ))
  ) {
    return {
      ok: false,
      content: JSON.stringify({
        status: "zero_results",
        message: `No organisation member matched "${names.personName}".`,
        meta,
      }),
      meta: { status: "zero_results", ...meta },
    };
  }
  if (names.unitName) {
    const { ids, matches } = await resolveUnitIdsByName(
      organizationId,
      names.unitName,
      5
    );
    meta.unitMatches = matches.map((m) => ({ id: m.id, name: m.name }));
    if (ids.length === 0) {
      return {
        ok: false,
        content: JSON.stringify({
          status: "zero_results",
          message: `No functional unit matched "${names.unitName}".`,
          meta,
        }),
        meta: { status: "zero_results", ...meta },
      };
    }
    out.businessUnitIds = ids;
  }

  return { ok: true, ...out, meta };
}

export type AliceToolExecuteContext = {
  organizationId: string;
  identity: SecurityIdentity;
  context: AiContextPort;
  /** Public frontend origin for absolute deep links in tool payloads. */
  clientAppOrigin?: string;
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

function cardsContent(
  tool: string,
  cards: AiContextCard[],
  extra?: Record<string, unknown>,
  clientAppOrigin?: string
): string {
  if (cards.length === 0) {
    const status =
      typeof extra?.status === "string" ? extra.status : "zero_results";
    return JSON.stringify({
      tool,
      count: 0,
      status,
      message:
        status === "forbidden"
          ? "Permission denied for this module — do not invent records."
          : status === "tool_error"
            ? "Tool failed — say there was a retrieval error, not that the organisation has no data."
            : "No matching organisation records found for this query.",
      records: [],
      ...(extra ?? {}),
    });
  }
  return JSON.stringify({
    tool,
    count: cards.length,
    status: "ok",
    note:
      "Use reference/title and owner/raisedBy/functionalUnit/assignee names in user-facing answers. " +
      "recordId and nested *.id are internal only — never show Mongo ObjectIds.",
    records: cards.map((c) => ({
      module: c.module,
      reference: c.reference,
      title: c.title,
      status: c.status,
      recordId: c.id,
      href: toAbsoluteAppHref(c.href, clientAppOrigin),
      summary: c.summary,
      owner: c.owner
        ? { id: c.owner.id, name: c.owner.name }
        : null,
      raisedBy: c.raisedBy
        ? { id: c.raisedBy.id, name: c.raisedBy.name }
        : null,
      functionalUnit: c.functionalUnit
        ? { id: c.functionalUnit.id, name: c.functionalUnit.name }
        : null,
      assignees: (c.assignees ?? []).map((a) => ({
        id: a.id,
        name: a.name,
      })),
    })),
    ...(extra ?? {}),
  });
}

export async function executeAliceTool(
  name: string,
  rawArgs: string,
  ctx: AliceToolExecuteContext
): Promise<AliceToolResult> {
  const { organizationId, identity, context, clientAppOrigin } = ctx;
  const pack = (cards: AiContextCard[], extra?: Record<string, unknown>) =>
    cardsContent(name, cards, extra, clientAppOrigin);

  switch (name) {
    case "resolve_directory": {
      const args = resolveDirectoryArgsSchema.parse(parseArgs(rawArgs));
      const result = await resolveAliceDirectory({
        organizationId,
        query: args.query,
        kind: args.kind,
      });
      const matches = [...result.people, ...result.units];
      return {
        ok: true,
        tool: name,
        cards: [],
        content: JSON.stringify({
          status: matches.length > 0 ? "ok" : "zero_results",
          query: result.query,
          people: result.people,
          units: result.units,
          message:
            matches.length === 0
              ? `No directory matches for "${result.query}".`
              : undefined,
        }),
        meta: {
          status: matches.length > 0 ? "ok" : "zero_results",
          people: result.people,
          units: result.units,
        },
      };
    }
    case "list_risks": {
      const args = listRisksArgsSchema.parse(parseArgs(rawArgs));
      const includeClosed = args.includeClosed === true;
      const baseFilters = {
        riskStatus: args.status,
        updatedSinceDays: args.updatedSinceDays,
        sortBy: args.sortBy,
        sortDir: args.sortDir,
        includeClosed,
        openOnly: includeClosed
          ? false
          : !args.status || args.status === "Open",
      } as const;

      const resolved = await resolveNameFilters(organizationId, {
        raisedByName: args.raisedByName,
        ownerName: args.ownerName,
        personName: args.personName,
        unitName: args.unitName,
      });
      if (!resolved.ok) {
        return {
          ok: true,
          tool: name,
          cards: [],
          content: resolved.content,
          meta: resolved.meta,
        };
      }

      const listWith = (personFilters: {
        raisedByIds?: string[];
        ownerIds?: string[];
        involvedPersonIds?: string[];
        businessUnitIds?: string[];
      }) =>
        context.listOpenByModule({
          organizationId,
          identity,
          module: "risks",
          limit: args.limit,
          filters: {
            ...baseFilters,
            ...personFilters,
            businessUnitIds:
              personFilters.businessUnitIds ?? resolved.businessUnitIds,
          },
        });

      // Vague personName → multi-role OR (raiser OR owner).
      if (resolved.involvedPersonIds?.length) {
        const cards = await listWith({
          involvedPersonIds: resolved.involvedPersonIds,
        });
        const meta = {
          ...resolved.meta,
          matchedRole: "involved",
          matchedRoles: ["raisedBy", "owner"],
        };
        return {
          ok: true,
          tool: name,
          cards,
          content: pack(cards, meta),
          meta,
        };
      }

      // Precise raiser: try raisedBy, then sibling owner fallback.
      if (resolved.raisedByIds?.length && !resolved.ownerIds?.length) {
        let cards = await listWith({ raisedByIds: resolved.raisedByIds });
        let matchedRole: "raisedBy" | "owner" = "raisedBy";
        if (cards.length === 0) {
          cards = await listWith({ ownerIds: resolved.raisedByIds });
          matchedRole = "owner";
        }
        const meta = {
          ...resolved.meta,
          matchedRole,
          note:
            matchedRole === "owner"
              ? "No risks as raiser; matched the same person as owner instead. Say that clearly — do not claim none exist."
              : undefined,
        };
        return {
          ok: true,
          tool: name,
          cards,
          content: pack(cards, meta),
          meta,
        };
      }

      // Precise owner: try owner, then sibling raiser fallback.
      if (resolved.ownerIds?.length && !resolved.raisedByIds?.length) {
        let cards = await listWith({ ownerIds: resolved.ownerIds });
        let matchedRole: "owner" | "raisedBy" = "owner";
        if (cards.length === 0) {
          cards = await listWith({ raisedByIds: resolved.ownerIds });
          matchedRole = "raisedBy";
        }
        const meta = {
          ...resolved.meta,
          matchedRole,
          note:
            matchedRole === "raisedBy"
              ? "No risks as owner; matched the same person as raiser instead. Say that clearly — do not claim none exist."
              : undefined,
        };
        return {
          ok: true,
          tool: name,
          cards,
          content: pack(cards, meta),
          meta,
        };
      }

      // Both roles provided explicitly, or neither person filter.
      const cards = await listWith({
        raisedByIds: resolved.raisedByIds,
        ownerIds: resolved.ownerIds,
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: pack(cards, resolved.meta),
        meta: resolved.meta,
      };
    }
    case "list_compliance": {
      const args = listComplianceArgsSchema.parse(parseArgs(rawArgs));
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "compliance",
        limit: args.limit,
        filters: {
          selectedOnly: args.selectedOnly,
          notImplementedOnly: args.notImplementedOnly,
        },
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: pack(cards),
      };
    }
    case "analytics_risks": {
      const args = analyticsRisksArgsSchema.parse(parseArgs(rawArgs));
      const includeClosed =
        args.includeClosed ??
        (args.metric === "oldest_raised" || args.metric === "newest_raised");
      if (!context.analyticsRisks) {
        return {
          ok: false,
          tool: name,
          cards: [],
          content: pack([], { status: "tool_error" }),
        };
      }
      const result = await context.analyticsRisks({
        organizationId,
        identity,
        metric: args.metric,
        includeClosed,
        limit: args.limit,
      });
      return {
        ok: true,
        tool: name,
        cards: result.cards,
        content: pack(result.cards, result.meta),
        meta: result.meta,
      };
    }
    case "analytics_compliance": {
      const args = analyticsComplianceArgsSchema.parse(parseArgs(rawArgs));
      if (!context.analyticsCompliance) {
        return {
          ok: false,
          tool: name,
          cards: [],
          content: pack([], { status: "tool_error" }),
        };
      }
      const result = await context.analyticsCompliance({
        organizationId,
        identity,
        focus: args.focus,
        limit: args.limit,
      });
      return {
        ok: true,
        tool: name,
        cards: result.cards,
        content: pack(result.cards, result.meta),
        meta: result.meta,
      };
    }
    case "analytics_org_health": {
      const args = analyticsOrgHealthArgsSchema.parse(parseArgs(rawArgs));
      if (!context.analyticsOrgHealth) {
        return {
          ok: false,
          tool: name,
          cards: [],
          content: pack([], { status: "tool_error" }),
        };
      }
      const result = await context.analyticsOrgHealth({
        organizationId,
        identity,
        limit: args.limit,
      });
      return {
        ok: true,
        tool: name,
        cards: result.cards,
        content: pack(result.cards, result.meta),
        meta: result.meta,
      };
    }
    case "list_tasks": {
      const args = listTasksArgsSchema.parse(parseArgs(rawArgs));
      const resolved = await resolveNameFilters(organizationId, {
        assigneeName: args.assigneeName,
        unitName: args.unitName,
      });
      if (!resolved.ok) {
        return {
          ok: true,
          tool: name,
          cards: [],
          content: resolved.content,
          meta: resolved.meta,
        };
      }
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
          assigneeIds: resolved.assigneeIds,
          businessUnitIds: resolved.businessUnitIds,
        },
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: pack(cards, resolved.meta),
        meta: resolved.meta,
      };
    }
    case "list_incidents": {
      const args = listIncidentsArgsSchema.parse(parseArgs(rawArgs));
      const resolved = await resolveNameFilters(organizationId, {
        ownerName: args.ownerName,
        unitName: args.unitName,
      });
      if (!resolved.ok) {
        return {
          ok: true,
          tool: name,
          cards: [],
          content: resolved.content,
          meta: resolved.meta,
        };
      }
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "incidents",
        limit: args.limit,
        filters: {
          priorityHigh: args.priorityHigh,
          openOnly: true,
          ownerIds: resolved.ownerIds,
          businessUnitIds: resolved.businessUnitIds,
        },
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: pack(cards, resolved.meta),
        meta: resolved.meta,
      };
    }
    case "list_ofi": {
      const args = listOfiArgsSchema.parse(parseArgs(rawArgs));
      const resolved = await resolveNameFilters(organizationId, {
        ownerName: args.ownerName,
        unitName: args.unitName,
      });
      if (!resolved.ok) {
        return {
          ok: true,
          tool: name,
          cards: [],
          content: resolved.content,
          meta: resolved.meta,
        };
      }
      const cards = await context.listOpenByModule({
        organizationId,
        identity,
        module: "ofi",
        limit: args.limit,
        filters: {
          ownerIds: resolved.ownerIds,
          businessUnitIds: resolved.businessUnitIds,
        },
      });
      return {
        ok: true,
        tool: name,
        cards,
        content: pack(cards, resolved.meta),
        meta: resolved.meta,
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
        content: pack(cards),
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
        content: pack(cards),
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
        content: pack(cards),
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
        content: pack(cards),
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
        content: pack(cards),
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
export function pinnedCardsBlock(
  cards: AiContextCard[],
  clientAppOrigin?: string
): string {
  if (cards.length === 0) return "";
  return `Pinned / page-selected records:\n${cardsToPromptBlock(cards, undefined, clientAppOrigin)}\n`;
}
