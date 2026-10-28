/**
 * AI / Alice frontend types — aligned with backend `/api/v1/ai`.
 */

export const AI_SOURCE_MODULE_TYPES = [
  "risks",
  "incidents",
  "audits",
  "cips",
] as const;

export type AiSourceModuleType = (typeof AI_SOURCE_MODULE_TYPES)[number];

export type GptMessage = {
  role: "system" | "assistant" | "user";
  content?: string;
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

/** Raw template before `<= local... =>` compilation. */
export type AiAnalyserTemplateDefinition = AiAnalyserTemplate;

export type AiResponseSource = {
  moduleType: AiSourceModuleType;
  moduleId: string;
};

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
  createdOn: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateAiResponseInput = {
  moduleType: AiSourceModuleType;
  module: string;
  template: AiAnalyserTemplate;
};

export type UpdateAiResponseInput = {
  template: AiAnalyserTemplate;
};

export type ListAiResponsesParams = {
  page?: number;
  pageSize?: number;
  moduleType?: AiSourceModuleType;
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
};

export type StreamGptHandlers = {
  onChunk: (text: string) => void;
  signal?: AbortSignal;
};

export type AnalyticalAssistantSource = {
  moduleType: AiSourceModuleType;
  moduleId: string;
};

export type AnalyticalAssistantContext = {
  source: AnalyticalAssistantSource;
  /** Values for `<= local... =>` placeholders. */
  local: Record<string, unknown>;
  template: AiAnalyserTemplateDefinition;
  businessUnitId?: string;
  canCreateTasks?: boolean;
};
