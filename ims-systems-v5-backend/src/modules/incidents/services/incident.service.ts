/**
 * Incident Management application service.
 * Spec: docs/module-specifications/incident.md
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
  IncidentCalendarPort,
  IncidentComplianceLinkPort,
  IncidentListScopePort,
  IncidentNotificationPort,
  IncidentTaskPort,
} from "../ports";
import { NoOpIncidentComplianceLinkAdapter } from "../ports";
import {
  newActivityEntry,
  newAttachmentId,
  type PersistIncidentPatch,
  type IncidentRepository,
} from "../repositories/incident.repository";
import {
  INCIDENTS_RESOURCE,
  NUDGE_COOLDOWN_MS,
  type ComplianceLink,
  type CreateIncidentInput,
  type Incident,
  type IncidentAttachment,
  type IncidentStats,
  type ListIncidentsQuery,
  type PaginatedIncidents,
  type ResolveIncidentInput,
  type SetComplianceLinksInput,
  type UpdateIncidentInput,
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
  return `INC-${stamp}-${rand}`;
}

function assertNotResolved(incident: Incident): void {
  if (incident.resolved.status) {
    throw new ConflictError("Resolved incidents cannot be modified");
  }
}

function isAuditSourced(incident: Incident): boolean {
  return incident.source?.moduleType?.toLowerCase().includes("audit") === true;
}

function mapAttachments(
  input: CreateIncidentInput["attachments"] | UpdateIncidentInput["attachments"],
  actorId: string
): IncidentAttachment[] {
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

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString();
}

export type IncidentServiceDeps = {
  repository: IncidentRepository;
  authorizer: Authorizer;
  notifications: IncidentNotificationPort;
  calendar: IncidentCalendarPort;
  tasks: IncidentTaskPort;
  listScope: IncidentListScopePort;
  complianceLinks?: IncidentComplianceLinkPort;
};

export type IncidentService = ReturnType<typeof createIncidentService>;

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

export function createIncidentService(deps: IncidentServiceDeps) {
  const {
    repository,
    authorizer,
    notifications,
    calendar,
    tasks,
    listScope,
    complianceLinks = new NoOpIncidentComplianceLinkAdapter(),
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: INCIDENTS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access incidents"
      );
    }
  }

  async function requireIncident(
    organizationId: string,
    id: string
  ): Promise<Incident> {
    const incident = await repository.findById(organizationId, id);
    if (!incident) {
      throw new NotFoundError("This incident has been deleted or removed");
    }
    return incident;
  }

  async function applyResolve(
    organizationId: string,
    incident: Incident,
    actorId: string,
    resolution: string
  ): Promise<Incident> {
    if (incident.resolved.status) {
      throw new ConflictError("Incident is already resolved");
    }
    if (!resolution.trim()) {
      throw new ValidationAppError("Resolution text is required");
    }
    const resolvedOn = new Date();
    const resolutionTimeMs = Math.max(
      0,
      resolvedOn.getTime() - incident.raisedOn.getTime()
    );

    const updated = await repository.update(organizationId, incident.id, {
      resolution: resolution.trim(),
      resolved: { status: true, by: actorId, on: resolvedOn },
      resolutionTimeMs,
      updatedBy: actorId,
      updatedOn: resolvedOn,
      activityEntry: newActivityEntry("resolved", "Incident resolved", actorId),
    });
    if (!updated) throw new NotFoundError("Incident not found");

    await notifications.notifyResolved({
      organizationId,
      incidentId: updated.id,
      title: updated.title,
      reference: updated.reference,
      resolvedBy: actorId,
    });

    return updated;
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateIncidentInput
    ): Promise<Incident> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      if (!input.title?.trim()) {
        throw new ValidationAppError("Title is required");
      }
      if (!input.description?.trim()) {
        throw new ValidationAppError("Description is required");
      }

      const priority = input.priority ?? "P3";
      const privacy = input.privacy ?? "Business unit";
      const raisedOn = new Date();
      const attachments = mapAttachments(
        input.attachments,
        actor.identity.subjectId
      );
      const activity = [
        newActivityEntry("raised", "Incident raised", actor.identity.subjectId),
      ];
      if (input.ownerId) {
        activity.push(
          newActivityEntry(
            "owner_assigned",
            "Incident owner assigned",
            actor.identity.subjectId
          )
        );
      }

      const created = await repository.create(actor.organizationId, {
        ...input,
        title: input.title.trim(),
        description: input.description.trim(),
        reference: nextReference(),
        priority,
        privacy,
        raisedBy: actor.identity.subjectId,
        raisedOn,
        attachments,
        activity,
      });

      if (created.ownerId) {
        await notifications.notifyOwnerAssigned({
          organizationId: actor.organizationId,
          incidentId: created.id,
          ownerId: created.ownerId,
          title: created.title,
          reference: created.reference,
        });
      }

      if (created.priority === "P1") {
        await calendar.upsertPriorityEvent({
          organizationId: actor.organizationId,
          incidentId: created.id,
          reference: created.reference,
          title: created.title,
          businessUnitId: created.businessUnitId,
        });
      }

      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListIncidentsQuery
    ): Promise<PaginatedIncidents> {
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
    ): Promise<Incident> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireIncident(actor.organizationId, id);
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateIncidentInput
    ): Promise<Incident> {
      const actor = requireOrgIdentity(identity);
      // Spec: update uses create permission on backend.
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireIncident(actor.organizationId, id);
      assertNotResolved(existing);

      if (input.title !== undefined && isAuditSourced(existing)) {
        throw new ConflictError(
          "Title cannot be changed for audit-sourced incidents"
        );
      }

      if (input.resolved === true) {
        const resolution = input.resolution ?? existing.resolution ?? "";
        return applyResolve(
          actor.organizationId,
          existing,
          actor.identity.subjectId,
          resolution
        );
      }

      const activityEntries = [
        newActivityEntry(
          "updated",
          "Incident updated",
          actor.identity.subjectId
        ),
      ];

      const patch: PersistIncidentPatch = {
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntries,
      };

      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.privacy !== undefined) patch.privacy = input.privacy;
      if (input.methodOfNotification !== undefined) {
        patch.methodOfNotification = input.methodOfNotification;
      }
      if (input.affectedService !== undefined) {
        patch.affectedService = input.affectedService;
      }
      if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
      if (input.resolution !== undefined) patch.resolution = input.resolution;

      if (input.ownerId !== undefined) {
        patch.ownerId = input.ownerId;
        if (input.ownerId && input.ownerId !== existing.ownerId) {
          activityEntries.push(
            newActivityEntry(
              "owner_transferred",
              "Incident ownership transferred",
              actor.identity.subjectId
            )
          );
        }
      }

      if (input.attachments && input.attachments.length > 0) {
        const added = mapAttachments(
          input.attachments,
          actor.identity.subjectId
        );
        patch.attachments = [...existing.attachments, ...added];
        activityEntries.push(
          newActivityEntry(
            "attachment_added",
            "Attachment(s) added",
            actor.identity.subjectId
          )
        );
      }

      const updated = await repository.update(
        actor.organizationId,
        id,
        patch
      );
      if (!updated) throw new NotFoundError("Incident not found");

      if (
        input.ownerId &&
        input.ownerId !== existing.ownerId &&
        input.ownerId.length > 0
      ) {
        await notifications.notifyOwnerAssigned({
          organizationId: actor.organizationId,
          incidentId: updated.id,
          ownerId: input.ownerId,
          title: updated.title,
          reference: updated.reference,
        });
      }

      const nextPriority = updated.priority;
      if (nextPriority === "P1") {
        await calendar.upsertPriorityEvent({
          organizationId: actor.organizationId,
          incidentId: updated.id,
          reference: updated.reference,
          title: updated.title,
          businessUnitId: updated.businessUnitId,
        });
      } else if (existing.priority === "P1") {
        await calendar.removePriorityEvent({
          organizationId: actor.organizationId,
          incidentId: updated.id,
        });
      }

      return updated;
    },

    async resolve(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: ResolveIncidentInput
    ): Promise<Incident> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireIncident(actor.organizationId, id);
      return applyResolve(
        actor.organizationId,
        existing,
        actor.identity.subjectId,
        input.resolution
      );
    },

    async escalate(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Incident> {
      const actor = requireOrgIdentity(identity);
      // Spec: backend escalate uses create permission (UI gates inconsistent).
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireIncident(actor.organizationId, id);
      assertNotResolved(existing);
      if (existing.escalated.status) {
        throw new ConflictError("Incident is already escalated");
      }

      const updated = await repository.update(actor.organizationId, id, {
        escalated: {
          status: true,
          by: actor.identity.subjectId,
          on: new Date(),
        },
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "escalated",
          "Incident escalated",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Incident not found");

      await notifications.notifyEscalated({
        organizationId: actor.organizationId,
        incidentId: updated.id,
        title: updated.title,
        reference: updated.reference,
        escalatedBy: actor.identity.subjectId,
      });

      return updated;
    },

    async nudge(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Incident> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireIncident(actor.organizationId, id);
      assertNotResolved(existing);

      if (!existing.ownerId) {
        throw new ValidationAppError("Incident has no owner to nudge");
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
          "Incident owner nudged",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Incident not found");

      await notifications.notifyNudge({
        organizationId: actor.organizationId,
        incidentId: updated.id,
        ownerId: existing.ownerId,
        title: updated.title,
        reference: updated.reference,
      });

      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireIncident(actor.organizationId, id);
      // Align with UI: block delete when resolved (V4 API was looser).
      if (existing.resolved.status) {
        throw new ConflictError("Resolved incidents cannot be deleted");
      }

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) throw new NotFoundError("Incident not found");

      await tasks.removeTasksSourcedFromIncident({
        organizationId: actor.organizationId,
        incidentId: existing.id,
      });

      try {
        await complianceLinks.clearIncidentLinks({
          organizationId: actor.organizationId,
          incidentId: existing.id,
        });
      } catch {
        // Evidence cleanup must not block incident delete.
      }

      if (existing.priority === "P1") {
        await calendar.removePriorityEvent({
          organizationId: actor.organizationId,
          incidentId: existing.id,
        });
      }
    },

    async removeAttachment(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<Incident> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireIncident(actor.organizationId, id);
      assertNotResolved(existing);

      const next = existing.attachments.filter((a) => a.id !== attachmentId);
      if (next.length === existing.attachments.length) {
        throw new NotFoundError("Attachment not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        attachments: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "attachment_removed",
          "Attachment removed",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Incident not found");
      return updated;
    },

    async setComplianceLinks(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: SetComplianceLinksInput
    ): Promise<Incident> {
      const actor = requireOrgIdentity(identity);
      // Spec: backend authorises with Incident Management read permission.
      await assertAllowed(actor.identity, "read", id);

      const existing = await requireIncident(actor.organizationId, id);
      assertNotResolved(existing);

      const updated = await repository.update(actor.organizationId, id, {
        complianceLinks: input.links,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "compliance_links_updated",
          "Compliance links updated",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Incident not found");

      try {
        await complianceLinks.syncIncidentLinks({
          organizationId: actor.organizationId,
          actorId: actor.identity.subjectId,
          incidentId: updated.id,
          previousLinks: existing.complianceLinks,
          nextLinks: updated.complianceLinks,
        });
      } catch {
        // Sync is best-effort; incident links remain saved.
      }

      return updated;
    },

    async mirrorAddComplianceClause(input: {
      organizationId: string;
      incidentId: string;
      toolkitId: string;
      clause: string;
    }): Promise<void> {
      const incident = await repository.findById(
        input.organizationId,
        input.incidentId
      );
      if (!incident || incident.deletedAt || incident.resolved.status) return;
      const next = mergeComplianceClause(
        incident.complianceLinks,
        input.toolkitId,
        input.clause
      );
      if (next === incident.complianceLinks) return;
      await repository.update(input.organizationId, input.incidentId, {
        complianceLinks: next,
        updatedBy: "system-compliance-mirror",
        updatedOn: new Date(),
      });
    },

    async mirrorRemoveComplianceClause(input: {
      organizationId: string;
      incidentId: string;
      toolkitId: string;
      clause: string;
    }): Promise<void> {
      const incident = await repository.findById(
        input.organizationId,
        input.incidentId
      );
      if (!incident || incident.deletedAt) return;
      const next = removeComplianceClause(
        incident.complianceLinks,
        input.toolkitId,
        input.clause
      );
      await repository.update(input.organizationId, input.incidentId, {
        complianceLinks: next,
        updatedBy: "system-compliance-mirror",
        updatedOn: new Date(),
      });
    },

    async stats(
      identity: SecurityIdentity | null | undefined
    ): Promise<IncidentStats> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });
      return repository.stats(actor.organizationId, scope);
    },

    async reportCsv(
      identity: SecurityIdentity | null | undefined
    ): Promise<string> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });
      const items = await repository.listForReport(
        actor.organizationId,
        scope,
        100
      );

      const header = [
        "reference",
        "businessUnitId",
        "title",
        "description",
        "methodOfNotification",
        "affectedService",
        "priority",
        "ownerId",
        "privacy",
        "resolution",
        "status",
        "raisedOn",
        "raisedBy",
        "resolvedOn",
        "resolvedBy",
        "escalatedOn",
        "escalatedBy",
      ].join(",");

      const rows = items.map((item) =>
        [
          escapeCsv(item.reference),
          escapeCsv(item.businessUnitId ?? ""),
          escapeCsv(item.title),
          escapeCsv(item.description),
          escapeCsv(item.methodOfNotification ?? ""),
          escapeCsv(item.affectedService ?? ""),
          escapeCsv(item.priority),
          escapeCsv(item.ownerId ?? ""),
          escapeCsv(item.privacy),
          escapeCsv(item.resolution ?? ""),
          escapeCsv(item.displayStatus),
          escapeCsv(formatDate(item.raisedOn)),
          escapeCsv(item.raisedBy),
          escapeCsv(formatDate(item.resolved.on)),
          escapeCsv(item.resolved.by ?? ""),
          escapeCsv(formatDate(item.escalated.on)),
          escapeCsv(item.escalated.by ?? ""),
        ].join(",")
      );

      return [header, ...rows].join("\n");
    },
  };
}
