import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type { KpiObjectiveRepository } from "../src/modules/kpi-objectives/repositories/kpi-objective.repository";
import {
  createKpiObjectivesService,
  computeProgressPercentage,
} from "../src/modules/kpi-objectives/services/kpi-objectives.service";
import type {
  KpiObjectiveBusinessUnitPort,
  KpiObjectiveListScopePort,
  KpiObjectiveNotificationPort,
} from "../src/modules/kpi-objectives/ports";
import type {
  CreateKpiObjectiveInput,
  KpiObjective,
} from "../src/modules/kpi-objectives/types";

function makeKpi(overrides: Partial<KpiObjective> = {}): KpiObjective {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "KPI-TEST-0001",
    value: "Reduce P1 incidents by 20%",
    privacy: "Organisational",
    targetValue: 0,
    currentValue: 0,
    progressPercentage: 0,
    unit: "",
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const createInput: CreateKpiObjectiveInput = {
  value: "Reduce P1 incidents by 20%",
  privacy: "Organisational",
};

describe("computeProgressPercentage", () => {
  it("returns 0 when target is zero", () => {
    expect(computeProgressPercentage(0, 5)).toBe(0);
  });

  it("caps at 100", () => {
    expect(computeProgressPercentage(10, 15)).toBe(100);
  });

  it("computes ratio", () => {
    expect(computeProgressPercentage(200, 50)).toBe(25);
  });
});

describe("KpiObjectivesService", () => {
  let repository: KpiObjectiveRepository;
  let authorizer: Authorizer;
  let notifications: KpiObjectiveNotificationPort;
  let businessUnits: KpiObjectiveBusinessUnitPort;
  let listScope: KpiObjectiveListScopePort;
  let service: ReturnType<typeof createKpiObjectivesService>;

  beforeEach(() => {
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    notifications = {
      notifyBusinessUnitKpiCreated: vi.fn().mockResolvedValue(undefined),
    };
    businessUnits = { exists: vi.fn().mockResolvedValue(true) };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      listOrganisational: vi.fn(),
      listByBusinessUnit: vi.fn(),
      update: vi.fn(),
      hardDelete: vi.fn(),
    } as unknown as KpiObjectiveRepository;
    service = createKpiObjectivesService({
      repository,
      authorizer,
      notifications,
      businessUnits,
      listScope,
    });
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

  it("creates organisational KPI from identity", async () => {
    const created = makeKpi();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        value: createInput.value,
        privacy: "Organisational",
        createdBy: DEV_STUB_IDENTITY.subjectId,
        businessUnitId: undefined,
      })
    );
    expect(notifications.notifyBusinessUnitKpiCreated).not.toHaveBeenCalled();
  });

  it("requires business unit for Business unit privacy and notifies HoS", async () => {
    const buId = "bbbbbbbbbbbbbbbbbbbbbbbb";
    const created = makeKpi({
      privacy: "Business unit",
      businessUnitId: buId,
    });
    vi.mocked(repository.create).mockResolvedValue(created);

    await service.create(DEV_STUB_IDENTITY, {
      value: "Unit objective",
      privacy: "Business unit",
      businessUnitId: buId,
    });

    expect(businessUnits.exists).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      buId
    );
    expect(notifications.notifyBusinessUnitKpiCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        businessUnitId: buId,
        kpiId: created.id,
      })
    );
  });

  it("rejects Business unit privacy without businessUnitId", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        value: "Missing unit",
        privacy: "Business unit",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("rejects unknown business unit", async () => {
    vi.mocked(businessUnits.exists).mockResolvedValue(false);
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        value: "Bad unit",
        privacy: "Business unit",
        businessUnitId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("update is creator-owned", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeKpi({ createdBy: "someone-else" })
    );
    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        value: "Changed",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("update rejects currentValue above targetValue", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeKpi({ targetValue: 10, currentValue: 0 })
    );
    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        currentValue: 11,
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("update recomputes progress", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeKpi({ targetValue: 100, currentValue: 0 })
    );
    vi.mocked(repository.update).mockResolvedValue(
      makeKpi({ targetValue: 100, currentValue: 40, progressPercentage: 40 })
    );

    await service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
      currentValue: 40,
    });

    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      expect.objectContaining({
        currentValue: 40,
        progressPercentage: 40,
      })
    );
  });

  it("delete is creator-owned and hard-deletes", async () => {
    const existing = makeKpi();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.hardDelete).mockResolvedValue(true);

    const removed = await service.remove(
      DEV_STUB_IDENTITY,
      existing.id
    );
    expect(removed).toEqual(existing);
    expect(repository.hardDelete).toHaveBeenCalled();
  });

  it("getById returns not found", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("list uses list scope", async () => {
    vi.mocked(repository.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 1,
    });
    await service.list(DEV_STUB_IDENTITY, {
      page: 1,
      pageSize: 50,
    });
    expect(listScope.resolveScope).toHaveBeenCalled();
    expect(repository.list).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.any(Object),
      { mode: "all" }
    );
  });

  it("public organisational statements omit business-unit rows", async () => {
    vi.mocked(repository.listOrganisational).mockResolvedValue([
      makeKpi({ value: "Org KPI" }),
    ]);
    const statements = await service.listOrganisationalStatements(
      DEV_STUB_IDENTITY.organizationId!
    );
    expect(statements).toEqual([
      expect.objectContaining({ value: "Org KPI", privacy: "Organisational" }),
    ]);
  });
});
