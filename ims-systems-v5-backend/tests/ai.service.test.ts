import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Authorizer, SecurityIdentity } from "../src/security";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import {
  createAiService,
  NoOpAiGptAdapter,
  type AiActivityPort,
  type AiActorDirectoryPort,
  type AiGptPort,
  type AiResponseRecord,
  type AiResponseRepository,
  type ListAiResponsesQuery,
} from "../src/modules/ai";
import type { PaginatedAiResponseRecords } from "../src/modules/ai/repositories/ai-response.repository";

const ORG = "507f1f77bcf86cd799439012";
const USER = "507f1f77bcf86cd799439011";
const RISK = "507f1f77bcf86cd799439099";

function identityFor(subjectId: string): SecurityIdentity {
  return { subjectId, organizationId: ORG, email: `${subjectId}@example.com` };
}

function sampleTemplate() {
  return {
    dataDisplay: "# Risk R-1",
    context: "You are Alice analysing a risk.",
    reportStructure: [
      {
        name: "Impact analysis",
        description: "Assess impact",
        prompt: "What is the business impact?",
        response: "High impact on operations.",
      },
    ],
  };
}

function inMemoryRepository(): AiResponseRepository {
  const rows = new Map<string, AiResponseRecord>();
  let seq = 0;
  return {
    async create(organizationId, input) {
      seq += 1;
      const now = new Date();
      const row: AiResponseRecord = {
        id: `bbbbbbbbbbbbbbbbbbbb${String(seq).padStart(4, "0")}`,
        organizationId,
        source: {
          moduleType: input.source.moduleType,
          moduleId: input.source.moduleId,
        },
        template: input.template,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
        createdAt: now,
        updatedAt: now,
      };
      rows.set(row.id, row);
      return row;
    },
    async findById(organizationId, id) {
      const row = rows.get(id);
      return row && row.organizationId === organizationId ? row : null;
    },
    async list(
      organizationId,
      query: ListAiResponsesQuery
    ): Promise<PaginatedAiResponseRecords> {
      let items = [...rows.values()].filter(
        (row) => row.organizationId === organizationId
      );
      if (query.moduleType) {
        items = items.filter(
          (row) => row.source.moduleType === query.moduleType
        );
      }
      if (query.moduleId) {
        items = items.filter((row) => row.source.moduleId === query.moduleId);
      }
      return {
        items,
        page: query.page,
        pageSize: query.pageSize,
        total: items.length,
        totalPages: 1,
      };
    },
    async updateTemplate(organizationId, id, template) {
      const existing = rows.get(id);
      if (!existing || existing.organizationId !== organizationId) return null;
      const next = { ...existing, template, updatedAt: new Date() };
      rows.set(id, next);
      return next;
    },
    async delete(organizationId, id) {
      const existing = rows.get(id);
      if (!existing || existing.organizationId !== organizationId) return false;
      return rows.delete(id);
    },
  };
}

describe("createAiService", () => {
  let repository: AiResponseRepository;
  let authorizer: Authorizer;
  let gpt: AiGptPort;
  let activities: AiActivityPort;
  let actors: AiActorDirectoryPort;

  beforeEach(() => {
    repository = inMemoryRepository();
    authorizer = {
      allow: vi.fn(async () => true),
    };
    gpt = {
      streamText: vi.fn(async (_input, onChunk) => {
        onChunk("Hello ");
        onChunk("Alice");
      }),
      generateText: vi.fn(async () => "Single shot reply"),
      completeTurn: vi.fn(async () => ({
        content: "ok",
        toolCalls: [],
        finishReason: "stop",
      })),
    };
    activities = {
      recordAnalysisSaved: vi.fn(async () => undefined),
      recordAnalysisDeleted: vi.fn(async () => undefined),
    };
    actors = {
      getDisplayName: vi.fn(async (id) =>
        id === USER ? "Test User" : `User ${id}`
      ),
      getProfile: vi.fn(async (id) => ({
        id,
        name: id === USER ? "Test User" : `User ${id}`,
        avatarUrl:
          id === USER ? "https://cdn.example/avatar.png" : null,
      })),
      getProfiles: vi.fn(async (ids) => {
        const map = new Map();
        for (const id of ids) {
          map.set(id, {
            id,
            name: id === USER ? "Test User" : `User ${id}`,
            avatarUrl:
              id === USER ? "https://cdn.example/avatar.png" : null,
          });
        }
        return map;
      }),
    };
  });

  function service() {
    return createAiService({
      repository,
      authorizer,
      gpt,
      activities,
      actors,
    });
  }

  it("requires authentication", async () => {
    await expect(
      service().list(null, { page: 1, pageSize: 20 })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requires organisation context", async () => {
    await expect(
      service().list(
        { subjectId: USER, organizationId: null },
        { page: 1, pageSize: 20 }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("streams GPT chunks", async () => {
    const chunks: string[] = [];
    await service().streamGpt(
      identityFor(USER),
      {
        prompt: "Analyse this",
        systemInstructions: [{ role: "system", content: "Be Alice" }],
        conversation: [],
      },
      (chunk) => chunks.push(chunk)
    );
    expect(chunks.join("")).toBe("Hello Alice");
    expect(gpt.streamText).toHaveBeenCalledOnce();
  });

  it("returns a normal GPT response", async () => {
    const result = await service().generateGpt(identityFor(USER), {
      prompt: "Summarise",
      systemInstructions: [],
      conversation: [],
    });
    expect(result.responseMessage).toBe("Single shot reply");
  });

  it("rejects empty GPT prompt", async () => {
    await expect(
      service().generateGpt(identityFor(USER), {
        prompt: "   ",
        systemInstructions: [],
        conversation: [],
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("creates a saved analysis and records activity", async () => {
    const created = await service().create(identityFor(USER), {
      moduleType: "risks",
      module: RISK,
      template: sampleTemplate(),
    });

    expect(created.source).toEqual({ moduleType: "risks", moduleId: RISK });
    expect(created.createdBy).toEqual({
      id: USER,
      name: "Test User",
      avatarUrl: "https://cdn.example/avatar.png",
    });
    expect(activities.recordAnalysisSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG,
        moduleType: "risks",
        moduleId: RISK,
        actorId: USER,
        actorName: "Test User",
      })
    );
  });

  it("lists analyses with enriched creator profiles", async () => {
    await service().create(identityFor(USER), {
      moduleType: "risks",
      module: RISK,
      template: sampleTemplate(),
    });
    await service().create(identityFor(USER), {
      moduleType: "incidents",
      module: "507f1f77bcf86cd799439088",
      template: sampleTemplate(),
    });

    const listed = await service().list(identityFor(USER), {
      page: 1,
      pageSize: 20,
      moduleType: "risks",
      moduleId: RISK,
    });
    expect(listed.total).toBe(1);
    expect(listed.items[0]?.source.moduleType).toBe("risks");
    expect(listed.items[0]?.createdBy.name).toBe("Test User");
    expect(listed.items[0]?.createdBy.avatarUrl).toBe(
      "https://cdn.example/avatar.png"
    );
    expect(actors.getProfiles).toHaveBeenCalled();
  });

  it("updates a saved analysis template", async () => {
    const created = await service().create(identityFor(USER), {
      moduleType: "risks",
      module: RISK,
      template: sampleTemplate(),
    });
    const updated = await service().update(identityFor(USER), created.id, {
      template: {
        ...sampleTemplate(),
        context: "Updated context",
      },
    });
    expect(updated.template.context).toBe("Updated context");
    expect(updated.createdBy.id).toBe(USER);
  });

  it("deletes a saved analysis and records activity", async () => {
    const created = await service().create(identityFor(USER), {
      moduleType: "audits",
      module: RISK,
      template: sampleTemplate(),
    });
    const removed = await service().remove(identityFor(USER), created.id);
    expect(removed.id).toBe(created.id);
    expect(removed.createdBy.name).toBe("Test User");
    expect(activities.recordAnalysisDeleted).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleType: "audits",
        moduleId: RISK,
        actorName: "Test User",
        originalConductorName: "Test User",
      })
    );
    await expect(
      service().getById(identityFor(USER), created.id)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("skips parent activity when module type is not activity-backed", async () => {
    await service().create(identityFor(USER), {
      moduleType: "suppliers",
      module: RISK,
      template: sampleTemplate(),
    });
    expect(activities.recordAnalysisSaved).not.toHaveBeenCalled();
  });

  it("enforces authorizer denial", async () => {
    authorizer.allow = vi.fn(async () => false);
    await expect(
      service().list(identityFor(USER), { page: 1, pageSize: 20 })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("fails loud when OpenAI is not configured", async () => {
    gpt = new NoOpAiGptAdapter();
    await expect(
      service().generateGpt(identityFor(USER), {
        prompt: "Analyse",
        systemInstructions: [],
        conversation: [],
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "AI_NOT_CONFIGURED",
    } satisfies Partial<AppError>);
  });
});
