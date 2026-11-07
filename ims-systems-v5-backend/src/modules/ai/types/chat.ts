/**
 * Floating Alice chatbot domain types.
 */

export const AI_CHAT_MODULE_HINTS = [
  "risks",
  "incidents",
  "audits",
  "documents",
  "compliance",
  "ofi",
  "tasks",
  "suppliers",
  "customers",
  "other",
] as const;
export type AiChatModuleHint = (typeof AI_CHAT_MODULE_HINTS)[number];

export type AiContextCard = {
  module: string;
  id: string;
  reference: string | null;
  title: string;
  status: string | null;
  summary: string;
  href: string;
};

export type AiChatPageContext = {
  pathname?: string;
  moduleHint?: AiChatModuleHint | string;
  selectedIds?: Array<{ module: string; id: string }>;
};

export type AiChatPinnedRecord = {
  module: string;
  id: string;
};

export type AiChatCitation = {
  module: string;
  id: string;
  reference: string | null;
  title: string;
  href: string;
};

export type AiChatMessageRole = "user" | "assistant" | "system";

export type AiChatMessage = {
  id: string;
  role: AiChatMessageRole;
  content: string;
  citations: AiChatCitation[];
  createdAt: Date;
};

export type AiChatThread = {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  pinnedRecords: AiChatPinnedRecord[];
  messages: AiChatMessage[];
  createdAt: Date;
  updatedAt: Date;
};

export type AiChatThreadSummary = {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
};

export type AiChatSurfaceMode = "general" | "page";

export type AiChatProposalAction = "create_task" | "create_ofi";

export type StreamChatInput = {
  message: string;
  threadId?: string;
  /** general = org-wide float; page = navbar sidebar tailored to route. */
  surfaceMode?: AiChatSurfaceMode;
  pageContext?: AiChatPageContext;
  pinnedRecords?: AiChatPinnedRecord[];
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type ChatStreamEvent =
  | { type: "citations"; citations: AiChatCitation[] }
  | { type: "token"; text: string }
  | {
      type: "proposal";
      action: AiChatProposalAction;
      payload: Record<string, unknown>;
    }
  | {
      type: "done";
      threadId: string;
      messageId: string;
      citations: AiChatCitation[];
    }
  | { type: "error"; message: string };
