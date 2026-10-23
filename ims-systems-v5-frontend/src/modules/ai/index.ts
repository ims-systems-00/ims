/**
 * Public surface for AI / Alice (Analytical Assistant).
 */

export { AnalyticalAssistantSheet } from "./components/analytical-assistant-sheet";
export { AliceMarkdown } from "./components/alice-markdown";
export {
  useAiResponsesForSourceQuery,
  useAiResponseQuery,
  useCreateAiResponseMutation,
  useUpdateAiResponseMutation,
  useDeleteAiResponseMutation,
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
  AiAnalyserTemplate,
  AiReportSection,
  AiSourceModuleType,
  AnalyticalAssistantContext,
  AnalyticalAssistantSource,
  CreateAiResponseInput,
  ListAiResponsesParams,
  PaginatedAiResponses,
} from "./types";
