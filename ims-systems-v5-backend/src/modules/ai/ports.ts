import type { ActivityExtraLog, ActivityModuleType } from "../activities";
import type { AiContextCard, AiChatPinnedRecord } from "./types/chat";
import type { GptGenerateInput } from "./types";
import { AppError } from "../../shared";

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

/**
 * Fail-loud when OPEN_AI_API_KEY is missing — never emit saveable stub text.
 */
export class NoOpAiGptAdapter implements AiGptPort {
  private fail(): never {
    throw new AppError({
      message:
        "Alice is not configured. Set OPEN_AI_API_KEY on the backend to enable AI analysis.",
      statusCode: 503,
      code: "AI_NOT_CONFIGURED",
    });
  }

  async streamText(
    _input: GptGenerateInput,
    _onChunk: (text: string) => void
  ): Promise<void> {
    this.fail();
  }

  async generateText(_input: GptGenerateInput): Promise<string> {
    this.fail();
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

export type AiActorProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * Resolve display names / avatars for activity text and history list.
 */
export type AiActorDirectoryPort = {
  getDisplayName(userId: string): Promise<string>;
  getProfile(userId: string): Promise<AiActorProfile>;
  getProfiles(userIds: string[]): Promise<Map<string, AiActorProfile>>;
};

export class FallbackAiActorDirectoryAdapter implements AiActorDirectoryPort {
  async getDisplayName(userId: string): Promise<string> {
    return userId.trim() || "A user";
  }

  async getProfile(userId: string): Promise<AiActorProfile> {
    const id = userId.trim() || "unknown";
    return { id, name: id, avatarUrl: null };
  }

  async getProfiles(userIds: string[]): Promise<Map<string, AiActorProfile>> {
    const map = new Map<string, AiActorProfile>();
    for (const id of userIds) {
      map.set(id, await this.getProfile(id));
    }
    return map;
  }
}

/**
 * Permission-scoped record lookup + search for grounded Alice chat.
 */
export type AiContextPort = {
  searchRecords(input: {
    organizationId: string;
    identity: import("../../security").SecurityIdentity;
    query: string;
    limit?: number;
  }): Promise<AiContextCard[]>;

  getRecordCard(input: {
    organizationId: string;
    identity: import("../../security").SecurityIdentity;
    module: string;
    id: string;
  }): Promise<AiContextCard | null>;

  listOpenByModule(input: {
    organizationId: string;
    identity: import("../../security").SecurityIdentity;
    module: string;
    limit?: number;
    filters?: {
      priorityHigh?: boolean;
      openOnly?: boolean;
      overdue?: boolean;
    };
  }): Promise<AiContextCard[]>;

  getActivitiesSummary(input: {
    organizationId: string;
    module: string;
    id: string;
    limit?: number;
  }): Promise<string[]>;
};

export class NoOpAiContextAdapter implements AiContextPort {
  async searchRecords(): Promise<AiContextCard[]> {
    return [];
  }
  async getRecordCard(): Promise<AiContextCard | null> {
    return null;
  }
  async listOpenByModule(): Promise<AiContextCard[]> {
    return [];
  }
  async getActivitiesSummary(): Promise<string[]> {
    return [];
  }
}

export type { AiChatPinnedRecord };
