/**
 * OpenAI-compatible tool schemas for Alice chat agent (read-only v1).
 */

import type { GptToolDefinition } from "../types";

const limitProp = {
  type: "integer",
  minimum: 1,
  maximum: 8,
  description: "Max rows to return (default 6, max 8).",
} as const;

export const ALICE_CHAT_TOOLS: GptToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_risks",
      description:
        "List organisation risk records with structured filters. Use for escalated/open/recent risks — never invent refs. For 'recently' default updatedSinceDays to 30.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["Open", "Escalated", "Accepted", "Mitigated"],
            description: "Risk display status filter.",
          },
          updatedSinceDays: {
            type: "integer",
            minimum: 1,
            maximum: 365,
            description:
              "Only risks updated within this many days. Use 30 for 'recently'.",
          },
          limit: limitProp,
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description:
        "List organisation tasks. Use for high priority, incomplete, overdue, ASAP asks.",
      parameters: {
        type: "object",
        properties: {
          priority: {
            type: "string",
            enum: ["High", "Medium", "Low"],
          },
          incomplete: {
            type: "boolean",
            description: "When true (default), exclude Complete tasks.",
          },
          overdue: {
            type: "boolean",
            description: "When true, only tasks past dueDate and incomplete.",
          },
          updatedSinceDays: {
            type: "integer",
            minimum: 1,
            maximum: 365,
          },
          limit: limitProp,
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_incidents",
      description: "List open incidents, optionally high priority.",
      parameters: {
        type: "object",
        properties: {
          priorityHigh: { type: "boolean" },
          limit: limitProp,
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_ofi",
      description: "List open OFIs / continual improvement items.",
      parameters: {
        type: "object",
        properties: { limit: limitProp },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_audits",
      description: "List open / in-progress audits.",
      parameters: {
        type: "object",
        properties: { limit: limitProp },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "List recently updated published documents.",
      parameters: {
        type: "object",
        properties: { limit: limitProp },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_record",
      description:
        "Fetch one record by module and id (or when user asks about a cited reference id).",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: [
              "risks",
              "tasks",
              "incidents",
              "audits",
              "documents",
              "ofi",
              "compliance",
            ],
          },
          id: { type: "string", minLength: 1 },
        },
        required: ["module", "id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_records",
      description:
        "Free-text search across modules when structured list filters are not enough. Prefer list_* tools for status/priority/escalated asks.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 2 },
          modules: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "risks",
                "tasks",
                "incidents",
                "audits",
                "documents",
                "ofi",
                "compliance",
              ],
            },
          },
          limit: limitProp,
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_documents",
      description:
        "Search published policies/SOPs/documents by name, reference, or purpose (document hybrid retrieval).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 2 },
          limit: limitProp,
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activities",
      description: "Recent activity timeline snippets for one record.",
      parameters: {
        type: "object",
        properties: {
          module: { type: "string" },
          id: { type: "string", minLength: 1 },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 5,
          },
        },
        required: ["module", "id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_create_task",
      description:
        "Propose creating a task. Does NOT write to the database. Returns a confirmation payload the UI must confirm before any write.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          priority: {
            type: "string",
            enum: ["High", "Medium", "Low"],
          },
          dueDate: {
            type: "string",
            description: "ISO date YYYY-MM-DD if known",
          },
          notes: { type: "string" },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_create_ofi",
      description:
        "Propose creating an OFI. Does NOT write. Returns a confirmation payload for the UI.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: "string" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
];
