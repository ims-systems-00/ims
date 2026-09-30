import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type { BusinessPremiseFunctionalUnitPort } from "../src/modules/business-premise/ports";
import type { BusinessPremiseRepository } from "../src/modules/business-premise/repositories/business-premise.repository";
import { createBusinessPremiseService } from "../src/modules/business-premise/services/business-premise.service";
import type { BusinessPremise } from "../src/modules/business-premise/types";

const UNIT_A = "cccccccccccccccccccccccc";
const UNIT_B = "dddddddddddddddddddddddd";
const UNIT_EXTERNAL = "eeeeeeeeeeeeeeeeeeeeeeee";

function makePremise(
  overrides: Partial<BusinessPremise> = {}
): BusinessPremise {
  const now = new Date("2026-06-15T10:00:00.000Z");
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "",
    name: "Head Office",
    location: "Manchester",
    address: "1 Market Street",
    functionalUnitIds: [UNIT_A],
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("BusinessPremiseService", () => {
  let repository: BusinessPremiseRepository;
  let functionalUnits: BusinessPremiseFunctionalUnitPort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createBusinessPremiseService>;

  const createInput = {
    name: "Head Office",
    location: "Manchester",
    address: "1 Market Street",
    functionalUnitIds: [UNIT_A],
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      hardDelete: vi.fn(),
      attachFunctionalUnit: vi.fn(),
    };
    functionalUnits = {
      findByIds: vi.fn().mockImplementation(async (_org, ids: string[]) =>
        ids.map((id) => ({
          id,
          name: `Unit ${id.slice(-4)}`,
          accessType:
            id === UNIT_EXTERNAL
              ? "External function"
              : "Internal business function",
        }))
      ),
    };
    authorizer = {
      allow: vi.fn().mockResolvedValue(true),
    };
    service = createBusinessPremiseService({
      repository,
      authorizer,
      functionalUnits,
    });
  });

  it("rejects unauthenticated create", async () => {
    await expect(service.create(null, createInput)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("rejects forbidden list", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.list(DEV_STUB_IDENTITY, {
        page: 1,
        pageSize: 20,
        sort: "createdOn",
        sortDir: "desc",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates a premise with validated functional units", async () => {
    const created = makePremise();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);

    expect(result).toEqual(created);
    expect(functionalUnits.findByIds).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      [UNIT_A]
    );
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        name: "Head Office",
        location: "Manchester",
        address: "1 Market Street",
        functionalUnitIds: [UNIT_A],
        createdBy: DEV_STUB_IDENTITY.subjectId,
      })
    );
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        resourceType: "business-premises",
      })
    );
  });

  it("rejects create when a Functional Unit is missing", async () => {
    vi.mocked(functionalUnits.findByIds).mockResolvedValue([]);

    await expect(
      service.create(DEV_STUB_IDENTITY, createInput)
    ).rejects.toBeInstanceOf(ValidationAppError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects create when a unit is not Internal business function", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        ...createInput,
        functionalUnitIds: [UNIT_EXTERNAL],
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("uses create permission for update (spec / V4)", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makePremise());
    vi.mocked(repository.update).mockResolvedValue(
      makePremise({ name: "Updated" })
    );

    await service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
      name: "Updated",
    });

    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create" })
    );
  });

  it("replaces functional unit list on update", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makePremise());
    vi.mocked(repository.update).mockResolvedValue(
      makePremise({ functionalUnitIds: [UNIT_A, UNIT_B] })
    );

    await service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
      functionalUnitIds: [UNIT_A, UNIT_B],
    });

    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      expect.objectContaining({
        functionalUnitIds: [UNIT_A, UNIT_B],
      })
    );
  });

  it("hard-deletes with delete permission", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makePremise());
    vi.mocked(repository.hardDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");

    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ action: "delete" })
    );
    expect(repository.hardDelete).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
  });

  it("returns not found for missing premise", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("attaches a Functional Unit and rejects duplicates", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makePremise());
    vi.mocked(repository.attachFunctionalUnit).mockResolvedValue(
      makePremise({ functionalUnitIds: [UNIT_A, UNIT_B] })
    );

    const attached = await service.attachFunctionalUnit(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      { functionalUnitId: UNIT_B }
    );
    expect(attached.functionalUnitIds).toEqual([UNIT_A, UNIT_B]);
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create" })
    );

    await expect(
      service.attachFunctionalUnit(
        DEV_STUB_IDENTITY,
        "aaaaaaaaaaaaaaaaaaaaaaaa",
        { functionalUnitId: UNIT_A }
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("deduplicates functional unit ids on create", async () => {
    vi.mocked(repository.create).mockResolvedValue(makePremise());

    await service.create(DEV_STUB_IDENTITY, {
      ...createInput,
      functionalUnitIds: [UNIT_A, UNIT_A],
    });

    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({ functionalUnitIds: [UNIT_A] })
    );
  });
});
