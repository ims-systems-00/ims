import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type {
  CustomerCampaignStatsPort,
  CustomerIncidentStatsPort,
  CustomerInteractionStatsPort,
  CustomerInvoiceStatsPort,
  CustomerListScopePort,
  CustomerNotificationPort,
  CustomerTaskPort,
} from "../src/modules/customers/ports";
import type { CustomerRepository } from "../src/modules/customers/repositories/customer.repository";
import { createCustomerService } from "../src/modules/customers/services/customer.service";
import type { Customer } from "../src/modules/customers/types";
import { DEFAULT_CUSTOMER_LOGO_SRC } from "../src/modules/customers/types";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "CUS-TEST-0001",
    name: "Acme Care Ltd",
    stage: "Prospect",
    status: "Open",
    probability: 10,
    primaryEmail: "hello@acme.example",
    contractValue: 5000,
    accountManager: DEV_STUB_IDENTITY.subjectId,
    businessUnitId: "cccccccccccccccccccccccc",
    isChampion: false,
    logo: { src: DEFAULT_CUSTOMER_LOGO_SRC },
    attachments: [],
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

describe("CustomerService", () => {
  let repository: CustomerRepository;
  let notifications: CustomerNotificationPort;
  let tasks: CustomerTaskPort;
  let invoices: CustomerInvoiceStatsPort;
  let incidents: CustomerIncidentStatsPort;
  let campaigns: CustomerCampaignStatsPort;
  let interactions: CustomerInteractionStatsPort;
  let listScope: CustomerListScopePort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createCustomerService>;

  const createInput = {
    name: "Acme Care Ltd",
    primaryEmail: "hello@acme.example",
    accountManager: DEV_STUB_IDENTITY.subjectId,
    businessUnitId: "cccccccccccccccccccccccc",
    contractValue: 5000,
    stage: "Prospect" as const,
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      managerAnalytics: vi.fn(),
    };
    notifications = {
      notifyStageChanged: vi.fn(),
      notifyStatusChanged: vi.fn(),
      notifyAccountManagerAssigned: vi.fn(),
    };
    tasks = { removeTasksSourcedFromCustomer: vi.fn() };
    invoices = {
      getCustomerInvoiceOverview: vi.fn().mockResolvedValue({
        totalInvoices: 0,
        byStatus: [],
      }),
      getManagerInvoiceAnalysisThisMonth: vi.fn().mockResolvedValue([]),
    };
    incidents = { countLinkedIncidents: vi.fn().mockResolvedValue([]) };
    campaigns = {
      getManagerCampaignStats: vi.fn().mockResolvedValue({
        activeCampaign: 0,
        closedCampaign: 0,
        monthlyCampaign: [],
        latestCampaign: "No recent campaign",
      }),
    };
    interactions = {
      getManagerInteractionAnalytics: vi.fn().mockResolvedValue({
        weekly: {
          totalInteractions: 0,
          customersEngaged: 0,
          topCustomers: [],
        },
        monthly: {
          totalInteractions: 0,
          customersEngaged: 0,
          topCustomers: [],
        },
      }),
    };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    service = createCustomerService({
      repository,
      authorizer,
      notifications,
      tasks,
      invoices,
      incidents,
      campaigns,
      interactions,
      listScope,
    });
  });

  it("rejects unauthenticated create", async () => {
    await expect(service.create(null, createInput)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("creates a prospect customer and notifies account manager", async () => {
    const created = makeCustomer();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);
    expect(result.reference).toBe("CUS-TEST-0001");
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        name: "Acme Care Ltd",
        primaryEmail: "hello@acme.example",
        stage: "Prospect",
        status: "Open",
      })
    );
    expect(notifications.notifyAccountManagerAssigned).toHaveBeenCalled();
  });

  it("rejects Live create without contract dates", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        ...createInput,
        stage: "Live",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("rejects Lost status without reason", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        ...createInput,
        status: "Lost",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("rejects invalid probability", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        ...createInput,
        probability: 15,
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("updates stage and emits stage notification", async () => {
    const existing = makeCustomer({ stage: "Prospect" });
    const updated = makeCustomer({ stage: "Warm lead" });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(updated);

    const result = await service.update(DEV_STUB_IDENTITY, existing.id, {
      stage: "Warm lead",
    });
    expect(result.stage).toBe("Warm lead");
    expect(notifications.notifyStageChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        previousStage: "Prospect",
        stage: "Warm lead",
      })
    );
  });

  it("appends attachments on update", async () => {
    const existing = makeCustomer({
      attachments: [
        {
          id: "att-1",
          fileName: "a.pdf",
          uploadedBy: "u1",
          uploadedAt: new Date(),
        },
      ],
    });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockImplementation(async (_org, _id, patch) =>
      makeCustomer({
        attachments: patch.attachments ?? existing.attachments,
      })
    );

    await service.update(DEV_STUB_IDENTITY, existing.id, {
      attachments: [{ fileName: "b.pdf" }],
    });

    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      existing.id,
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({ fileName: "a.pdf" }),
          expect.objectContaining({ fileName: "b.pdf" }),
        ]),
      })
    );
  });

  it("soft-deletes and cascades linked tasks", async () => {
    const existing = makeCustomer();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, existing.id);
    expect(repository.softDelete).toHaveBeenCalled();
    expect(tasks.removeTasksSourcedFromCustomer).toHaveBeenCalledWith({
      organizationId: DEV_STUB_IDENTITY.organizationId,
      customerId: existing.id,
    });
  });

  it("returns not found for missing customer", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "bbbbbbbbbbbbbbbbbbbbbbbb")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("forbids manager overview for another user", async () => {
    await expect(
      service.getAccountManagerOverview(
        DEV_STUB_IDENTITY,
        "other-manager-id"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("builds account manager overview for self", async () => {
    vi.mocked(repository.managerAnalytics).mockResolvedValue({
      customerAnalysis: [
        { stage: "Prospect", count: 1, contractValue: 5000 },
      ],
      contractStartedThisMonth: 0,
      contractEndingThisMonth: 0,
      contractReviewThisMonth: 0,
      highestValueCustomer: {
        name: "Acme Care Ltd",
        value: 5000,
        stage: "Prospect",
      },
      mostValuedLiveCustomer: {
        name: "Not available",
        value: 0,
        stage: "",
      },
      lessValuedLiveCustomer: {
        name: "Not available",
        value: 0,
        stage: "",
      },
    });

    const overview = await service.getAccountManagerOverview(
      DEV_STUB_IDENTITY,
      DEV_STUB_IDENTITY.subjectId
    );
    expect(overview.customerAnalysis).toHaveLength(1);
    expect(overview.latestCampaign).toBe("No recent campaign");
    expect(overview.activeCampaign).toBe(0);
  });

  it("lists with myCustomers filter", async () => {
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
      myCustomers: true,
    });
    expect(repository.list).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        accountManagerIds: [DEV_STUB_IDENTITY.subjectId],
      }),
      { mode: "all" }
    );
  });

  it("rejects forbidden authorizer", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.create(DEV_STUB_IDENTITY, createInput)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
