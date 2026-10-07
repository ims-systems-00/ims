import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type { TagAndCategoryRepository } from "../src/modules/tags-and-categories/repositories/tag-and-category.repository";
import { createTagsAndCategoriesService } from "../src/modules/tags-and-categories/services/tags-and-categories.service";
import type {
  CreateTagAndCategoryInput,
  TagAndCategory,
} from "../src/modules/tags-and-categories/types";

function makeTag(overrides: Partial<TagAndCategory> = {}): TagAndCategory {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    name: "Operational risk",
    description: "Day-to-day operational classification",
    applicableModules: ["risks", "incidents"],
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const createInput: CreateTagAndCategoryInput = {
  name: "Operational risk",
  description: "Day-to-day operational classification",
  applicableModules: ["risks", "incidents"],
};

describe("TagsAndCategoriesService", () => {
  let repository: TagAndCategoryRepository;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createTagsAndCategoriesService>;

  beforeEach(() => {
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      hardDelete: vi.fn(),
    } as unknown as TagAndCategoryRepository;
    service = createTagsAndCategoriesService({ repository, authorizer });
  });

  it("rejects unauthenticated create", async () => {
    await expect(service.create(null, createInput)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("rejects forbidden access", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.create(DEV_STUB_IDENTITY, createInput)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates a label with org and actor from identity", async () => {
    const created = makeTag();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        name: "Operational risk",
        description: "Day-to-day operational classification",
        applicableModules: ["risks", "incidents"],
        createdBy: DEV_STUB_IDENTITY.subjectId,
      })
    );
  });

  it("rejects empty name", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, { name: "   " })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("deduplicates applicable modules on create", async () => {
    vi.mocked(repository.create).mockResolvedValue(makeTag());
    await service.create(DEV_STUB_IDENTITY, {
      name: "Dup modules",
      applicableModules: ["risks", "risks", "incidents"],
    });
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        applicableModules: ["risks", "incidents"],
      })
    );
  });

  it("update persists name/description only", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeTag());
    vi.mocked(repository.update).mockResolvedValue(
      makeTag({ name: "Renamed", description: "New desc" })
    );

    await service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
      name: "Renamed",
      description: "New desc",
    });

    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      expect.objectContaining({
        name: "Renamed",
        description: "New desc",
        updatedBy: DEV_STUB_IDENTITY.subjectId,
      })
    );
    const patch = vi.mocked(repository.update).mock.calls[0]![2];
    expect(patch).not.toHaveProperty("applicableModules");
  });

  it("getById is organisation-scoped not found", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("remove hard-deletes without cascade checks", async () => {
    const existing = makeTag();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.hardDelete).mockResolvedValue(true);

    const removed = await service.remove(
      DEV_STUB_IDENTITY,
      existing.id
    );
    expect(removed).toEqual(existing);
    expect(repository.hardDelete).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      existing.id
    );
  });

  it("listOptionsForModule returns compact options", async () => {
    vi.mocked(repository.list).mockResolvedValue({
      items: [makeTag()],
      page: 1,
      pageSize: 200,
      total: 1,
      totalPages: 1,
    });
    const options = await service.listOptionsForModule(
      DEV_STUB_IDENTITY.organizationId!,
      "risks"
    );
    expect(options).toEqual([
      expect.objectContaining({
        id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        name: "Operational risk",
        applicableModules: ["risks", "incidents"],
      }),
    ]);
    expect(repository.list).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({ applicableModule: "risks" })
    );
  });
});
