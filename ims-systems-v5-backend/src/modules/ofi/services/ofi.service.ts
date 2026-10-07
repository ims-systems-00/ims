/**
 * OFI application service.
 * Spec: docs/module-specifications/ofi.md
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
  OfiComplianceLinkPort,
  OfiListScopePort,
  OfiNotificationPort,
  OfiTaskPort,
} from "../ports";
import { NoOpOfiComplianceLinkAdapter } from "../ports";
import {
  newActivityEntry,
  newAttachmentId,
  type OfiRepository,
} from "../repositories/ofi.repository";
import {
  NUDGE_COOLDOWN_MS,
  OFI_RESOURCE,
  type AddOfiActivityInput,
  type ComplianceLink,
  type CreateOfiInput,
  type ListOfisQuery,
  type Ofi,
  type OfiAttachment,
  type OfiStats,
  type PaginatedOfis,
  type PromoteOfiFromAuditInput,
  type SetComplianceLinksInput,
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
  return `OFI-${stamp}-${rand}`;
}

function assertNotImplemented(ofi: Ofi): void {
  if (ofi.implemented.status === "Implemented") {
    throw new ConflictError("Implemented OFIs cannot be modified");
  }
}

function isAuditSourced(ofi: Ofi): boolean {
  return ofi.source?.moduleType?.toLowerCase().includes("audit") === true;
}

function isObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function mapAttachments(
  input: CreateOfiInput["attachments"] | UpdateOfiInput["attachments"],
  actorId: string
): OfiAttachment[] {
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

export type OfiServiceDeps = {
  repository: OfiRepository;
  authorizer: Authorizer;
  notifications: OfiNotificationPort;
  tasks: OfiTaskPort;
  listScope: OfiListScopePort;
  complianceLinks?: OfiComplianceLinkPort;
};

export type OfiService = ReturnType<typeof createOfiService>;

function mergeComplianceClause(
  links: ComplianceLink[],
  toolkitId: string,
  clause: string
): ComplianceLink[] {
  const existing = links.find((link) => link.toolkitId === toolkitId);
  if (!existing) {
    return [...links, { toolkitId, clauseIds: [clause] }];
  }
  if (existing.clauseIds.includes(clause)) return links;
  return links.map((link) =>
    link.toolkitId === toolkitId
      ? { ...link, clauseIds: [...link.clauseIds, clause] }
      : link
  );
}

function removeComplianceClause(
  links: ComplianceLink[],
  toolkitId: string,
  clause: string
): ComplianceLink[] {
  return links
    .map((link) =>
      link.toolkitId === toolkitId
        ? {
            ...link,
            clauseIds: link.clauseIds.filter((item) => item !== clause),
          }
        : link
    )
    .filter((link) => link.clauseIds.length > 0);
}

export function createOfiService(deps: OfiServiceDeps) {
  const {
    repository,
    authorizer,
    notifications,
    tasks,
    listScope,
    complianceLinks = new NoOpOfiComplianceLinkAdapter(),
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: OFI_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError("User does not have permission to access OFIs");
    }
  }

  async function requireOfi(
    organizationId: string,
    id: string
  ): Promise<Ofi> {
    const ofi = await repository.findById(organizationId, id);
    if (!ofi) {
      throw new NotFoundError("This OFI has been deleted or removed");
    }
    return ofi;
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateOfiInput
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      if (!input.title?.trim()) {
        throw new ValidationAppError("Title is required");
      }
      if (!input.opportunityForImprovement?.trim()) {
        throw new ValidationAppError(
          "Opportunity for improvement is required"
        );
      }
      if (!input.ownerId?.trim()) {
        throw new ValidationAppError("Owner is required");
      }
      if (!input.businessUnitId?.trim()) {
        throw new ValidationAppError("Business unit is required");
      }

      const createdOn = new Date();
      const created = await repository.create(actor.organizationId, {
        reference: nextReference(),
        title: input.title.trim(),
        opportunityForImprovement: input.opportunityForImprovement.trim(),
        ownerId: input.ownerId,
        businessUnitId: input.businessUnitId,
        cost: input.cost,
        attachments: mapAttachments(input.attachments, actor.identity.subjectId),
        source: input.source,
        activity: [
          newActivityEntry(
            "raised",
            "OFI raised",
            actor.identity.subjectId
          ),
        ],
        createdBy: actor.identity.subjectId,
        createdOn,
      });

      await notifications.notifyOwnerAssigned({
        organizationId: actor.organizationId,
        ofiId: created.id,
        title: created.title,
        reference: created.reference,
        ownerId: created.ownerId!,
      });

      return created;
    },

    /**
     * Used by Audit completion to promote embedded OFIs.
     * Spec: same identifier preferred; owner may be omitted.
     */
    async createFromAuditPromotion(
      identity: SecurityIdentity | null | undefined,
      input: PromoteOfiFromAuditInput
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      const preferredId =
        input.id && isObjectId(input.id) ? input.id : undefined;

      const created = await repository.create(actor.organizationId, {
        id: preferredId,
        reference: nextReference(),
        title: input.title.trim(),
        opportunityForImprovement: input.opportunityForImprovement.trim(),
        businessUnitId: input.businessUnitId,
        source: { moduleType: "audits", moduleId: input.auditId },
        attachments: [],
        activity: [
          newActivityEntry(
            "promoted",
            "OFI promoted from completed audit",
            input.createdBy
          ),
        ],
        createdBy: input.createdBy,
        createdOn: new Date(),
      });

      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListOfisQuery
    ): Promise<PaginatedOfis> {
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
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireOfi(actor.organizationId, id);
    },

    async stats(
      identity: SecurityIdentity | null | undefined
    ): Promise<OfiStats> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });
      return repository.stats(actor.organizationId, scope);
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateOfiInput
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireOfi(actor.organizationId, id);
      assertNotImplemented(existing);

      if (isAuditSourced(existing)) {
        if (input.title !== undefined || input.opportunityForImprovement !== undefined) {
          throw new ConflictError(
            "Title and opportunity for improvement are locked on audit-sourced OFIs"
          );
        }
      }

      const patch: Parameters<OfiRepository["update"]>[2] = {
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      };

      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.opportunityForImprovement !== undefined) {
        patch.opportunityForImprovement =
          input.opportunityForImprovement.trim();
      }
      if (input.cost !== undefined) patch.cost = input.cost;

      const ownerChanged =
        input.ownerId !== undefined &&
        input.ownerId !== null &&
        input.ownerId !== existing.ownerId;

      if (input.ownerId !== undefined) {
        patch.ownerId = input.ownerId;
        if (ownerChanged) {
          patch.activityEntry = newActivityEntry(
            "owner_changed",
            "OFI owner reassigned",
            actor.identity.subjectId
          );
        }
      }

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
      if (!updated) {
        throw new NotFoundError("This OFI has been deleted or removed");
      }

      if (ownerChanged && updated.ownerId) {
        await notifications.notifyOwnerAssigned({
          organizationId: actor.organizationId,
          ofiId: updated.id,
          title: updated.title,
          reference: updated.reference,
          ownerId: updated.ownerId,
        });
      }

      return updated;
    },

    async implement(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireOfi(actor.organizationId, id);
      if (existing.implemented.status === "Implemented") {
        throw new ConflictError("OFI is already implemented");
      }

      const implementedOn = new Date();
      const updated = await repository.update(actor.organizationId, id, {
        implemented: {
          status: "Implemented",
          by: actor.identity.subjectId,
          on: implementedOn,
        },
        updatedBy: actor.identity.subjectId,
        updatedOn: implementedOn,
        activityEntry: newActivityEntry(
          "implemented",
          "OFI marked as implemented",
          actor.identity.subjectId
        ),
      });
      if (!updated) {
        throw new NotFoundError("This OFI has been deleted or removed");
      }

      await notifications.notifyImplemented({
        organizationId: actor.organizationId,
        ofiId: updated.id,
        title: updated.title,
        reference: updated.reference,
        businessUnitId: updated.businessUnitId,
      });

      return updated;
    },

    async addActivity(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: AddOfiActivityInput
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireOfi(actor.organizationId, id);
      assertNotImplemented(existing);

      if (!input.message?.trim()) {
        throw new ValidationAppError("Activity message is required");
      }

      const patch: Parameters<OfiRepository["update"]>[2] = {
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "comment",
          input.message.trim(),
          actor.identity.subjectId
        ),
      };

      // Spec: first timeline activity moves Pending → In Progress.
      if (existing.implemented.status === "Pending") {
        patch.implemented = {
          status: "In Progress",
          by: null,
          on: null,
        };
      }

      const updated = await repository.update(
        actor.organizationId,
        id,
        patch
      );
      if (!updated) {
        throw new NotFoundError("This OFI has been deleted or removed");
      }
      return updated;
    },

    async nudge(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireOfi(actor.organizationId, id);
      assertNotImplemented(existing);

      if (!existing.ownerId) {
        throw new ValidationAppError("OFI has no owner to nudge");
      }
      if (
        existing.nextNudgeAt &&
        existing.nextNudgeAt.getTime() > Date.now()
      ) {
        throw new ConflictError("Nudge cooldown is still active");
      }

      const updated = await repository.update(actor.organizationId, id, {
        nextNudgeAt: new Date(Date.now() + NUDGE_COOLDOWN_MS),
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "nudged",
          "OFI owner nudged",
          actor.identity.subjectId
        ),
      });
      if (!updated) {
        throw new NotFoundError("This OFI has been deleted or removed");
      }

      await notifications.notifyNudge({
        organizationId: actor.organizationId,
        ofiId: updated.id,
        title: updated.title,
        reference: updated.reference,
        ownerId: existing.ownerId,
      });

      return updated;
    },

    /**
     * Cross-module follow-up from Activities: when a timeline entry is created
     * against an OFI (`cips`), promote Pending → In Progress without appending
     * a duplicate embedded activity (the Activity record is the source of truth
     * for the shared Timeline UI).
     */
    async markInProgressIfPending(
      organizationId: string,
      ofiId: string
    ): Promise<void> {
      const existing = await repository.findById(organizationId, ofiId);
      if (!existing) return;
      if (existing.implemented.status !== "Pending") return;

      await repository.update(organizationId, ofiId, {
        implemented: {
          status: "In Progress",
          by: null,
          on: null,
        },
        updatedBy: "activity-follow-up",
        updatedOn: new Date(),
      });
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireOfi(actor.organizationId, id);
      // Align with UI: Implemented OFIs cannot be deleted (V4 API was looser).
      if (existing.implemented.status === "Implemented") {
        throw new ConflictError("Implemented OFIs cannot be deleted");
      }

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new NotFoundError("This OFI has been deleted or removed");
      }

      await tasks.removeTasksSourcedFromOfi({
        organizationId: actor.organizationId,
        ofiId: existing.id,
      });

      try {
        await complianceLinks.clearOfiLinks({
          organizationId: actor.organizationId,
          ofiId: existing.id,
        });
      } catch {
        // Evidence cleanup must not block OFI delete.
      }
    },

    async removeAttachment(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireOfi(actor.organizationId, id);
      assertNotImplemented(existing);

      const next = existing.attachments.filter((a) => a.id !== attachmentId);
      if (next.length === existing.attachments.length) {
        throw new NotFoundError("Attachment not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        attachments: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError("This OFI has been deleted or removed");
      }
      return updated;
    },

    async setComplianceLinks(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: SetComplianceLinksInput
    ): Promise<Ofi> {
      const actor = requireOrgIdentity(identity);
      // Spec: linking uses Read permission on the OFI route.
      await assertAllowed(actor.identity, "read", id);

      const existing = await requireOfi(actor.organizationId, id);
      assertNotImplemented(existing);

      const updated = await repository.update(actor.organizationId, id, {
        complianceLinks: input.links,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "compliance_linked",
          "Compliance controls updated",
          actor.identity.subjectId
        ),
      });
      if (!updated) {
        throw new NotFoundError("This OFI has been deleted or removed");
      }

      try {
        await complianceLinks.syncOfiLinks({
          organizationId: actor.organizationId,
          actorId: actor.identity.subjectId,
          ofiId: updated.id,
          previousLinks: existing.complianceLinks,
          nextLinks: updated.complianceLinks,
        });
      } catch {
        // Sync is best-effort; OFI links remain saved.
      }

      return updated;
    },

    async mirrorAddComplianceClause(input: {
      organizationId: string;
      ofiId: string;
      toolkitId: string;
      clause: string;
    }): Promise<void> {
      const ofi = await repository.findById(input.organizationId, input.ofiId);
      if (!ofi || ofi.deletedAt || ofi.implemented.status === "Implemented") {
        return;
      }
      const next = mergeComplianceClause(
        ofi.complianceLinks,
        input.toolkitId,
        input.clause
      );
      if (next === ofi.complianceLinks) return;
      await repository.update(input.organizationId, input.ofiId, {
        complianceLinks: next,
        updatedBy: "system-compliance-mirror",
        updatedOn: new Date(),
      });
    },

    async mirrorRemoveComplianceClause(input: {
      organizationId: string;
      ofiId: string;
      toolkitId: string;
      clause: string;
    }): Promise<void> {
      const ofi = await repository.findById(input.organizationId, input.ofiId);
      if (!ofi || ofi.deletedAt) return;
      const next = removeComplianceClause(
        ofi.complianceLinks,
        input.toolkitId,
        input.clause
      );
      await repository.update(input.organizationId, input.ofiId, {
        complianceLinks: next,
        updatedBy: "system-compliance-mirror",
        updatedOn: new Date(),
      });
    },
  };
}
