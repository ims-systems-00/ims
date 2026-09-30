/**
 * Audit application service.
 * Spec: docs/module-specifications/audit.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  AuditCalendarPort,
  AuditCipPromotionPort,
  AuditIncidentPromotionPort,
  AuditListScopePort,
  AuditNotificationPort,
  AuditReportPort,
  AuditRiskPromotionPort,
  AuditTaskPort,
} from "../ports";
import {
  newAttachmentId,
  newFindingId,
  type PersistAuditCreate,
  type AuditRepository,
} from "../repositories/audit.repository";
import {
  AUDITS_RESOURCE,
  INTERVAL_OCCURRENCES,
  type Audit,
  type AuditAttachment,
  type AuditEmbeddedRisk,
  type AuditIdentification,
  type AuditOfi,
  type AuditStats,
  type CreateAuditInput,
  type CreateEmbeddedRiskInput,
  type CreateIdentificationInput,
  type CreateOfiInput,
  type ExtractReportInput,
  type ListAuditsQuery,
  type PaginatedAudits,
  type SetComplianceLinksInput,
  type UpdateAuditInput,
  type UpdateEmbeddedRiskInput,
  type UpdateIdentificationInput,
  type UpdateOfiInput,
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
  return `AUD-${stamp}-${rand}`;
}

function assertNotCompleted(audit: Audit): void {
  if (audit.completed.status) {
    throw new ConflictError("Completed audits cannot be modified");
  }
}

/**
 * Spread occurrences across the year; move weekend dates to Monday.
 * Matches V4 createAudit interval behaviour.
 */
export function buildScheduleDates(
  startDate: Date,
  interval: keyof typeof INTERVAL_OCCURRENCES
): Date[] {
  const occurrences = INTERVAL_OCCURRENCES[interval];
  const monthsApart = 12 / occurrences;
  const dates: Date[] = [];

  for (let i = 0; i < occurrences; i += 1) {
    const scheduled = new Date(startDate);
    scheduled.setMonth(scheduled.getMonth() + Math.round(i * monthsApart));
    dates.push(adjustWeekend(scheduled));
  }
  return dates;
}

function adjustWeekend(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  if (day === 0) result.setDate(result.getDate() + 1);
  else if (day === 6) result.setDate(result.getDate() + 2);
  return result;
}

function mapAttachments(
  input: CreateAuditInput["attachments"] | UpdateAuditInput["attachments"],
  actorId: string
): AuditAttachment[] {
  if (!input || input.length === 0) return [];
  const now = new Date();
  return input.map((file) => ({
    id: newAttachmentId(),
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    url: file.url || undefined,
    uploadedBy: actorId,
    uploadedAt: now,
  }));
}

function assertScore(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new ValidationAppError(`${field} must be an integer between 1 and 5`);
  }
}

export type AuditServiceDeps = {
  repository: AuditRepository;
  authorizer: Authorizer;
  notifications: AuditNotificationPort;
  calendar: AuditCalendarPort;
  tasks: AuditTaskPort;
  reports: AuditReportPort;
  listScope: AuditListScopePort;
  incidents: AuditIncidentPromotionPort;
  risks: AuditRiskPromotionPort;
  cips: AuditCipPromotionPort;
};

export type AuditService = ReturnType<typeof createAuditService>;

export function createAuditService(deps: AuditServiceDeps) {
  const {
    repository,
    authorizer,
    notifications,
    calendar,
    tasks,
    reports,
    listScope,
    incidents,
    risks,
    cips,
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: AUDITS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access audits"
      );
    }
  }

  async function requireAudit(
    organizationId: string,
    id: string
  ): Promise<Audit> {
    const audit = await repository.findById(organizationId, id);
    if (!audit) {
      throw new NotFoundError("This audit has been deleted or removed");
    }
    return audit;
  }

  async function syncCalendar(audit: Audit): Promise<void> {
    await calendar.upsertAuditEvent({
      organizationId: audit.organizationId,
      auditId: audit.id,
      reference: audit.reference,
      title: audit.title,
      type: audit.type,
      startDate: audit.startDate,
      time: audit.time,
      businessUnitId: audit.businessUnitId,
      complianceBodyId: audit.complianceBodyId,
      auditorId: audit.auditorId,
    });
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateAuditInput
    ): Promise<{ items: Audit[] }> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      if (!input.title?.trim()) {
        throw new ValidationAppError("Title is required");
      }
      if (!input.focusArea?.trim()) {
        throw new ValidationAppError("Focus area is required");
      }
      if (!input.auditorId?.trim()) {
        throw new ValidationAppError("Auditor is required");
      }
      if (!input.businessUnitId?.trim()) {
        throw new ValidationAppError("Business unit is required");
      }
      if (!input.complianceBodyId?.trim()) {
        throw new ValidationAppError("Compliance body is required");
      }
      if (!(input.startDate instanceof Date) || Number.isNaN(input.startDate.getTime())) {
        throw new ValidationAppError("Start date is required");
      }

      const createdOn = new Date();
      const scheduleDates = buildScheduleDates(input.startDate, input.interval);
      const firstAttachments = mapAttachments(
        input.attachments,
        actor.identity.subjectId
      );

      const payloads: PersistAuditCreate[] = scheduleDates.map(
        (startDate, index) => ({
          reference: nextReference(),
          title: input.title.trim(),
          type: input.type,
          focusArea: input.focusArea.trim(),
          businessUnitId: input.businessUnitId,
          complianceBodyId: input.complianceBodyId,
          auditorId: input.auditorId,
          startDate,
          time: input.time?.trim() || undefined,
          interval: input.interval,
          attachments: index === 0 ? firstAttachments : [],
          createdBy: actor.identity.subjectId,
          createdOn,
        })
      );

      const items = await repository.createMany(
        actor.organizationId,
        payloads
      );

      for (const audit of items) {
        await notifications.notifyScheduled({
          organizationId: actor.organizationId,
          auditId: audit.id,
          title: audit.title,
          reference: audit.reference,
          auditorId: audit.auditorId,
          businessUnitId: audit.businessUnitId,
        });
        await syncCalendar(audit);
      }

      return { items };
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListAuditsQuery
    ): Promise<PaginatedAudits> {
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
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireAudit(actor.organizationId, id);
    },

    async stats(
      identity: SecurityIdentity | null | undefined,
      type?: ListAuditsQuery["type"]
    ): Promise<AuditStats> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });
      return repository.stats(actor.organizationId, scope, type);
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateAuditInput
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      // Spec: update uses create permission on backend.
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const patch: Parameters<AuditRepository["update"]>[2] = {
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      };

      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.focusArea !== undefined) {
        patch.focusArea = input.focusArea.trim();
      }
      if (input.businessUnitId !== undefined) {
        patch.businessUnitId = input.businessUnitId;
      }
      if (input.complianceBodyId !== undefined) {
        patch.complianceBodyId = input.complianceBodyId;
      }
      if (input.startDate !== undefined) patch.startDate = input.startDate;
      if (input.time !== undefined) patch.time = input.time;
      if (input.comment !== undefined) patch.comment = input.comment;

      if (input.attachments && input.attachments.length > 0) {
        const added = mapAttachments(
          input.attachments,
          actor.identity.subjectId
        );
        patch.attachments = [...existing.attachments, ...added];
      }

      const updated = await repository.update(
        actor.organizationId,
        id,
        patch
      );
      if (!updated) throw new NotFoundError("Audit not found");

      await syncCalendar(updated);
      return updated;
    },

    async complete(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireAudit(actor.organizationId, id);
      if (existing.completed.status) {
        throw new ConflictError("Audit is already completed");
      }

      // Spec intended rule: cannot complete before scheduled start date.
      // Uses startDate (V4 incorrectly referenced non-existent scheduledDate).
      if (Date.now() < existing.startDate.getTime()) {
        throw new ConflictError(
          "Audit cannot be completed before the schedule date"
        );
      }

      const completedOn = new Date();
      const updated = await repository.update(actor.organizationId, id, {
        completed: {
          status: true,
          by: actor.identity.subjectId,
          on: completedOn,
        },
        updatedBy: actor.identity.subjectId,
        updatedOn: completedOn,
      });
      if (!updated) throw new NotFoundError("Audit not found");

      await Promise.all([
        ...updated.identifications.map((identification) =>
          incidents.promoteNonConformity({
            identity: actor.identity,
            organizationId: actor.organizationId,
            auditId: updated.id,
            identification,
            businessUnitId: updated.businessUnitId,
            auditorId: updated.auditorId,
          })
        ),
        ...updated.risks.map((risk) =>
          risks.promoteEmbeddedRisk({
            identity: actor.identity,
            organizationId: actor.organizationId,
            auditId: updated.id,
            risk,
            businessUnitId: updated.businessUnitId,
            auditorId: updated.auditorId,
          })
        ),
        ...updated.ofis.map((ofi) =>
          cips.promoteOfi({
            identity: actor.identity,
            organizationId: actor.organizationId,
            auditId: updated.id,
            ofi,
            businessUnitId: updated.businessUnitId,
            auditorId: updated.auditorId,
          })
        ),
      ]);

      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireAudit(actor.organizationId, id);
      if (existing.completed.status) {
        throw new ConflictError("Completed audits cannot be deleted");
      }

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) throw new NotFoundError("Audit not found");

      await tasks.removeTasksSourcedFromAudit({
        organizationId: actor.organizationId,
        auditId: existing.id,
      });
      await calendar.removeAuditEvent({
        organizationId: actor.organizationId,
        auditId: existing.id,
      });
    },

    async addIdentification(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: CreateIdentificationInput
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const entry: AuditIdentification = {
        id: newFindingId(),
        nonConformity: input.nonConformity.trim(),
        rootCause: input.rootCause.trim(),
      };

      const updated = await repository.update(actor.organizationId, id, {
        identifications: [...existing.identifications, entry],
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async updateIdentification(
      identity: SecurityIdentity | null | undefined,
      id: string,
      identificationId: string,
      input: UpdateIdentificationInput
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const index = existing.identifications.findIndex(
        (item) => item.id === identificationId
      );
      if (index < 0) throw new NotFoundError("Non-conformity not found");

      const next = [...existing.identifications];
      const current = next[index]!;
      next[index] = {
        ...current,
        nonConformity:
          input.nonConformity !== undefined
            ? input.nonConformity.trim()
            : current.nonConformity,
        rootCause:
          input.rootCause !== undefined
            ? input.rootCause.trim()
            : current.rootCause,
      };

      const updated = await repository.update(actor.organizationId, id, {
        identifications: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async removeIdentification(
      identity: SecurityIdentity | null | undefined,
      id: string,
      identificationId: string
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const next = existing.identifications.filter(
        (item) => item.id !== identificationId
      );
      if (next.length === existing.identifications.length) {
        throw new NotFoundError("Non-conformity not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        identifications: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async addRisk(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: CreateEmbeddedRiskInput
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      assertScore(input.likelihood, "likelihood");
      assertScore(input.consequence, "consequence");

      const entry: AuditEmbeddedRisk = {
        id: newFindingId(),
        title: input.title.trim(),
        description: input.description.trim(),
        likelihood: input.likelihood,
        consequence: input.consequence,
        total: input.likelihood * input.consequence,
      };

      const updated = await repository.update(actor.organizationId, id, {
        risks: [entry, ...existing.risks],
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async updateRisk(
      identity: SecurityIdentity | null | undefined,
      id: string,
      riskId: string,
      input: UpdateEmbeddedRiskInput
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const index = existing.risks.findIndex((item) => item.id === riskId);
      if (index < 0) throw new NotFoundError("Embedded risk not found");

      const current = existing.risks[index]!;
      const likelihood = input.likelihood ?? current.likelihood;
      const consequence = input.consequence ?? current.consequence;
      assertScore(likelihood, "likelihood");
      assertScore(consequence, "consequence");

      const next = [...existing.risks];
      next[index] = {
        ...current,
        title: input.title !== undefined ? input.title.trim() : current.title,
        description:
          input.description !== undefined
            ? input.description.trim()
            : current.description,
        likelihood,
        consequence,
        total: likelihood * consequence,
      };

      const updated = await repository.update(actor.organizationId, id, {
        risks: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async removeRisk(
      identity: SecurityIdentity | null | undefined,
      id: string,
      riskId: string
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const next = existing.risks.filter((item) => item.id !== riskId);
      if (next.length === existing.risks.length) {
        throw new NotFoundError("Embedded risk not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        risks: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async addOfi(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: CreateOfiInput
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const entry: AuditOfi = {
        id: newFindingId(),
        title: input.title.trim(),
        opportunityForImprovement: input.opportunityForImprovement.trim(),
      };

      const updated = await repository.update(actor.organizationId, id, {
        ofis: [entry, ...existing.ofis],
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async updateOfi(
      identity: SecurityIdentity | null | undefined,
      id: string,
      ofiId: string,
      input: UpdateOfiInput
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const index = existing.ofis.findIndex((item) => item.id === ofiId);
      if (index < 0) throw new NotFoundError("OFI not found");

      const current = existing.ofis[index]!;
      const next = [...existing.ofis];
      next[index] = {
        ...current,
        title: input.title !== undefined ? input.title.trim() : current.title,
        opportunityForImprovement:
          input.opportunityForImprovement !== undefined
            ? input.opportunityForImprovement.trim()
            : current.opportunityForImprovement,
      };

      const updated = await repository.update(actor.organizationId, id, {
        ofis: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async removeOfi(
      identity: SecurityIdentity | null | undefined,
      id: string,
      ofiId: string
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const next = existing.ofis.filter((item) => item.id !== ofiId);
      if (next.length === existing.ofis.length) {
        throw new NotFoundError("OFI not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        ofis: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async removeAttachment(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const next = existing.attachments.filter((a) => a.id !== attachmentId);
      if (next.length === existing.attachments.length) {
        throw new NotFoundError("Attachment not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        attachments: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async setComplianceLinks(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: SetComplianceLinksInput
    ): Promise<Audit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireAudit(actor.organizationId, id);
      assertNotCompleted(existing);

      const updated = await repository.update(actor.organizationId, id, {
        complianceLinks: input.links,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Audit not found");
      return updated;
    },

    async extractReport(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: ExtractReportInput
    ): Promise<{ message: string; audit: Audit }> {
      const actor = requireOrgIdentity(identity);
      // Spec: backend requires Audit create permission.
      await assertAllowed(actor.identity, "create", id);
      const audit = await requireAudit(actor.organizationId, id);

      await reports.enqueueExtractReport({
        organizationId: actor.organizationId,
        audit,
        recipientName: input.recipientName.trim(),
        recipientEmail: input.recipientEmail.trim().toLowerCase(),
        senderSubjectId: actor.identity.subjectId,
      });

      return {
        message: "Audit report has been queued for delivery",
        audit,
      };
    },
  };
}
