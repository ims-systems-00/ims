/**
 * Supplier Management application service.
 * Spec: docs/module-specifications/suppliers.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  SupplierCalendarPort,
  SupplierIncidentStatsPort,
  SupplierListScopePort,
  SupplierNotificationPort,
  SupplierTaskPort,
} from "../ports";
import {
  newAttachmentId,
  newKpiId,
  type SupplierRepository,
} from "../repositories/supplier.repository";
import {
  deriveComplianceRiskLevel,
  deriveIsCompliant,
  SUPPLIERS_RESOURCE,
  type AddKpiObjectiveInput,
  type AttachmentInput,
  type CreateSupplierInput,
  type ListSuppliersQuery,
  type PaginatedSuppliers,
  type Supplier,
  type SupplierAttachment,
  type SupplierStats,
  type UpdateSupplierInput,
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
  return `SUP-${stamp}-${rand}`;
}

function toDate(value: string | Date | null | undefined): Date | null | undefined {
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
): SupplierAttachment[] {
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

export type SupplierServiceDeps = {
  repository: SupplierRepository;
  authorizer: Authorizer;
  notifications: SupplierNotificationPort;
  tasks: SupplierTaskPort;
  calendar: SupplierCalendarPort;
  incidentStats: SupplierIncidentStatsPort;
  listScope: SupplierListScopePort;
};

export type SupplierService = ReturnType<typeof createSupplierService>;

export function createSupplierService(deps: SupplierServiceDeps) {
  const {
    repository,
    authorizer,
    notifications,
    tasks,
    calendar,
    incidentStats,
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
      resourceType: SUPPLIERS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access suppliers"
      );
    }
  }

  async function requireSupplier(
    organizationId: string,
    id: string
  ): Promise<Supplier> {
    const supplier = await repository.findById(organizationId, id);
    if (!supplier) {
      throw new NotFoundError("This supplier has been deleted or removed");
    }
    return supplier;
  }

  async function notifyComplianceIfNeeded(
    organizationId: string,
    previousCompliant: boolean,
    supplier: Supplier
  ): Promise<void> {
    if (!previousCompliant && supplier.isCompliant) {
      await notifications.notifyCompliantSupplier({
        organizationId,
        supplierId: supplier.id,
        name: supplier.name,
        reference: supplier.reference,
      });
    }
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateSupplierInput
    ): Promise<Supplier> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      if (!input.name?.trim()) {
        throw new ValidationAppError("Name is required");
      }
      if (!input.accountManager?.trim()) {
        throw new ValidationAppError("Account manager is required");
      }
      if (!input.accountNumber?.trim()) {
        throw new ValidationAppError("Account number is required");
      }
      if (!input.email?.trim()) {
        throw new ValidationAppError("Email is required");
      }
      if (!input.serviceProvision?.trim()) {
        throw new ValidationAppError("Service provision is required");
      }
      if (input.contractValue === undefined || input.contractValue === null) {
        throw new ValidationAppError("Contract value is required");
      }
      if (Number.isNaN(Number(input.contractValue))) {
        throw new ValidationAppError("Contract value must be a number");
      }

      const contractStartDate = toDate(input.contractStartDate);
      if (!contractStartDate) {
        throw new ValidationAppError("Contract start date is required");
      }

      const slaFiles = mapAttachments(
        input.slaFiles,
        actor.identity.subjectId
      );
      const contractFiles = mapAttachments(
        input.contractFiles,
        actor.identity.subjectId
      );
      const onboardingFiles = mapAttachments(
        input.onboardingFiles,
        actor.identity.subjectId
      );
      const isCompliant = deriveIsCompliant({ slaFiles, contractFiles });
      const createdOn = new Date();
      const reviewDate = toDate(input.reviewDate) ?? null;
      const contractEndDate = toDate(input.contractEndDate) ?? null;

      const created = await repository.create(actor.organizationId, {
        reference: nextReference(),
        name: input.name.trim(),
        businessUnitId: input.businessUnitId,
        accountManager: input.accountManager.trim(),
        accountNumber: input.accountNumber.trim(),
        email: input.email.trim().toLowerCase(),
        buyerId: input.buyerId,
        serviceProvision: input.serviceProvision.trim(),
        contractValue: Number(input.contractValue),
        contractStartDate,
        contractEndDate,
        reviewDate,
        slaFiles,
        contractFiles,
        onboardingFiles,
        kpiObjectives: [],
        isCompliant,
        createdBy: actor.identity.subjectId,
        createdOn,
      });

      if (created.buyerId) {
        await notifications.notifyBuyerAssigned({
          organizationId: actor.organizationId,
          supplierId: created.id,
          name: created.name,
          reference: created.reference,
          buyerId: created.buyerId,
        });
      }

      if (created.isCompliant) {
        await notifications.notifyCompliantSupplier({
          organizationId: actor.organizationId,
          supplierId: created.id,
          name: created.name,
          reference: created.reference,
        });
      }

      await calendar.upsertReviewEvent({
        organizationId: actor.organizationId,
        supplierId: created.id,
        name: created.name,
        reference: created.reference,
        reviewDate: created.reviewDate ?? null,
        businessUnitId: created.businessUnitId,
      });

      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListSuppliersQuery
    ): Promise<PaginatedSuppliers> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });
      return repository.list(actor.organizationId, query, scope);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Supplier> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireSupplier(actor.organizationId, id);
    },

    async stats(
      identity: SecurityIdentity | null | undefined
    ): Promise<SupplierStats> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });

      const [aggregate, linkedIncidents] = await Promise.all([
        repository.statsAggregate(actor.organizationId, scope),
        incidentStats.countLinkedIncidents({
          organizationId: actor.organizationId,
          identity: actor.identity,
        }),
      ]);

      const inCompliant = aggregate.total - aggregate.compliant;
      const percentage = aggregate.total
        ? Math.round((aggregate.compliant / aggregate.total) * 100)
        : 0;

      return {
        procurementValue: aggregate.procurementValue,
        supplierIncidents: linkedIncidents,
        supplierCompliance: {
          compliant: aggregate.compliant,
          inCompliant,
          percentage,
          riskLevel: deriveComplianceRiskLevel(percentage),
        },
      };
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateSupplierInput
    ): Promise<Supplier> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireSupplier(actor.organizationId, id);
      const previousCompliant = existing.isCompliant;

      const appendedSla = mapAttachments(
        input.slaFiles,
        actor.identity.subjectId
      );
      const appendedContracts = mapAttachments(
        input.contractFiles,
        actor.identity.subjectId
      );
      const appendedOnboarding = mapAttachments(
        input.onboardingFiles,
        actor.identity.subjectId
      );

      const nextSla =
        appendedSla.length > 0
          ? [...existing.slaFiles, ...appendedSla]
          : undefined;
      const nextContracts =
        appendedContracts.length > 0
          ? [...existing.contractFiles, ...appendedContracts]
          : undefined;
      const nextOnboarding =
        appendedOnboarding.length > 0
          ? [...existing.onboardingFiles, ...appendedOnboarding]
          : undefined;

      const slaForCompliance = nextSla ?? existing.slaFiles;
      const contractsForCompliance = nextContracts ?? existing.contractFiles;
      const isCompliant = deriveIsCompliant({
        slaFiles: slaForCompliance,
        contractFiles: contractsForCompliance,
      });

      const buyerChanged =
        input.buyerId !== undefined &&
        input.buyerId !== null &&
        input.buyerId !== existing.buyerId;

      const patch: Parameters<SupplierRepository["update"]>[2] = {
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        isCompliant,
      };

      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.accountManager !== undefined) {
        patch.accountManager = input.accountManager.trim();
      }
      if (input.accountNumber !== undefined) {
        patch.accountNumber = input.accountNumber.trim();
      }
      if (input.email !== undefined) {
        patch.email = input.email.trim().toLowerCase();
      }
      if (input.serviceProvision !== undefined) {
        patch.serviceProvision = input.serviceProvision.trim();
      }
      if (input.contractValue !== undefined) {
        patch.contractValue = Number(input.contractValue);
      }
      if (input.contractStartDate !== undefined) {
        const start = toDate(input.contractStartDate);
        if (!start) {
          throw new ValidationAppError("Contract start date is required");
        }
        patch.contractStartDate = start;
      }
      if (input.contractEndDate !== undefined) {
        patch.contractEndDate = toDate(input.contractEndDate) ?? null;
      }
      if (input.reviewDate !== undefined) {
        patch.reviewDate = toDate(input.reviewDate) ?? null;
      }
      if (input.buyerId !== undefined) patch.buyerId = input.buyerId;
      if (nextSla) patch.slaFiles = nextSla;
      if (nextContracts) patch.contractFiles = nextContracts;
      if (nextOnboarding) patch.onboardingFiles = nextOnboarding;

      const updated = await repository.update(
        actor.organizationId,
        id,
        patch
      );
      if (!updated) {
        throw new NotFoundError("This supplier has been deleted or removed");
      }

      if (buyerChanged && updated.buyerId) {
        await notifications.notifyBuyerAssigned({
          organizationId: actor.organizationId,
          supplierId: updated.id,
          name: updated.name,
          reference: updated.reference,
          buyerId: updated.buyerId,
        });
      }

      await notifyComplianceIfNeeded(
        actor.organizationId,
        previousCompliant,
        updated
      );

      if (
        input.reviewDate !== undefined ||
        input.name !== undefined ||
        input.serviceProvision !== undefined
      ) {
        await calendar.upsertReviewEvent({
          organizationId: actor.organizationId,
          supplierId: updated.id,
          name: updated.name,
          reference: updated.reference,
          reviewDate: updated.reviewDate ?? null,
          businessUnitId: updated.businessUnitId,
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
      await requireSupplier(actor.organizationId, id);

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new NotFoundError("This supplier has been deleted or removed");
      }

      await tasks.removeTasksSourcedFromSupplier({
        organizationId: actor.organizationId,
        supplierId: id,
      });

      await calendar.removeReviewEvent({
        organizationId: actor.organizationId,
        supplierId: id,
      });
    },

    async addSlaFiles(
      identity: SecurityIdentity | null | undefined,
      id: string,
      files: AttachmentInput[]
    ): Promise<Supplier> {
      return appendFiles(identity, id, "sla", files);
    },

    async removeSlaFile(
      identity: SecurityIdentity | null | undefined,
      id: string,
      fileId: string
    ): Promise<Supplier> {
      return removeFile(identity, id, "sla", fileId);
    },

    async addContractFiles(
      identity: SecurityIdentity | null | undefined,
      id: string,
      files: AttachmentInput[]
    ): Promise<Supplier> {
      return appendFiles(identity, id, "contract", files);
    },

    async removeContractFile(
      identity: SecurityIdentity | null | undefined,
      id: string,
      fileId: string
    ): Promise<Supplier> {
      return removeFile(identity, id, "contract", fileId);
    },

    async addOnboardingFiles(
      identity: SecurityIdentity | null | undefined,
      id: string,
      files: AttachmentInput[]
    ): Promise<Supplier> {
      return appendFiles(identity, id, "onboarding", files);
    },

    async removeOnboardingFile(
      identity: SecurityIdentity | null | undefined,
      id: string,
      fileId: string
    ): Promise<Supplier> {
      return removeFile(identity, id, "onboarding", fileId);
    },

    async addKpiObjective(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: AddKpiObjectiveInput
    ): Promise<Supplier> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireSupplier(actor.organizationId, id);

      if (!input.value?.trim()) {
        throw new ValidationAppError("KPI objective value is required");
      }

      const updated = await repository.update(actor.organizationId, id, {
        kpiObjectives: [
          ...existing.kpiObjectives,
          { id: newKpiId(), value: input.value.trim() },
        ],
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError("This supplier has been deleted or removed");
      }
      return updated;
    },

    async removeKpiObjective(
      identity: SecurityIdentity | null | undefined,
      id: string,
      kpiId: string
    ): Promise<Supplier> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireSupplier(actor.organizationId, id);

      const next = existing.kpiObjectives.filter((entry) => entry.id !== kpiId);
      if (next.length === existing.kpiObjectives.length) {
        throw new NotFoundError("KPI objective not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        kpiObjectives: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError("This supplier has been deleted or removed");
      }
      return updated;
    },
  };

  async function appendFiles(
    identity: SecurityIdentity | null | undefined,
    id: string,
    kind: "sla" | "contract" | "onboarding",
    files: AttachmentInput[]
  ): Promise<Supplier> {
    const actor = requireOrgIdentity(identity);
    await assertAllowed(actor.identity, "create", id);
    const existing = await requireSupplier(actor.organizationId, id);
    const previousCompliant = existing.isCompliant;

    if (!files?.length) {
      throw new ValidationAppError("At least one file is required");
    }

    const mapped = mapAttachments(files, actor.identity.subjectId);
    const patch: Parameters<SupplierRepository["update"]>[2] = {
      updatedBy: actor.identity.subjectId,
      updatedOn: new Date(),
    };

    if (kind === "sla") {
      patch.slaFiles = [...existing.slaFiles, ...mapped];
      patch.isCompliant = deriveIsCompliant({
        slaFiles: patch.slaFiles,
        contractFiles: existing.contractFiles,
      });
    } else if (kind === "contract") {
      patch.contractFiles = [...existing.contractFiles, ...mapped];
      patch.isCompliant = deriveIsCompliant({
        slaFiles: existing.slaFiles,
        contractFiles: patch.contractFiles,
      });
    } else {
      patch.onboardingFiles = [...existing.onboardingFiles, ...mapped];
    }

    const updated = await repository.update(
      actor.organizationId,
      id,
      patch
    );
    if (!updated) {
      throw new NotFoundError("This supplier has been deleted or removed");
    }

    if (kind !== "onboarding") {
      await notifyComplianceIfNeeded(
        actor.organizationId,
        previousCompliant,
        updated
      );
    }

    return updated;
  }

  async function removeFile(
    identity: SecurityIdentity | null | undefined,
    id: string,
    kind: "sla" | "contract" | "onboarding",
    fileId: string
  ): Promise<Supplier> {
    const actor = requireOrgIdentity(identity);
    await assertAllowed(actor.identity, "delete", id);
    const existing = await requireSupplier(actor.organizationId, id);
    const previousCompliant = existing.isCompliant;

    const patch: Parameters<SupplierRepository["update"]>[2] = {
      updatedBy: actor.identity.subjectId,
      updatedOn: new Date(),
    };

    if (kind === "sla") {
      const next = existing.slaFiles.filter((file) => file.id !== fileId);
      if (next.length === existing.slaFiles.length) {
        throw new NotFoundError("SLA file not found");
      }
      patch.slaFiles = next;
      patch.isCompliant = deriveIsCompliant({
        slaFiles: next,
        contractFiles: existing.contractFiles,
      });
    } else if (kind === "contract") {
      const next = existing.contractFiles.filter((file) => file.id !== fileId);
      if (next.length === existing.contractFiles.length) {
        throw new NotFoundError("Contract file not found");
      }
      patch.contractFiles = next;
      patch.isCompliant = deriveIsCompliant({
        slaFiles: existing.slaFiles,
        contractFiles: next,
      });
    } else {
      const next = existing.onboardingFiles.filter(
        (file) => file.id !== fileId
      );
      if (next.length === existing.onboardingFiles.length) {
        throw new NotFoundError("Onboarding file not found");
      }
      patch.onboardingFiles = next;
    }

    const updated = await repository.update(
      actor.organizationId,
      id,
      patch
    );
    if (!updated) {
      throw new NotFoundError("This supplier has been deleted or removed");
    }

    if (kind !== "onboarding") {
      await notifyComplianceIfNeeded(
        actor.organizationId,
        previousCompliant,
        updated
      );
    }

    return updated;
  }
}
