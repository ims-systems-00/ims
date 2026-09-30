/**
 * Customer Management (CRM) application service.
 * Spec: docs/module-specifications/customers.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  CustomerCampaignStatsPort,
  CustomerIncidentStatsPort,
  CustomerInteractionStatsPort,
  CustomerInvoiceStatsPort,
  CustomerListScopePort,
  CustomerNotificationPort,
  CustomerTaskPort,
} from "../ports";
import {
  newAttachmentId,
  type CustomerRepository,
} from "../repositories/customer.repository";
import {
  CUSTOMERS_RESOURCE,
  DEFAULT_CUSTOMER_LOGO_SRC,
  isValidProbability,
  type AccountManagerOverview,
  type AttachmentInput,
  type CreateCustomerInput,
  type Customer,
  type CustomerAttachment,
  type CustomerLogo,
  type CustomerOverview,
  type CustomerStage,
  type CustomerStatus,
  type ListCustomersQuery,
  type LogoInput,
  type PaginatedCustomers,
  type UpdateCustomerInput,
} from "../types";

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
  return `CUS-${stamp}-${rand}`;
}

function toDate(
  value: string | Date | null | undefined
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationAppError("Invalid date");
  }
  return parsed;
}

function mapAttachments(
  input: AttachmentInput[] | undefined,
  actorId: string
): CustomerAttachment[] {
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

function mapLogo(input: LogoInput | null | undefined): CustomerLogo {
  if (!input) {
    return { src: DEFAULT_CUSTOMER_LOGO_SRC };
  }
  return {
    fileName: input.fileName,
    storageKey: input.storageKey,
    url: input.url || undefined,
    src: input.src?.trim() || input.url?.trim() || DEFAULT_CUSTOMER_LOGO_SRC,
  };
}

function emptyStringToUndefined(
  value: string | null | undefined
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function assertLiveContractDates(input: {
  stage: CustomerStage;
  contractStartDate?: Date | null;
  contractEndDate?: Date | null;
  reviewDate?: Date | null;
}): void {
  if (input.stage !== "Live") return;
  if (!input.contractStartDate) {
    throw new ValidationAppError(
      "Contract start date is required for Live customers"
    );
  }
  if (!input.contractEndDate) {
    throw new ValidationAppError(
      "Contract end date is required for Live customers"
    );
  }
  if (!input.reviewDate) {
    throw new ValidationAppError("Review date is required for Live customers");
  }
}

function assertLostReason(input: {
  status: CustomerStatus;
  reasonForLoss?: string | null;
}): void {
  if (input.status !== "Lost") return;
  if (!input.reasonForLoss?.trim()) {
    throw new ValidationAppError(
      "Reason for loss is required when status is Lost"
    );
  }
}

function assertSecondaryContact(input: {
  secondaryContact?: string | null;
  secondaryEmail?: string | null;
}): void {
  if (input.secondaryContact?.trim() && !input.secondaryEmail?.trim()) {
    throw new ValidationAppError(
      "Secondary email is required when secondary contact is set"
    );
  }
}

export type CustomerServiceDeps = {
  repository: CustomerRepository;
  authorizer: Authorizer;
  notifications: CustomerNotificationPort;
  tasks: CustomerTaskPort;
  invoices: CustomerInvoiceStatsPort;
  incidents: CustomerIncidentStatsPort;
  campaigns: CustomerCampaignStatsPort;
  interactions: CustomerInteractionStatsPort;
  listScope: CustomerListScopePort;
};

export type CustomerService = ReturnType<typeof createCustomerService>;

export function createCustomerService(deps: CustomerServiceDeps) {
  const {
    repository,
    authorizer,
    notifications,
    tasks,
    invoices,
    incidents,
    campaigns,
    interactions,
    listScope,
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: CUSTOMERS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access customers"
      );
    }
  }

  async function requireCustomer(
    organizationId: string,
    id: string
  ): Promise<Customer> {
    const customer = await repository.findById(organizationId, id);
    if (!customer) {
      throw new NotFoundError("This customer has been deleted or removed");
    }
    return customer;
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateCustomerInput
    ): Promise<Customer> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      if (!input.name?.trim()) {
        throw new ValidationAppError("Name is required");
      }
      if (!input.primaryEmail?.trim()) {
        throw new ValidationAppError("Primary email is required");
      }

      const stage: CustomerStage = input.stage ?? "Prospect";
      const status: CustomerStatus = input.status ?? "Open";
      const probability = input.probability ?? 10;
      if (!isValidProbability(probability)) {
        throw new ValidationAppError(
          "Probability must be 10–90 in steps of 10"
        );
      }

      const contractStartDate = toDate(input.contractStartDate) ?? null;
      const contractEndDate = toDate(input.contractEndDate) ?? null;
      const reviewDate = toDate(input.reviewDate) ?? null;

      assertLiveContractDates({
        stage,
        contractStartDate,
        contractEndDate,
        reviewDate,
      });
      assertLostReason({ status, reasonForLoss: input.reasonForLoss });
      assertSecondaryContact({
        secondaryContact: input.secondaryContact,
        secondaryEmail: input.secondaryEmail,
      });

      const now = new Date();
      const created = await repository.create(actor.organizationId, {
        reference: nextReference(),
        name: input.name.trim(),
        companyNumber: emptyStringToUndefined(input.companyNumber),
        businessUnitId: input.businessUnitId,
        categoryId: input.categoryId,
        stage,
        status,
        probability,
        source: emptyStringToUndefined(input.source),
        phoneNumber: emptyStringToUndefined(input.phoneNumber),
        buildingName: emptyStringToUndefined(input.buildingName),
        streetName: emptyStringToUndefined(input.streetName),
        town: emptyStringToUndefined(input.town),
        postCode: emptyStringToUndefined(input.postCode),
        primaryContact: emptyStringToUndefined(input.primaryContact),
        primaryEmail: input.primaryEmail.trim().toLowerCase(),
        secondaryContact: emptyStringToUndefined(input.secondaryContact),
        secondaryEmail: emptyStringToUndefined(input.secondaryEmail),
        serviceProvision: emptyStringToUndefined(input.serviceProvision),
        contractValue: input.contractValue ?? 0,
        accountManager: input.accountManager,
        accountNumber: emptyStringToUndefined(input.accountNumber) ?? "",
        contractStartDate,
        contractEndDate,
        reviewDate,
        notes: emptyStringToUndefined(input.notes) ?? "",
        reasonForLoss: emptyStringToUndefined(input.reasonForLoss),
        isChampion: input.isChampion ?? false,
        logo: mapLogo(input.logo),
        attachments: mapAttachments(
          input.attachments,
          actor.identity.subjectId
        ),
        createdBy: actor.identity.subjectId,
        createdOn: now,
      });

      if (created.accountManager) {
        await notifications.notifyAccountManagerAssigned({
          organizationId: actor.organizationId,
          customerId: created.id,
          name: created.name,
          reference: created.reference,
          accountManagerId: created.accountManager,
        });
      }

      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListCustomersQuery
    ): Promise<PaginatedCustomers> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });

      const effectiveQuery: ListCustomersQuery = { ...query };
      if (query.myCustomers) {
        effectiveQuery.accountManagerIds = [actor.identity.subjectId];
      }

      return repository.list(actor.organizationId, effectiveQuery, scope);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Customer> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireCustomer(actor.organizationId, id);
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateCustomerInput
    ): Promise<Customer> {
      const actor = requireOrgIdentity(identity);
      // V4 CRM update route uses CREATE permission; V5 modules follow the same pattern.
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireCustomer(actor.organizationId, id);

      const nextStage = input.stage ?? existing.stage;
      const nextStatus = input.status ?? existing.status;
      const nextProbability =
        input.probability !== undefined
          ? input.probability
          : existing.probability;
      if (!isValidProbability(nextProbability)) {
        throw new ValidationAppError(
          "Probability must be 10–90 in steps of 10"
        );
      }

      const nextStart =
        input.contractStartDate !== undefined
          ? (toDate(input.contractStartDate) ?? null)
          : existing.contractStartDate;
      const nextEnd =
        input.contractEndDate !== undefined
          ? (toDate(input.contractEndDate) ?? null)
          : existing.contractEndDate;
      const nextReview =
        input.reviewDate !== undefined
          ? (toDate(input.reviewDate) ?? null)
          : existing.reviewDate;

      const nextSecondaryContact =
        input.secondaryContact !== undefined
          ? input.secondaryContact
          : existing.secondaryContact;
      const nextSecondaryEmail =
        input.secondaryEmail !== undefined
          ? input.secondaryEmail
          : existing.secondaryEmail;
      const nextReason =
        input.reasonForLoss !== undefined
          ? input.reasonForLoss
          : existing.reasonForLoss;

      assertLiveContractDates({
        stage: nextStage,
        contractStartDate: nextStart,
        contractEndDate: nextEnd,
        reviewDate: nextReview,
      });
      assertLostReason({ status: nextStatus, reasonForLoss: nextReason });
      assertSecondaryContact({
        secondaryContact: nextSecondaryContact,
        secondaryEmail: nextSecondaryEmail,
      });

      if (input.name !== undefined && !input.name.trim()) {
        throw new ValidationAppError("Name is required");
      }
      if (input.primaryEmail !== undefined && !input.primaryEmail.trim()) {
        throw new ValidationAppError("Primary email is required");
      }

      const now = new Date();
      const appended = mapAttachments(
        input.attachments,
        actor.identity.subjectId
      );

      const updated = await repository.update(actor.organizationId, id, {
        name: input.name?.trim(),
        primaryEmail: input.primaryEmail?.trim().toLowerCase(),
        businessUnitId: input.businessUnitId,
        categoryId: input.categoryId,
        companyNumber: input.companyNumber,
        stage: input.stage,
        status: input.status,
        probability: input.probability,
        source: input.source,
        phoneNumber: input.phoneNumber,
        buildingName: input.buildingName,
        streetName: input.streetName,
        town: input.town,
        postCode: input.postCode,
        primaryContact: input.primaryContact,
        secondaryContact: input.secondaryContact,
        secondaryEmail: input.secondaryEmail,
        serviceProvision: input.serviceProvision,
        contractValue: input.contractValue,
        accountManager: input.accountManager,
        accountNumber: input.accountNumber,
        contractStartDate:
          input.contractStartDate !== undefined ? nextStart : undefined,
        contractEndDate:
          input.contractEndDate !== undefined ? nextEnd : undefined,
        reviewDate: input.reviewDate !== undefined ? nextReview : undefined,
        notes: input.notes,
        reasonForLoss: input.reasonForLoss,
        isChampion: input.isChampion,
        logo:
          input.logo === undefined
            ? undefined
            : input.logo === null
              ? null
              : mapLogo(input.logo),
        attachments:
          appended.length > 0
            ? [...existing.attachments, ...appended]
            : undefined,
        updatedBy: actor.identity.subjectId,
        updatedOn: now,
      });

      if (!updated) {
        throw new NotFoundError("This customer has been deleted or removed");
      }

      if (existing.stage !== updated.stage) {
        await notifications.notifyStageChanged({
          organizationId: actor.organizationId,
          customerId: updated.id,
          name: updated.name,
          reference: updated.reference,
          previousStage: existing.stage,
          stage: updated.stage,
          accountManagerId: updated.accountManager,
          createdBy: updated.createdBy,
        });
      }
      if (existing.status !== updated.status) {
        await notifications.notifyStatusChanged({
          organizationId: actor.organizationId,
          customerId: updated.id,
          name: updated.name,
          reference: updated.reference,
          previousStatus: existing.status,
          status: updated.status,
          accountManagerId: updated.accountManager,
          createdBy: updated.createdBy,
        });
      }
      if (
        updated.accountManager &&
        existing.accountManager !== updated.accountManager
      ) {
        await notifications.notifyAccountManagerAssigned({
          organizationId: actor.organizationId,
          customerId: updated.id,
          name: updated.name,
          reference: updated.reference,
          accountManagerId: updated.accountManager,
        });
      }

      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireCustomer(actor.organizationId, id);

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new NotFoundError("This customer has been deleted or removed");
      }

      await tasks.removeTasksSourcedFromCustomer({
        organizationId: actor.organizationId,
        customerId: existing.id,
      });
    },

    async removeAttachment(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<Customer> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireCustomer(actor.organizationId, id);

      const next = existing.attachments.filter(
        (file) => file.id !== attachmentId
      );
      if (next.length === existing.attachments.length) {
        throw new NotFoundError("Attachment not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        attachments: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError("This customer has been deleted or removed");
      }
      return updated;
    },

    async getOverview(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<CustomerOverview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      await requireCustomer(actor.organizationId, id);

      const [invoiceOverview, incidentBuckets] = await Promise.all([
        invoices.getCustomerInvoiceOverview({
          organizationId: actor.organizationId,
          customerId: id,
          identity: actor.identity,
        }),
        incidents.countLinkedIncidents({
          organizationId: actor.organizationId,
          customerId: id,
          identity: actor.identity,
        }),
      ]);

      return {
        totalInvoices: invoiceOverview.totalInvoices,
        totalIncidents: incidentBuckets,
        totalInvoiceAmount: invoiceOverview.byStatus,
      };
    },

    async getAccountManagerOverview(
      identity: SecurityIdentity | null | undefined,
      managerId: string
    ): Promise<AccountManagerOverview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");

      // UI always passes the session user; restrict to self to avoid cross-manager leakage.
      if (managerId !== actor.identity.subjectId) {
        throw new ForbiddenError(
          "Account manager overview is only available for the current user"
        );
      }

      const [customerSide, invoiceAnalysis, campaignStats, interactionStats] =
        await Promise.all([
          repository.managerAnalytics(actor.organizationId, managerId),
          invoices.getManagerInvoiceAnalysisThisMonth({
            organizationId: actor.organizationId,
            managerId,
            identity: actor.identity,
          }),
          campaigns.getManagerCampaignStats({
            organizationId: actor.organizationId,
            managerId,
            identity: actor.identity,
          }),
          interactions.getManagerInteractionAnalytics({
            organizationId: actor.organizationId,
            managerId,
            identity: actor.identity,
          }),
        ]);

      return {
        customerAnalysis: customerSide.customerAnalysis,
        invoiceAnalysis,
        contractStartedThisMonth: customerSide.contractStartedThisMonth,
        contractEndingThisMonth: customerSide.contractEndingThisMonth,
        contractReviewThisMonth: customerSide.contractReviewThisMonth,
        highestValueCustomer: customerSide.highestValueCustomer,
        mostValuedLiveCustomer: customerSide.mostValuedLiveCustomer,
        lessValuedLiveCustomer: customerSide.lessValuedLiveCustomer,
        activeCampaign: campaignStats.activeCampaign,
        closedCampaign: campaignStats.closedCampaign,
        monthlyCampaign: campaignStats.monthlyCampaign,
        latestCampaign: campaignStats.latestCampaign,
        interactions: interactionStats,
      };
    },
  };
}
