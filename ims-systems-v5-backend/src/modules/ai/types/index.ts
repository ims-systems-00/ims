/**
 * AI / Alice (Analytical Assistant) domain types.
 * Spec: docs/module-specifications/ai.md
 */

export const AI_RESOURCE = "ai";

/**
 * Source module types an analysis may be linked to.
 * Primary FE hosts: risks, incidents, audits, cips (CIP template incomplete in V4).
 */
export const AI_SOURCE_MODULE_TYPES = [
  "risks",
  "incidents",
  "audits",
  "cips",
  "tasks",
  "customers",
  "documenttrees",
  "expensereports",
  "managementreviews",
  "kpiobjectives",
  "suppliers",
] as const;
export type AiSourceModuleType = (typeof AI_SOURCE_MODULE_TYPES)[number];

export const GPT_MESSAGE_ROLES = [
  "system",
  "assistant",
  "user",
  "tool",
] as const;
export type GptMessageRole = (typeof GPT_MESSAGE_ROLES)[number];

export type GptToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type GptMessage = {
  role: GptMessageRole;
  content?: string | null;
  /** Assistant tool calls (OpenAI-compatible). */
  tool_calls?: GptToolCall[];
  /** Tool result messages must set tool_call_id. */
  tool_call_id?: string;
  name?: string;
};

export type GptToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type GptCompleteTurnInput = {
  messages: GptMessage[];
  tools?: GptToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  /** When true, force a final text answer (no more tools). */
  toolChoice?: "auto" | "none";
};

export type GptCompleteTurnResult = {
  content: string | null;
  toolCalls: GptToolCall[];
  finishReason: string | null;
};

export type AiReportSection = {
  name: string;
  description?: string | null;
  prompt: string;
  response?: string | null;
};

export type AiAnalyserTemplate = {
  dataDisplay: string;
  context: string;
  reportStructure: AiReportSection[];
};

export type AiResponseSource = {
  moduleType: AiSourceModuleType;
  moduleId: string;
};

/** Conductor identity returned on saved analyses (list/get/create). */
export type AiCreator = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type AiResponse = {
  id: string;
  organizationId: string;
  source: AiResponseSource;
  template: AiAnalyserTemplate;
  createdBy: AiCreator;
  createdOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

/** Persistence row — creator is a user id until the service enriches it. */
export type AiResponseRecord = Omit<AiResponse, "createdBy"> & {
  createdBy: string;
};

export type CreateAiResponseInput = {
  moduleType: AiSourceModuleType;
  module: string;
  template: AiAnalyserTemplate;
};

export type UpdateAiResponseInput = {
  template: AiAnalyserTemplate;
};

export type ListAiResponsesQuery = {
  page: number;
  pageSize: number;
  /** Filter by parent module type (V4: source.moduleType). */
  moduleType?: AiSourceModuleType;
  /** Filter by parent record id (V4: source.module). */
  moduleId?: string;
  sortDir?: "asc" | "desc";
};

export type PaginatedAiResponses = {
  items: AiResponse[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type GptGenerateInput = {
  prompt: string;
  systemInstructions: GptMessage[];
  conversation: GptMessage[];
  /** Per-call override for provider max_tokens (e.g. lean chat). */
  maxTokens?: number;
};
