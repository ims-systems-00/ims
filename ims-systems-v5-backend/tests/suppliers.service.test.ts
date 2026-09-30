import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type {
  SupplierCalendarPort,
  SupplierIncidentStatsPort,
  SupplierListScopePort,
  SupplierNotificationPort,
  SupplierTaskPort,
} from "../src/modules/suppliers/ports";
import type { SupplierRepository } from "../src/modules/suppliers/repositories/supplier.repository";
import { createSupplierService } from "../src/modules/suppliers/services/supplier.service";
import {
  deriveComplianceRiskLevel,
  deriveIsCompliant,
} from "../src/modules/suppliers/types";
import type { Supplier } from "../src/modules/suppliers/types";

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "SUP-TEST-0001",
    name: "Acme Facilities Ltd",
    businessUnitId: "cccccccccccccccccccccccc",
    accountManager: "Jane Contact",
    accountNumber: "ACC-1001",
    email: "ops@acme.example",
    buyerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    serviceProvision: "Facilities maintenance",
    contractValue: 25000,
    contractStartDate: now,
    contractEndDate: null,
    reviewDate: null,
    slaFiles: [],
    contractFiles: [],
    onboardingFiles: [],
    kpiObjectives: [],
    isCompliant: false,
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("deriveIsCompliant / risk level", () => {
  it("is compliant when SLA or contract files exist", () => {
    expect(
      deriveIsCompliant({ slaFiles: { length: 1 }, contractFiles: { length: 0 } })
    ).toBe(true);
    expect(
      deriveIsCompliant({ slaFiles: { length: 0 }, contractFiles: { length: 2 } })
    ).toBe(true);
    expect(
      deriveIsCompliant({ slaFiles: { length: 0 }, contractFiles: { length: 0 } })
    ).toBe(false);
  });

  it("maps compliance percentage to V4 risk levels", () => {
    expect(deriveComplianceRiskLevel(0)).toBe("Hazardous");
    expect(deriveComplianceRiskLevel(20)).toBe("Hazardous");
    expect(deriveComplianceRiskLevel(21)).toBe("Vulnerable");
    expect(deriveComplianceRiskLevel(41)).toBe("Unsecure");
    expect(deriveComplianceRiskLevel(61)).toBe("Secure");
    expect(deriveComplianceRiskLevel(81)).toBe("Safe");
  });
});

describe("SupplierService", () => {
  let repository: SupplierRepository;
  let notifications: SupplierNotificationPort;
  let tasks: SupplierTaskPort;
  let calendar: SupplierCalendarPort;
  let incidentStats: SupplierIncidentStatsPort;
  let listScope: SupplierListScopePort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createSupplierService>;

  const createInput = {
    name: "Acme Facilities Ltd",
    accountManager: "Jane Contact",
    accountNumber: "ACC-1001",
    email: "ops@acme.example",
    serviceProvision: "Facilities maintenance",
    contractValue: 25000,
    contractStartDate: new Date("2026-01-01"),
    businessUnitId: "cccccccccccccccccccccccc",
    buyerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      statsAggregate: vi.fn(),
    };
    notifications = {
      notifyBuyerAssigned: vi.fn(),
      notifyCompliantSupplier: vi.fn(),
    };
    tasks = { removeTasksSourcedFromSupplier: vi.fn() };
    calendar = {
      upsertReviewEvent: vi.fn(),
      removeReviewEvent: vi.fn(),
    };
    incidentStats = {
      countLinkedIncidents: vi.fn().mockResolvedValue({
        totalIncidents: 0,
        openIncidents: 0,
        resolvedIncidents: 0,
      }),
    };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    service = createSupplierService({
      repository,
      authorizer,
      notifications,
      tasks,
      calendar,
      incidentStats,
      listScope,
    });
  });

  it("creates a supplier, notifies buyer, and upserts calendar", async () => {
    const created = makeSupplier({ isCompliant: false });
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);

    expect(result.reference).toMatch(/^SUP-/);
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        name: createInput.name,
        buyerId: createInput.buyerId,
        isCompliant: false,
      })
    );
    expect(notifications.notifyBuyerAssigned).toHaveBeenCalled();
    expect(calendar.upsertReviewEvent).toHaveBeenCalled();
  });

  it("marks compliant and notifies when SLA files are provided on create", async () => {
    const created = makeSupplier({
      isCompliant: true,
      slaFiles: [
        {
          id: "f1",
          fileName: "sla.pdf",
          uploadedBy: DEV_STUB_IDENTITY.subjectId,
          uploadedAt: new Date(),
        },
      ],
    });
    vi.mocked(repository.create).mockImplementation(async (_org, input) =>
      makeSupplier({
        isCompliant: input.isCompliant,
        slaFiles: input.slaFiles,
      })
    );

    await service.create(DEV_STUB_IDENTITY, {
      ...createInput,
      slaFiles: [{ fileName: "sla.pdf" }],
    });

    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({ isCompliant: true })
    );
    expect(notifications.notifyCompliantSupplier).toHaveBeenCalled();
  });

  it("rejects create without identity", async () => {
    await expect(service.create(null, createInput)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("rejects create when authorizer denies", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.create(DEV_STUB_IDENTITY, createInput)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects create without required name", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        ...createInput,
        name: "  ",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("updates supplier and appends contract files for compliance", async () => {
    const existing = makeSupplier();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(
      makeSupplier({
        isCompliant: true,
        contractFiles: [
          {
            id: "c1",
            fileName: "contract.pdf",
            uploadedBy: DEV_STUB_IDENTITY.subjectId,
            uploadedAt: new Date(),
          },
        ],
      })
    );

    const result = await service.update(DEV_STUB_IDENTITY, existing.id, {
      contractFiles: [{ fileName: "contract.pdf" }],
    });

    expect(result.isCompliant).toBe(true);
    expect(notifications.notifyCompliantSupplier).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      existing.id,
      expect.objectContaining({ isCompliant: true })
    );
  });

  it("notifies new buyer on reassignment", async () => {
    const existing = makeSupplier({ buyerId: "bbbbbbbbbbbbbbbbbbbbbbbb" });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(
      makeSupplier({ buyerId: "dddddddddddddddddddddddd" })
    );

    await service.update(DEV_STUB_IDENTITY, existing.id, {
      buyerId: "dddddddddddddddddddddddd",
    });

    expect(notifications.notifyBuyerAssigned).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: "dddddddddddddddddddddddd" })
    );
  });

  it("soft-deletes and cascades tasks + calendar cleanup", async () => {
    const existing = makeSupplier();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, existing.id);

    expect(repository.softDelete).toHaveBeenCalled();
    expect(tasks.removeTasksSourcedFromSupplier).toHaveBeenCalledWith({
      organizationId: DEV_STUB_IDENTITY.organizationId,
      supplierId: existing.id,
    });
    expect(calendar.removeReviewEvent).toHaveBeenCalled();
  });

  it("returns 404 when supplier missing", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("clears compliance when last SLA and contract files are removed", async () => {
    const existing = makeSupplier({
      isCompliant: true,
      slaFiles: [
        {
          id: "sla-1",
          fileName: "sla.pdf",
          uploadedBy: "u",
          uploadedAt: new Date(),
        },
      ],
      contractFiles: [],
    });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(
      makeSupplier({ isCompliant: false, slaFiles: [], contractFiles: [] })
    );

    const result = await service.removeSlaFile(
      DEV_STUB_IDENTITY,
      existing.id,
      "sla-1"
    );

    expect(result.isCompliant).toBe(false);
    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      existing.id,
      expect.objectContaining({ isCompliant: false, slaFiles: [] })
    );
  });

  it("onboarding file removal does not affect compliance", async () => {
    const existing = makeSupplier({
      isCompliant: true,
      contractFiles: [
        {
          id: "c1",
          fileName: "c.pdf",
          uploadedBy: "u",
          uploadedAt: new Date(),
        },
      ],
      onboardingFiles: [
        {
          id: "o1",
          fileName: "onboard.pdf",
          uploadedBy: "u",
          uploadedAt: new Date(),
        },
      ],
    });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockImplementation(async (_org, _id, patch) =>
      makeSupplier({
        ...existing,
        onboardingFiles: patch.onboardingFiles ?? existing.onboardingFiles,
        isCompliant: patch.isCompliant ?? existing.isCompliant,
      })
    );

    await service.removeOnboardingFile(
      DEV_STUB_IDENTITY,
      existing.id,
      "o1"
    );

    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      existing.id,
      expect.not.objectContaining({ isCompliant: expect.anything() })
    );
  });

  it("adds and removes KPI objectives", async () => {
    const existing = makeSupplier();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValueOnce(
      makeSupplier({
        kpiObjectives: [{ id: "k1", value: "On-time delivery ≥ 95%" }],
      })
    );

    const added = await service.addKpiObjective(
      DEV_STUB_IDENTITY,
      existing.id,
      { value: "On-time delivery ≥ 95%" }
    );
    expect(added.kpiObjectives).toHaveLength(1);

    vi.mocked(repository.findById).mockResolvedValue(added);
    vi.mocked(repository.update).mockResolvedValueOnce(
      makeSupplier({ kpiObjectives: [] })
    );
    const removed = await service.removeKpiObjective(
      DEV_STUB_IDENTITY,
      existing.id,
      added.kpiObjectives[0]!.id
    );
    expect(removed.kpiObjectives).toHaveLength(0);
  });

  it("aggregates stats with incident port", async () => {
    vi.mocked(repository.statsAggregate).mockResolvedValue({
      total: 4,
      compliant: 3,
      procurementValue: 100000,
    });
    vi.mocked(incidentStats.countLinkedIncidents).mockResolvedValue({
      totalIncidents: 5,
      openIncidents: 2,
      resolvedIncidents: 3,
    });

    const stats = await service.stats(DEV_STUB_IDENTITY);
    expect(stats.procurementValue).toBe(100000);
    expect(stats.supplierCompliance.percentage).toBe(75);
    expect(stats.supplierCompliance.riskLevel).toBe("Secure");
    expect(stats.supplierIncidents.totalIncidents).toBe(5);
  });
});
