/**
 * Alice dual-surface chatbot types (float + page sidebar).
 */

export type AliceChatSurface = "float" | "sidebar";

export type AiChatSurfaceMode = "general" | "page";

export type AiChatModuleHint =
  | "risks"
  | "incidents"
  | "audits"
  | "documents"
  | "compliance"
  | "ofi"
  | "tasks"
  | "suppliers"
  | "customers"
  | "other";

export type AiChatPinnedRecord = {
  module: string;
  id: string;
  label?: string;
  href?: string;
};

export type AiChatPageContext = {
  pathname?: string;
  moduleHint?: AiChatModuleHint | string;
  selectedIds?: Array<{ module: string; id: string }>;
};

export type AiChatCitation = {
  module: string;
  id: string;
  reference: string | null;
  title: string;
  href: string;
};

export type AiChatProposalAction = "create_task" | "create_ofi";

export type AiChatProposal = {
  action: AiChatProposalAction;
  payload: Record<string, unknown>;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: AiChatCitation[];
  proposals?: AiChatProposal[];
  createdAt?: string;
};

export type AiChatThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

export type AiChatThread = {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  pinnedRecords: AiChatPinnedRecord[];
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type StreamChatInput = {
  message: string;
  threadId?: string;
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

export type StreamChatHandlers = {
  onEvent: (event: ChatStreamEvent) => void;
  signal?: AbortSignal;
};
