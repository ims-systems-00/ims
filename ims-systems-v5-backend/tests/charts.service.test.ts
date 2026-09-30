import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type { ChartRepository } from "../src/modules/charts/repositories/chart.repository";
import { createChartsService } from "../src/modules/charts/services/charts.service";
import type { Chart, CreateChartInput } from "../src/modules/charts/types";

function makeChart(overrides: Partial<Chart> = {}): Chart {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    name: "Risks by status",
    description: "Count risks grouped by display status",
    derivation: {
      sourceModule: "risks",
      operation: "group-count",
      groupBy: ["status"],
    },
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const createInput: CreateChartInput = {
  name: "Risks by status",
  description: "Count risks grouped by display status",
  derivation: {
    sourceModule: "risks",
    operation: "group-count",
    groupBy: ["status"],
  },
  config: { chartType: "bar", title: "Risks by status" },
};

describe("ChartsService", () => {
  let repository: ChartRepository;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createChartsService>;

  beforeEach(() => {
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn().mockResolvedValue(null),
      list: vi.fn(),
      update: vi.fn(),
      hardDelete: vi.fn(),
    } as unknown as ChartRepository;
    service = createChartsService({ repository, authorizer });
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

  it("creates a chart definition with org and actor from identity", async () => {
    const created = makeChart();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);
    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        name: "Risks by status",
        createdBy: DEV_STUB_IDENTITY.subjectId,
        derivation: createInput.derivation,
      })
    );
  });

  it("rejects duplicate names within the organisation", async () => {
    vi.mocked(repository.findByName).mockResolvedValue(makeChart());
    await expect(
      service.create(DEV_STUB_IDENTITY, createInput)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("lists charts scoped to organisation identity", async () => {
    vi.mocked(repository.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });
    await service.list(DEV_STUB_IDENTITY, {
      page: 1,
      pageSize: 20,
    });
    expect(repository.list).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({ page: 1 })
    );
  });

  it("update cannot rename — name is immutable", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeChart());
    vi.mocked(repository.update).mockResolvedValue(
      makeChart({ description: "Updated description" })
    );

    const result = await service.update(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      { description: "Updated description" }
    );
    expect(result.description).toBe("Updated description");
    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      expect.not.objectContaining({ name: expect.anything() })
    );
  });

  it("update rejects empty patch", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeChart());
    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {})
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("getById returns not found when missing", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("remove hard-deletes after existence check", async () => {
    const existing = makeChart();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.hardDelete).mockResolvedValue(true);
    const result = await service.remove(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(result.id).toBe(existing.id);
    expect(repository.hardDelete).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
  });
});
