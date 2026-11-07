/**
 * Public surface for AI / Alice (Analytical Assistant + dual chat surfaces).
 */

export { AnalyticalAssistantSheet } from "./components/analytical-assistant-sheet";
export { AliceMarkdown } from "./components/alice-markdown";
export { FloatingAliceButton } from "./components/floating-alice-button";
export { AliceChatPanel } from "./components/alice-chat-panel";
export { AliceChatSheet } from "./components/alice-chat-sheet";
export { AliceProposalCard } from "./components/alice-proposal-card";
export { AliceCitationChip } from "./components/alice-citation-chip";
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
  AiChatProposal,
  AiChatThread,
  AiChatThreadSummary,
  AliceChatSurface,
  AiChatSurfaceMode,
} from "./types-chat";
