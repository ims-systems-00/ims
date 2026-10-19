/**
 * Email Campaign application service.
 * Spec: docs/module-specifications/email-campaign.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  CampaignAudiencePort,
  CampaignEmailPort,
  CampaignOrganisationPort,
} from "../ports";
import type { CampaignDeliveryRepository } from "../repositories/campaign-delivery.repository";
import {
  newAttachmentId,
  newBundleId,
  type EmailCampaignRepository,
} from "../repositories/email-campaign.repository";
import {
  EMAIL_CAMPAIGNS_RESOURCE,
  type AttachmentInput,
  type CampaignAttachment,
  type CampaignOverview,
  type CampaignRecipient,
  type CreateEmailCampaignInput,
  type CustomAudienceEntry,
  type EmailCampaign,
  type ListEmailCampaignsQuery,
  type ManagerCampaignStats,
  type PaginatedDeliveries,
  type PaginatedEmailCampaigns,
  type UpdateEmailCampaignInput,
} from "../types";

const DELIVERY_CHUNK_SIZE = 40;

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

function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EC-${stamp}-${rand}`;
}

function mapAttachments(
  input: AttachmentInput[] | undefined,
  actorId: string
): CampaignAttachment[] {
  if (!input || input.length === 0) return [];
  const now = new Date();
  return input.map((file) => ({
    id: newAttachmentId(),
    fileName: file.fileName.trim(),
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    url: file.url || undefined,
    uploadedBy: actorId,
    uploadedAt: now,
  }));
}

function assertAudience(input: {
  target?: string[];
  customAudience?: CustomAudienceEntry[];
}): void {
  const hasTarget = (input.target?.length ?? 0) > 0;
  const hasCustom = (input.customAudience?.length ?? 0) > 0;
  if (!hasTarget && !hasCustom) {
    throw new ValidationAppError(
      "Select at least one target audience stage or additional customer"
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildCampaignHtml(input: {
  campaignName: string;
  recipientName: string;
  message: string;
  orgName: string;
}): string {
  const greeting = input.recipientName.trim() || "Customer";
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">${escapeHtml(input.campaignName)}</h2>
      <p>Dear ${escapeHtml(greeting)},</p>
      <div style="white-space: pre-wrap;">${escapeHtml(input.message)}</div>
      <p style="margin-top: 24px;">Kind regards,<br/>${escapeHtml(input.orgName)}</p>
    </div>
  `.trim();
}

function recipientsFromCustomer(customer: {
  primaryContact?: string;
  primaryEmail: string;
  secondaryContact?: string;
  secondaryEmail?: string;
}): CampaignRecipient[] {
  const recipients: CampaignRecipient[] = [];
  if (customer.primaryEmail?.trim()) {
    recipients.push({
      name: customer.primaryContact?.trim() || "Customer",
      email: customer.primaryEmail.trim().toLowerCase(),
    });
  }
  if (customer.secondaryEmail?.trim()) {
    recipients.push({
      name: customer.secondaryContact?.trim() || "Customer",
      email: customer.secondaryEmail.trim().toLowerCase(),
    });
  }
  return recipients;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export type EmailCampaignServiceDeps = {
  repository: EmailCampaignRepository;
  deliveries: CampaignDeliveryRepository;
  authorizer: Authorizer;
  audience: CampaignAudiencePort;
  organisation: CampaignOrganisationPort;
  email: CampaignEmailPort;
};

export type EmailCampaignService = ReturnType<typeof createEmailCampaignService>;

export function createEmailCampaignService(deps: EmailCampaignServiceDeps) {
  const { repository, deliveries, authorizer, audience, organisation, email } =
    deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: EMAIL_CAMPAIGNS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access email campaigns"
      );
    }
  }

  async function requireCampaign(
    organizationId: string,
    id: string
  ): Promise<EmailCampaign> {
    const campaign = await repository.findById(organizationId, id);
    if (!campaign) {
      throw new NotFoundError("This campaign has been deleted or removed");
    }
    return campaign;
  }

  async function resolveSender(organizationId: string) {
    const org = await organisation.getSender(organizationId);
    if (!org?.officeEmail?.trim()) {
      throw new ValidationAppError(
        "Organisation office email is required to create campaigns"
      );
    }
    return {
      name: org.name,
      email: org.officeEmail.trim(),
      replyTo: (org.campaignEmail?.trim() || org.officeEmail.trim()),
    };
  }

  async function dispatchCampaign(
    identity: SecurityIdentity,
    organizationId: string,
    campaign: EmailCampaign
  ): Promise<EmailCampaign> {
    const sender = await resolveSender(organizationId);
    const customers = await audience.findAudience({
      organizationId,
      businessUnitId: campaign.businessUnitId,
      stages: campaign.target,
      customerIds: campaign.customAudience.map((c) => c.customerId),
    });

    const allRecipients: CampaignRecipient[] = [];
    const seenEmails = new Set<string>();
    for (const customer of customers) {
      for (const recipient of recipientsFromCustomer(customer)) {
        if (seenEmails.has(recipient.email)) continue;
        seenEmails.add(recipient.email);
        allRecipients.push(recipient);
      }
    }

    const queued = await repository.update(organizationId, campaign.id, {
      status: "Queued",
      totalCustomers: customers.length,
      updatedBy: identity.subjectId,
      updatedOn: new Date(),
    });
    if (!queued) {
      throw new NotFoundError("This campaign has been deleted or removed");
    }

    const urlAttachments = campaign.attachments
      .filter((file) => Boolean(file.url))
      .map((file) => ({
        filename: file.fileName,
        // Email job expects base64; without storage fetch we skip binary.
        // Attachments with public URLs are noted in the body instead.
        contentBase64: Buffer.from(
          `Attachment unavailable inline: ${file.url ?? file.fileName}`
        ).toString("base64"),
        type: file.mimeType ?? "text/plain",
      }));

    for (const recipient of allRecipients) {
      const html = buildCampaignHtml({
        campaignName: campaign.name,
        recipientName: recipient.name,
        message: campaign.message,
        orgName: sender.name,
      });
      await email.sendBulk({
        to: [recipient.email],
        subject: campaign.subject,
        html,
        replyTo: sender.replyTo,
        category: "customer-communication",
        organizationId,
        correlationId: campaign.id,
        dedupeKey: `campaign:${campaign.id}:${recipient.email}`,
        ...(urlAttachments.length > 0
          ? { attachments: urlAttachments }
          : {}),
      });
    }

    const chunks = chunkArray(allRecipients, DELIVERY_CHUNK_SIZE);
    for (const chunk of chunks) {
      await deliveries.create({
        organizationId,
        campaignId: campaign.id,
        recipients: chunk,
      });
    }

    const sent = await repository.update(organizationId, campaign.id, {
      status: "Sent",
      launchedAt: new Date(),
      totalCustomers: customers.length,
      updatedBy: identity.subjectId,
      updatedOn: new Date(),
    });
    if (!sent) {
      throw new NotFoundError("This campaign has been deleted or removed");
    }
    return sent;
  }

  async function create(
    identity: SecurityIdentity | null | undefined,
    input: CreateEmailCampaignInput
  ): Promise<EmailCampaign> {
    const actor = requireOrgIdentity(identity);
    await assertAllowed(actor.identity, "create");
    assertAudience(input);

    const sender = await resolveSender(actor.organizationId);
    const now = new Date();
    const bundleId = input.bundleId?.trim() || newBundleId();
    const rootCampaign = !input.bundleId;

    return repository.create({
      organizationId: actor.organizationId,
      reference: nextReference(),
      name: input.name.trim(),
      businessUnitId: input.businessUnitId,
      target: input.target ?? [],
      customAudience: input.customAudience ?? [],
      subject: input.subject.trim(),
      message: input.message.trim(),
      attachments: mapAttachments(input.attachments, actor.identity.subjectId),
      status: "Draft",
      closed: false,
      rootCampaign,
      bundleId,
      sentFrom: { name: sender.name, email: sender.email },
      createdBy: actor.identity.subjectId,
      createdOn: now,
    });
  }

  async function launch(
    identity: SecurityIdentity | null | undefined,
    id: string
  ): Promise<EmailCampaign> {
    const actor = requireOrgIdentity(identity);
    await assertAllowed(actor.identity, "create", id);
    const campaign = await requireCampaign(actor.organizationId, id);
    assertAudience(campaign);
    if (campaign.status === "Queued") {
      throw new ValidationAppError("Campaign is already queued for sending");
    }
    return dispatchCampaign(actor.identity, actor.organizationId, campaign);
  }

  return {
    create,

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListEmailCampaignsQuery
    ): Promise<PaginatedEmailCampaigns> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return repository.list(actor.organizationId, query);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<EmailCampaign> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireCampaign(actor.organizationId, id);
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateEmailCampaignInput
    ): Promise<EmailCampaign> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireCampaign(actor.organizationId, id);

      if (input.target !== undefined || input.customAudience !== undefined) {
        assertAudience({
          target: input.target ?? existing.target,
          customAudience: input.customAudience ?? existing.customAudience,
        });
      }

      const updated = await repository.update(actor.organizationId, id, {
        businessUnitId: input.businessUnitId,
        target: input.target,
        customAudience: input.customAudience,
        subject: input.subject?.trim(),
        message: input.message?.trim(),
        attachments: mapAttachments(
          input.attachments,
          actor.identity.subjectId
        ),
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError("This campaign has been deleted or removed");
      }
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireCampaign(actor.organizationId, id);
      if (existing.status === "Sent") {
        throw new ValidationAppError("Sent campaigns cannot be deleted");
      }
      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new NotFoundError("This campaign has been deleted or removed");
      }
    },

    async removeAttachment(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<EmailCampaign> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      await requireCampaign(actor.organizationId, id);
      const updated = await repository.removeAttachment(
        actor.organizationId,
        id,
        attachmentId
      );
      if (!updated) {
        throw new NotFoundError("This campaign has been deleted or removed");
      }
      return updated;
    },

    launch,

    /** Create draft then immediately launch (create + send). */
    async createAndLaunch(
      identity: SecurityIdentity | null | undefined,
      input: CreateEmailCampaignInput
    ): Promise<EmailCampaign> {
      const created = await create(identity, input);
      return launch(identity, created.id);
    },

    async close(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<EmailCampaign> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const campaign = await requireCampaign(actor.organizationId, id);
      await repository.closeBundle(actor.organizationId, campaign.bundleId);
      return requireCampaign(actor.organizationId, id);
    },

    async getOverview(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<CampaignOverview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      const campaign = await requireCampaign(actor.organizationId, id);
      const totalRecipients = await deliveries.sumRecipients(
        actor.organizationId,
        id
      );
      return {
        totalCustomers: campaign.totalCustomers,
        totalRecipients,
      };
    },

    async listDeliveries(
      identity: SecurityIdentity | null | undefined,
      id: string,
      page: number,
      pageSize: number
    ): Promise<PaginatedDeliveries> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      await requireCampaign(actor.organizationId, id);
      return deliveries.listByCampaign(
        actor.organizationId,
        id,
        page,
        pageSize
      );
    },

    async getManagerStats(
      organizationId: string,
      managerId: string
    ): Promise<ManagerCampaignStats> {
      return repository.getManagerStats(organizationId, managerId);
    },
  };
}
