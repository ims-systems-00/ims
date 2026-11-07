/**
 * AI / Alice application service.
 * Spec: docs/module-specifications/ai.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  ACTIVITY_MODULE_TYPES,
  type ActivityModuleType,
} from "../../activities";
import type {
  AiActivityPort,
  AiActorDirectoryPort,
  AiActorProfile,
  AiGptPort,
} from "../ports";
import type { AiResponseRepository } from "../repositories/ai-response.repository";
import {
  AI_RESOURCE,
  type AiCreator,
  type AiResponse,
  type AiResponseRecord,
  type CreateAiResponseInput,
  type GptGenerateInput,
  type ListAiResponsesQuery,
  type PaginatedAiResponses,
  type UpdateAiResponseInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

function assertTemplate(input: CreateAiResponseInput["template"]): void {
  if (!input.dataDisplay?.trim()) {
    throw new ValidationAppError("template.dataDisplay is required");
  }
  if (!input.context?.trim()) {
    throw new ValidationAppError("template.context is required");
  }
  if (!Array.isArray(input.reportStructure)) {
    throw new ValidationAppError("template.reportStructure is required");
  }
  for (const section of input.reportStructure) {
    if (!section.name?.trim()) {
      throw new ValidationAppError("Each report section requires a name");
    }
    if (!section.prompt?.trim()) {
      throw new ValidationAppError("Each report section requires a prompt");
    }
  }
}

function toActivityModuleType(
  moduleType: string
): ActivityModuleType | null {
  return (ACTIVITY_MODULE_TYPES as readonly string[]).includes(moduleType)
    ? (moduleType as ActivityModuleType)
    : null;
}

function toCreator(profile: AiActorProfile): AiCreator {
  return {
    id: profile.id,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  };
}

function enrichRecord(
  record: AiResponseRecord,
  profile: AiActorProfile
): AiResponse {
  return {
    ...record,
    createdBy: toCreator(profile),
  };
}

export type AiServiceDeps = {
  repository: AiResponseRepository;
  authorizer: Authorizer;
  gpt: AiGptPort;
  activities: AiActivityPort;
  actors: AiActorDirectoryPort;
};

export type AiService = ReturnType<typeof createAiService>;

export function createAiService(deps: AiServiceDeps) {
  const { repository, authorizer, gpt, activities, actors } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: AI_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError("User does not have permission to access AI");
    }
  }

  async function requireResponse(
    organizationId: string,
    id: string
  ): Promise<AiResponseRecord> {
    const response = await repository.findById(organizationId, id);
    if (!response) {
      throw new NotFoundError("AI response not found");
    }
    return response;
  }

  async function enrichOne(record: AiResponseRecord): Promise<AiResponse> {
    const profile = await actors.getProfile(record.createdBy);
    return enrichRecord(record, profile);
  }

  async function enrichMany(
    records: AiResponseRecord[]
  ): Promise<AiResponse[]> {
    if (records.length === 0) return [];
    const profiles = await actors.getProfiles(
      records.map((row) => row.createdBy)
    );
    return records.map((row) => {
      const profile =
        profiles.get(row.createdBy) ??
        ({
          id: row.createdBy,
          name: row.createdBy,
          avatarUrl: null,
        } satisfies AiActorProfile);
      return enrichRecord(row, profile);
    });
  }

  return {
    async streamGpt(
      identity: SecurityIdentity | null | undefined,
      input: GptGenerateInput,
      onChunk: (text: string) => void,
      signal?: AbortSignal
    ): Promise<void> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      if (!input.prompt?.trim()) {
        throw new ValidationAppError("prompt is required");
      }
      await gpt.streamText(input, onChunk, signal);
    },

    async generateGpt(
      identity: SecurityIdentity | null | undefined,
      input: GptGenerateInput
    ): Promise<{ responseMessage: string }> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      if (!input.prompt?.trim()) {
        throw new ValidationAppError("prompt is required");
      }
      const responseMessage = await gpt.generateText(input);
      return { responseMessage };
    },

    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateAiResponseInput
    ): Promise<AiResponse> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const moduleId = input.module?.trim() ?? "";
      if (!moduleId) {
        throw new ValidationAppError("module is required");
      }
      assertTemplate(input.template);

      const created = await repository.create(organizationId, {
        source: {
          moduleType: input.moduleType,
          moduleId,
        },
        template: {
          dataDisplay: input.template.dataDisplay,
          context: input.template.context,
          reportStructure: input.template.reportStructure.map((section) => ({
            name: section.name,
            description: section.description ?? null,
            prompt: section.prompt,
            response: section.response ?? null,
          })),
        },
        createdBy: actor.subjectId,
        createdOn: new Date(),
      });

      const activityModuleType = toActivityModuleType(created.source.moduleType);
      if (activityModuleType) {
        const actorName = await actors.getDisplayName(actor.subjectId);
        try {
          await activities.recordAnalysisSaved({
            organizationId,
            moduleType: activityModuleType,
            moduleId: created.source.moduleId,
            actorId: actor.subjectId,
            actorName,
          });
        } catch {
          // Activity must not fail the save response (V4 event handler behaviour).
        }
      }

      return enrichOne(created);
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListAiResponsesQuery
    ): Promise<PaginatedAiResponses> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const page = await repository.list(organizationId, query);
      return {
        ...page,
        items: await enrichMany(page.items),
      };
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<AiResponse> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read", id);
      return enrichOne(await requireResponse(organizationId, id));
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateAiResponseInput
    ): Promise<AiResponse> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "update", id);
      await requireResponse(organizationId, id);
      assertTemplate(input.template);

      const updated = await repository.updateTemplate(
        organizationId,
        id,
        {
          dataDisplay: input.template.dataDisplay,
          context: input.template.context,
          reportStructure: input.template.reportStructure.map((section) => ({
            name: section.name,
            description: section.description ?? null,
            prompt: section.prompt,
            response: section.response ?? null,
          })),
        }
      );
      if (!updated) {
        throw new NotFoundError("AI response not found");
      }
      return enrichOne(updated);
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<AiResponse> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete", id);
      const existing = await requireResponse(organizationId, id);

      const deleted = await repository.delete(organizationId, id);
      if (!deleted) {
        throw new NotFoundError("AI response not found");
      }

      const activityModuleType = toActivityModuleType(
        existing.source.moduleType
      );
      if (activityModuleType) {
        const [actorName, originalConductorName] = await Promise.all([
          actors.getDisplayName(actor.subjectId),
          actors.getDisplayName(existing.createdBy),
        ]);
        try {
          await activities.recordAnalysisDeleted({
            organizationId,
            moduleType: activityModuleType,
            moduleId: existing.source.moduleId,
            actorId: actor.subjectId,
            actorName,
            originalConductorName,
            conductedOn: existing.createdOn,
          });
        } catch {
          // Activity must not fail the delete response.
        }
      }

      return enrichOne(existing);
    },
  };
}
