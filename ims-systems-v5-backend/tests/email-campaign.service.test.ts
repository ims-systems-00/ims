import { describe, expect, it, vi } from "vitest";
import { createEmailCampaignService } from "../src/modules/email-campaign/services/email-campaign.service";
import type { EmailCampaign } from "../src/modules/email-campaign/types";
import type { SecurityIdentity } from "../src/security";

function identity(): SecurityIdentity {
  return {
    subjectId: "user-1",
    organizationId: "org-1",
  } as SecurityIdentity;
}

function makeCampaign(
  overrides: Partial<EmailCampaign> = {}
): EmailCampaign {
  const now = new Date();
  return {
    id: "camp-1",
    organizationId: "org-1",
    reference: "EC-TEST",
    name: "Spring outreach",
    businessUnitId: "bu-1",
    target: ["Prospect"],
    customAudience: [],
    subject: "Hello",
    message: "Body",
    attachments: [],
    status: "Draft",
    closed: false,
    rootCampaign: true,
    bundleId: "bundle-1",
    sentFrom: { name: "Acme", email: "ops@acme.test" },
    launchedAt: null,
    totalCustomers: 0,
    createdBy: "user-1",
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("email campaign service", () => {
  it("creates a draft campaign with EC reference", async () => {
    const created = makeCampaign();
    const repository = {
      create: vi.fn(async () => created),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      closeBundle: vi.fn(),
      removeAttachment: vi.fn(),
      getManagerStats: vi.fn(),
    };
    const deliveries = {
      create: vi.fn(),
      listByCampaign: vi.fn(),
      sumRecipients: vi.fn(),
    };
    const authorizer = {
      allow: vi.fn(async () => true),
    };
    const organisation = {
      getSender: vi.fn(async () => ({
        name: "Acme",
        officeEmail: "ops@acme.test",
        campaignEmail: "campaigns@acme.test",
      })),
    };
    const service = createEmailCampaignService({
      repository: repository as never,
      deliveries: deliveries as never,
      authorizer: authorizer as never,
      audience: { findAudience: vi.fn(async () => []) },
      organisation: organisation as never,
      email: { sendBulk: vi.fn(async () => ({ mode: "disabled" })) },
    });

    const result = await service.create(identity(), {
      name: "Spring outreach",
      businessUnitId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      target: ["Prospect"],
      subject: "Hello",
      message: "Body",
    });

    expect(result.reference).toBe("EC-TEST");
    expect(repository.create).toHaveBeenCalledOnce();
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create", resourceType: "customers" })
    );
  });

  it("launches a campaign and records deliveries", async () => {
    const draft = makeCampaign();
    const queued = makeCampaign({ status: "Queued", totalCustomers: 1 });
    const sent = makeCampaign({
      status: "Sent",
      totalCustomers: 1,
      launchedAt: new Date(),
    });
    const repository = {
      create: vi.fn(),
      findById: vi.fn(async () => draft),
      list: vi.fn(),
      update: vi
        .fn()
        .mockResolvedValueOnce(queued)
        .mockResolvedValueOnce(sent),
      softDelete: vi.fn(),
      closeBundle: vi.fn(),
      removeAttachment: vi.fn(),
      getManagerStats: vi.fn(),
    };
    const deliveries = {
      create: vi.fn(async (input: { recipients: unknown[] }) => ({
        id: "del-1",
        ...input,
        total: input.recipients.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      listByCampaign: vi.fn(),
      sumRecipients: vi.fn(),
    };
    const sendBulk = vi.fn(async () => ({ mode: "queued" as const }));
    const service = createEmailCampaignService({
      repository: repository as never,
      deliveries: deliveries as never,
      authorizer: { allow: vi.fn(async () => true) } as never,
      audience: {
        findAudience: vi.fn(async () => [
          {
            id: "cus-1",
            name: "Acme Customer",
            reference: "CUS-1",
            primaryContact: "Jane",
            primaryEmail: "jane@customer.test",
            secondaryEmail: "ops@customer.test",
            secondaryContact: "Ops",
          },
        ]),
      },
      organisation: {
        getSender: vi.fn(async () => ({
          name: "Acme",
          officeEmail: "ops@acme.test",
        })),
      },
      email: { sendBulk },
    });

    const result = await service.launch(identity(), "camp-1");

    expect(result.status).toBe("Sent");
    expect(sendBulk).toHaveBeenCalledTimes(2);
    expect(deliveries.create).toHaveBeenCalledOnce();
  });

  it("blocks delete for sent campaigns", async () => {
    const repository = {
      create: vi.fn(),
      findById: vi.fn(async () => makeCampaign({ status: "Sent" })),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      closeBundle: vi.fn(),
      removeAttachment: vi.fn(),
      getManagerStats: vi.fn(),
    };
    const service = createEmailCampaignService({
      repository: repository as never,
      deliveries: {
        create: vi.fn(),
        listByCampaign: vi.fn(),
        sumRecipients: vi.fn(),
      } as never,
      authorizer: { allow: vi.fn(async () => true) } as never,
      audience: { findAudience: vi.fn(async () => []) },
      organisation: {
        getSender: vi.fn(async () => ({
          name: "Acme",
          officeEmail: "ops@acme.test",
        })),
      },
      email: { sendBulk: vi.fn(async () => ({ mode: "disabled" })) },
    });

    await expect(service.remove(identity(), "camp-1")).rejects.toThrow(
      /cannot be deleted/i
    );
  });
});
