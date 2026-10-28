/**
 * Public surface for the AI / Alice (Analytical Assistant) module.
 * Other modules may import only from this entry.
 */

export { createAiRouter, createAiModule } from "./routes/ai.routes";
export type { AiRouterDeps } from "./routes/ai.routes";
export { createAiService } from "./services/ai.service";
export type { AiService, AiServiceDeps } from "./services/ai.service";
export { createAiResponseRepository } from "./repositories/ai-response.repository";
export type { AiResponseRepository } from "./repositories/ai-response.repository";
export {
  createOpenAiGptAdapter,
  GROQ_OPENAI_COMPAT_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_GROQ_MODEL,
} from "./adapters/openai-gpt.adapter";
export type { OpenAiGptAdapterOptions } from "./adapters/openai-gpt.adapter";
export { createAiActivityAdapter } from "./adapters/activity.adapter";
export { createAiActorDirectoryAdapter } from "./adapters/actor-directory.adapter";
export { createAiContextAdapter } from "./adapters/context.adapter";
export {
  NoOpAiGptAdapter,
  NoOpAiActivityAdapter,
  NoOpAiContextAdapter,
  FallbackAiActorDirectoryAdapter,
} from "./ports";
export type {
  AiGptPort,
  AiActivityPort,
  AiActorDirectoryPort,
  AiContextPort,
} from "./ports";
export { createAiChatService } from "./services/ai-chat.service";
export type { AiChatService } from "./services/ai-chat.service";
export { createAiChatThreadRepository } from "./repositories/ai-chat-thread.repository";
export type {
  AiResponse,
  AiResponseRecord,
  AiCreator,
  AiAnalyserTemplate,
  AiReportSection,
  AiResponseSource,
  AiSourceModuleType,
  CreateAiResponseInput,
  UpdateAiResponseInput,
  ListAiResponsesQuery,
  PaginatedAiResponses,
  GptGenerateInput,
  GptMessage,
  GptMessageRole,
} from "./types";
export {
  AI_RESOURCE,
  AI_SOURCE_MODULE_TYPES,
  GPT_MESSAGE_ROLES,
} from "./types";
export type { AiActorProfile } from "./ports";
