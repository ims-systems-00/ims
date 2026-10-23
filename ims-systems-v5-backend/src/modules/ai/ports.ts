import type { ActivityExtraLog, ActivityModuleType } from "../activities";
import type { GptGenerateInput } from "./types";

/**
 * Language-model generation for Alice (stream + single-shot).
 */
export type AiGptPort = {
  streamText(
    input: GptGenerateInput,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void>;
  generateText(input: GptGenerateInput): Promise<string>;
};

export class NoOpAiGptAdapter implements AiGptPort {
  async streamText(
    _input: GptGenerateInput,
    onChunk: (text: string) => void
  ): Promise<void> {
    onChunk("Alice is not configured (OPEN_AI_API_KEY missing).");
  }

  async generateText(_input: GptGenerateInput): Promise<string> {
    return "Alice is not configured (OPEN_AI_API_KEY missing).";
  }
}

/**
 * Automated Activity timeline writes on the parent business record.
 */
export type AiActivityPort = {
  recordAnalysisSaved(input: {
    organizationId: string;
    moduleType: ActivityModuleType;
    moduleId: string;
    actorId: string;
    actorName: string;
  }): Promise<void>;
  recordAnalysisDeleted(input: {
    organizationId: string;
    moduleType: ActivityModuleType;
    moduleId: string;
    actorId: string;
    actorName: string;
    originalConductorName: string;
    conductedOn: Date;
    extraLogs?: ActivityExtraLog[];
  }): Promise<void>;
};

export class NoOpAiActivityAdapter implements AiActivityPort {
  async recordAnalysisSaved(): Promise<void> {}
  async recordAnalysisDeleted(): Promise<void> {}
}

/**
 * Resolve a display name for activity message text.
 */
export type AiActorDirectoryPort = {
  getDisplayName(userId: string): Promise<string>;
};

export class FallbackAiActorDirectoryAdapter implements AiActorDirectoryPort {
  async getDisplayName(userId: string): Promise<string> {
    return userId.trim() || "A user";
  }
}
