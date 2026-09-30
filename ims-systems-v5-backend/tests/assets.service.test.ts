import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type {
  BusinessUnitLookupPort,
  CategoryLookupPort,
  UserLookupPort,
} from "../src/modules/assets/ports";
import type { HardwareAssetRepository } from "../src/modules/assets/repositories/hardware.repository";
import type { InformationAssetRepository } from "../src/modules/assets/repositories/information.repository";
import type { PeopleAssetRepository } from "../src/modules/assets/repositories/people.repository";
import type { PremiseAssetRepository } from "../src/modules/assets/repositories/premise.repository";
import type { SoftwareAssetRepository } from "../src/modules/assets/repositories/software.repository";
import { createAssetsService } from "../src/modules/assets/services/assets.service";
import type { HardwareAsset, SoftwareAsset } from "../src/modules/assets/types";

function makeHardware(
  overrides: Partial<HardwareAsset> = {}
): HardwareAsset {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "HD-TEST001",
    name: "Laptop",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    cost: 1000,
    assignedDate: now,
    createdBy: DEV_STUB_IDENTITY.subjectId,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSoftware(overrides: Partial<SoftwareAsset> = {}): SoftwareAsset {
  const now = new Date();
  return {
    id: "cccccccccccccccccccccccc",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "SFT-TEST001",
    name: "Office Suite",
    licenceCount: 10,
    installCount: 5,
    keys: [],
    documents: [],
    cost: 500,
    createdBy: DEV_STUB_IDENTITY.subjectId,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("AssetsService", () => {
  let hardware: HardwareAssetRepository;
  let software: SoftwareAssetRepository;
  let people: PeopleAssetRepository;
  let premise: PremiseAssetRepository;
  let information: InformationAssetRepository;
  let authorizer: Authorizer;
  let users: UserLookupPort;
  let businessUnits: BusinessUnitLookupPort;
  let categories: CategoryLookupPort;

  beforeEach(() => {
    hardware = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      aggregateStats: vi.fn().mockResolvedValue({ count: 0, totalCost: 0 }),
    };
    software = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      addKey: vi.fn(),
      removeKey: vi.fn(),
      addDocument: vi.fn(),
      removeDocument: vi.fn(),
      aggregateStats: vi.fn().mockResolvedValue({ count: 0, totalCost: 0 }),
    };
    people = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      aggregateStats: vi.fn().mockResolvedValue({ count: 0, totalCost: 0 }),
    };
    premise = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      aggregateStats: vi.fn().mockResolvedValue({ count: 0, totalCost: 0 }),
    };
    information = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      aggregateStats: vi.fn().mockResolvedValue({ count: 0, totalCost: 0 }),
    };
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    users = { existsInOrganization: vi.fn().mockResolvedValue(true) };
    businessUnits = { existsInOrganization: vi.fn().mockResolvedValue(true) };
    categories = { existsForAssetModule: vi.fn().mockResolvedValue(true) };
  });

  function service() {
    return createAssetsService({
      hardware,
      software,
      people,
      premise,
      information,
      authorizer,
      users,
      businessUnits,
      categories,
    });
  }

  it("creates hardware when owner and permissions are valid", async () => {
    const created = makeHardware();
    vi.mocked(hardware.create).mockResolvedValue(created);

    const result = await service().createHardware(DEV_STUB_IDENTITY, {
      name: "Laptop",
      ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      cost: 1000,
    });

    expect(result).toEqual(created);
    expect(users.existsInOrganization).toHaveBeenCalled();
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        resourceType: "inventory",
      })
    );
  });

  it("rejects create without identity", async () => {
    await expect(
      service().createHardware(null, {
        name: "Laptop",
        ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects create when authorizer denies", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service().createHardware(DEV_STUB_IDENTITY, {
        name: "Laptop",
        ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects create when owner does not exist", async () => {
    vi.mocked(users.existsInOrganization).mockResolvedValue(false);
    await expect(
      service().createHardware(DEV_STUB_IDENTITY, {
        name: "Laptop",
        ownerId: "missing-user",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("returns not found for missing hardware", async () => {
    vi.mocked(hardware.findById).mockResolvedValue(null);
    await expect(
      service().getHardware(DEV_STUB_IDENTITY, "cccccccccccccccccccccccc")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("soft-deletes hardware for the creator", async () => {
    vi.mocked(hardware.findById).mockResolvedValue(makeHardware());
    vi.mocked(hardware.softDelete).mockResolvedValue(true);

    await service().deleteHardware(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );

    expect(hardware.softDelete).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
  });

  it("forbids delete when caller is neither creator nor admin", async () => {
    vi.mocked(hardware.findById).mockResolvedValue(
      makeHardware({ createdBy: "someone-else" })
    );
    vi.mocked(authorizer.allow).mockImplementation(async (check) => {
      if (check.action === "manage") return false;
      return true;
    });

    await expect(
      service().deleteHardware(
        DEV_STUB_IDENTITY,
        "aaaaaaaaaaaaaaaaaaaaaaaa"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("adds a software key with create permission", async () => {
    const updated = makeSoftware({
      keys: [
        {
          id: "dddddddddddddddddddddddd",
          value: "KEY-1",
          createdAt: new Date(),
        },
      ],
    });
    vi.mocked(software.addKey).mockResolvedValue(updated);

    const result = await service().addSoftwareKey(
      DEV_STUB_IDENTITY,
      "cccccccccccccccccccccccc",
      "KEY-1"
    );

    expect(result.keys).toHaveLength(1);
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create" })
    );
  });

  it("removes a software key with delete permission", async () => {
    const existing = makeSoftware({
      keys: [
        {
          id: "dddddddddddddddddddddddd",
          value: "KEY-1",
          createdAt: new Date(),
        },
      ],
    });
    vi.mocked(software.findById).mockResolvedValue(existing);
    vi.mocked(software.removeKey).mockResolvedValue({
      ...existing,
      keys: [],
    });

    const result = await service().removeSoftwareKey(
      DEV_STUB_IDENTITY,
      "cccccccccccccccccccccccc",
      "dddddddddddddddddddddddd"
    );

    expect(result.keys).toHaveLength(0);
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ action: "delete" })
    );
  });

  it("aggregates inventory stats across categories", async () => {
    vi.mocked(hardware.aggregateStats).mockResolvedValue({
      count: 2,
      totalCost: 200,
    });
    vi.mocked(software.aggregateStats).mockResolvedValue({
      count: 1,
      totalCost: 50,
    });

    const stats = await service().getStats(DEV_STUB_IDENTITY);

    expect(stats.totalCount).toBe(3);
    expect(stats.totalCost).toBe(250);
    expect(stats.categories).toHaveLength(5);
  });
});
