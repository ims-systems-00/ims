/**
 * Public surface for AI / Alice (Analytical Assistant + floating chat).
 */

export { AnalyticalAssistantSheet } from "./components/analytical-assistant-sheet";
export { AliceMarkdown } from "./components/alice-markdown";
export { FloatingAliceButton } from "./components/floating-alice-button";
export { AliceChatPanel } from "./components/alice-chat-panel";
export { useAliceChatStore } from "./store/use-alice-chat-store";
export {
  useAiResponsesForSourceQuery,
  useAiResponsesForSourceInfiniteQuery,
  useAiResponseQuery,
  useCreateAiResponseMutation,
  useUpdateAiResponseMutation,
  useDeleteAiResponseMutation,
  useAiChatThreadsQuery,
  useAiChatThreadQuery,
  useCreateAiChatThreadMutation,
  useDeleteAiChatThreadMutation,
  aiKeys,
} from "./hooks/use-ai";
export {
  buildRiskAssistantContext,
  buildIncidentAssistantContext,
  buildAuditAssistantContext,
} from "./lib/build-context";
export {
  riskAnalyserTemplate,
  incidentAnalyserTemplate,
  auditAnalyserTemplate,
} from "./templates";
export type {
  AiResponse,
  AiCreator,
  AiAnalyserTemplate,
  AiReportSection,
  AiSourceModuleType,
  AnalyticalAssistantContext,
  AnalyticalAssistantSource,
  CreateAiResponseInput,
  ListAiResponsesParams,
  PaginatedAiResponses,
} from "./types";
export type {
  AiChatCitation,
  AiChatMessage,
  AiChatPinnedRecord,
  AiChatThread,
  AiChatThreadSummary,
} from "./types-chat";
