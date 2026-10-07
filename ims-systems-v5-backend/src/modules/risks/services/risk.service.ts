/**
 * Risk Management application service.
 * Spec: docs/module-specifications/risk-management.md
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
  RiskComplianceLinkPort,
  RiskListScopePort,
  RiskNotificationPort,
  RiskTaskPort,
} from "../ports";
import { NoOpRiskComplianceLinkAdapter } from "../ports";
import {
  newActivityEntry,
  newAttachmentId,
  type PersistRiskPatch,
  type RiskRepository,
} from "../repositories/risk.repository";
import { calculateScore } from "./scoring";
import {
  isAssetLinkableRiskType,
  NUDGE_COOLDOWN_MS,
  RISKS_RESOURCE,
  type AcceptRiskInput,
  type CreateRiskInput,
  type ListRisksQuery,
  type MitigateRiskInput,
  type PaginatedRisks,
  type Risk,
  type RiskAttachment,
  type RiskStats,
  type ComplianceLink,
  type SetComplianceLinksInput,
  type UpdateRiskInput,
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
  return `RK-${stamp}-${rand}`;
}

function assertNotMitigated(risk: Risk): void {
  if (risk.mitigated.status) {
    throw new ConflictError("Mitigated risks cannot be modified");
  }
}

function mapAttachments(
  input: CreateRiskInput["attachments"] | UpdateRiskInput["attachments"],
  actorId: string
): RiskAttachment[] {
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

export type RiskServiceDeps = {
  repository: RiskRepository;
  authorizer: Authorizer;
  notifications: RiskNotificationPort;
  tasks: RiskTaskPort;
  listScope: RiskListScopePort;
  complianceLinks?: RiskComplianceLinkPort;
};

export type RiskService = ReturnType<typeof createRiskService>;

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

export function createRiskService(deps: RiskServiceDeps) {
  const {
    repository,
    authorizer,
    notifications,
    tasks,
    listScope,
    complianceLinks = new NoOpRiskComplianceLinkAdapter(),
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: RISKS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access risks"
      );
    }
  }

  async function requireRisk(
    organizationId: string,
    id: string
  ): Promise<Risk> {
    const risk = await repository.findById(organizationId, id);
    if (!risk) {
      throw new NotFoundError("Risk not found");
    }
    return risk;
  }

  function validateAssetLink(type: Risk["type"], assetId?: string | null): void {
    if (assetId && !isAssetLinkableRiskType(type)) {
      throw new ValidationAppError(
        "Asset linkage is only allowed for Hardware, Software, People, and Premise risks"
      );
    }
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateRiskInput
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      validateAssetLink(input.type, input.assetId);

      const score = calculateScore(input.likelihood, input.consequence);
      const raisedOn = new Date();
      const attachments = mapAttachments(input.attachments, actor.identity.subjectId);
      const activity = [
        newActivityEntry(
          "raised",
          "Risk raised",
          actor.identity.subjectId
        ),
      ];
      if (input.ownerId) {
        activity.push(
          newActivityEntry(
            "owner_assigned",
            "Risk owner assigned",
            actor.identity.subjectId
          )
        );
      }

      const created = await repository.create(actor.organizationId, {
        ...input,
        reference: nextReference(),
        initialScore: score,
        currentScore: score,
        raisedBy: actor.identity.subjectId,
        raisedOn,
        attachments,
        activity,
      });

      if (created.ownerId) {
        await notifications.notifyOwnerAssigned({
          organizationId: actor.organizationId,
          riskId: created.id,
          ownerId: created.ownerId,
          title: created.title,
          reference: created.reference,
        });
      }

      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListRisksQuery
    ): Promise<PaginatedRisks> {
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
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);

      const risk = await repository.findById(actor.organizationId, id, {
        includeDeleted: true,
      });
      if (!risk) {
        throw new NotFoundError("Risk not found");
      }
      if (risk.deletedAt) {
        throw new NotFoundError("This risk has been deleted or removed");
      }
      return risk;
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateRiskInput
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireRisk(actor.organizationId, id);
      assertNotMitigated(existing);

      const nextType = input.type ?? existing.type;
      const nextAssetId =
        input.assetId === undefined ? existing.assetId : input.assetId;
      validateAssetLink(nextType, nextAssetId);

      if (
        (input.likelihood !== undefined || input.consequence !== undefined) &&
        (input.likelihood === undefined || input.consequence === undefined)
      ) {
        // Allow partial score updates by filling from current score.
      }

      const patch: PersistRiskPatch = {
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntries: [],
      };

      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description;
      if (input.type !== undefined) patch.type = input.type;
      if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
      if (input.assetId !== undefined) patch.assetId = input.assetId;
      if (input.ownerId !== undefined) patch.ownerId = input.ownerId;
      if (input.mitigationText !== undefined) {
        patch.mitigationText = input.mitigationText;
      }
      if (input.acceptanceRationale !== undefined) {
        patch.acceptanceRationale = input.acceptanceRationale;
      }
      if (input.decisionMaker !== undefined) {
        patch.decisionMaker = input.decisionMaker;
      }

      if (input.likelihood !== undefined || input.consequence !== undefined) {
        patch.currentScore = calculateScore(
          input.likelihood ?? existing.currentScore.likelihood,
          input.consequence ?? existing.currentScore.consequence
        );
        patch.activityEntries!.push(
          newActivityEntry(
            "score_updated",
            "Current risk score updated",
            actor.identity.subjectId
          )
        );
      }

      if (input.ownerId !== undefined && input.ownerId !== existing.ownerId) {
        patch.activityEntries!.push(
          newActivityEntry(
            "owner_transferred",
            "Risk ownership transferred",
            actor.identity.subjectId
          )
        );
      }

      if (input.attachments && input.attachments.length > 0) {
        const added = mapAttachments(
          input.attachments,
          actor.identity.subjectId
        );
        patch.attachments = [...existing.attachments, ...added];
        patch.activityEntries!.push(
          newActivityEntry(
            "attachment_added",
            "Attachment(s) added",
            actor.identity.subjectId
          )
        );
      }

      let notifyMitigated = false;
      if (input.mitigated === true && !existing.mitigated.status) {
        if (
          !(input.mitigationText ?? existing.mitigationText)?.trim()
        ) {
          throw new ValidationAppError(
            "Mitigation text is required when marking a risk as mitigated"
          );
        }
        patch.mitigated = {
          status: true,
          by: actor.identity.subjectId,
          on: new Date(),
        };
        if (input.mitigationText !== undefined) {
          patch.mitigationText = input.mitigationText;
        }
        patch.activityEntries!.push(
          newActivityEntry(
            "mitigated",
            "Risk mitigated",
            actor.identity.subjectId
          )
        );
        notifyMitigated = true;
      } else if (input.mitigated === false && existing.mitigated.status) {
        throw new ConflictError("Mitigated status cannot be cleared");
      }

      if (input.accepted === true && !existing.accepted.status) {
        if (
          !(
            input.acceptanceRationale ?? existing.acceptanceRationale
          )?.trim()
        ) {
          throw new ValidationAppError(
            "Acceptance rationale is required when accepting a risk"
          );
        }
        patch.accepted = {
          status: true,
          by: actor.identity.subjectId,
          on: new Date(),
        };
        if (input.acceptanceRationale !== undefined) {
          patch.acceptanceRationale = input.acceptanceRationale;
        }
        if (input.decisionMaker !== undefined) {
          patch.decisionMaker = input.decisionMaker;
        }
        patch.activityEntries!.push(
          newActivityEntry(
            "accepted",
            "Risk accepted",
            actor.identity.subjectId
          )
        );
      }

      patch.activityEntries!.push(
        newActivityEntry("updated", "Risk updated", actor.identity.subjectId)
      );

      const updated = await repository.update(
        actor.organizationId,
        id,
        patch
      );
      if (!updated) {
        throw new NotFoundError("Risk not found");
      }

      if (
        input.ownerId !== undefined &&
        input.ownerId &&
        input.ownerId !== existing.ownerId
      ) {
        await notifications.notifyOwnerAssigned({
          organizationId: actor.organizationId,
          riskId: updated.id,
          ownerId: input.ownerId,
          title: updated.title,
          reference: updated.reference,
        });
      }

      if (notifyMitigated) {
        await notifications.notifyMitigated({
          organizationId: actor.organizationId,
          riskId: updated.id,
          title: updated.title,
          reference: updated.reference,
          mitigatedBy: actor.identity.subjectId,
        });
      }

      return updated;
    },

    async mitigate(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: MitigateRiskInput
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireRisk(actor.organizationId, id);
      assertNotMitigated(existing);

      const updated = await repository.update(actor.organizationId, id, {
        mitigationText: input.mitigationText,
        mitigated: {
          status: true,
          by: actor.identity.subjectId,
          on: new Date(),
        },
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "mitigated",
          "Risk mitigated",
          actor.identity.subjectId
        ),
      });
      if (!updated) {
        throw new NotFoundError("Risk not found");
      }

      await notifications.notifyMitigated({
        organizationId: actor.organizationId,
        riskId: updated.id,
        title: updated.title,
        reference: updated.reference,
        mitigatedBy: actor.identity.subjectId,
      });

      return updated;
    },

    async accept(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: AcceptRiskInput
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireRisk(actor.organizationId, id);
      if (existing.accepted.status) {
        throw new ConflictError("Risk is already accepted");
      }

      const updated = await repository.update(actor.organizationId, id, {
        acceptanceRationale: input.acceptanceRationale,
        decisionMaker: input.decisionMaker ?? existing.decisionMaker ?? null,
        accepted: {
          status: true,
          by: actor.identity.subjectId,
          on: new Date(),
        },
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "accepted",
          "Risk accepted",
          actor.identity.subjectId
        ),
      });
      if (!updated) {
        throw new NotFoundError("Risk not found");
      }
      return updated;
    },

    async escalate(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      // Spec: backend escalate uses create permission (UI uses delete — documented ambiguity).
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireRisk(actor.organizationId, id);
      assertNotMitigated(existing);
      if (existing.escalated.status) {
        throw new ConflictError("Risk is already escalated");
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
          "Risk escalated",
          actor.identity.subjectId
        ),
      });
      if (!updated) {
        throw new NotFoundError("Risk not found");
      }

      await notifications.notifyEscalated({
        organizationId: actor.organizationId,
        riskId: updated.id,
        title: updated.title,
        reference: updated.reference,
        escalatedBy: actor.identity.subjectId,
      });

      return updated;
    },

    async nudge(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireRisk(actor.organizationId, id);
      assertNotMitigated(existing);

      if (!existing.ownerId) {
        throw new ValidationAppError("Risk has no owner to nudge");
      }

      if (existing.nextNudgeAt && existing.nextNudgeAt.getTime() > Date.now()) {
        throw new ConflictError("Nudge cooldown is still active");
      }

      const nextNudgeAt = new Date(Date.now() + NUDGE_COOLDOWN_MS);
      const updated = await repository.update(actor.organizationId, id, {
        nextNudgeAt,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "nudged",
          "Risk owner nudged",
          actor.identity.subjectId
        ),
      });
      if (!updated) {
        throw new NotFoundError("Risk not found");
      }

      await notifications.notifyNudge({
        organizationId: actor.organizationId,
        riskId: updated.id,
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

      const existing = await requireRisk(actor.organizationId, id);
      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new NotFoundError("Risk not found");
      }

      await tasks.removeTasksSourcedFromRisk({
        organizationId: actor.organizationId,
        riskId: existing.id,
      });

      try {
        await complianceLinks.clearRiskLinks({
          organizationId: actor.organizationId,
          riskId: existing.id,
        });
      } catch {
        // Evidence cleanup must not block risk delete.
      }
    },

    async removeAttachment(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireRisk(actor.organizationId, id);
      assertNotMitigated(existing);

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
      if (!updated) {
        throw new NotFoundError("Risk not found");
      }
      return updated;
    },

    async setComplianceLinks(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: SetComplianceLinksInput
    ): Promise<Risk> {
      const actor = requireOrgIdentity(identity);
      // Spec: backend authorises link/unlink with Risk Management read permission.
      await assertAllowed(actor.identity, "read", id);

      const existing = await requireRisk(actor.organizationId, id);
      assertNotMitigated(existing);

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
      if (!updated) {
        throw new NotFoundError("Risk not found");
      }

      try {
        await complianceLinks.syncRiskLinks({
          organizationId: actor.organizationId,
          actorId: actor.identity.subjectId,
          riskId: updated.id,
          previousLinks: existing.complianceLinks,
          nextLinks: updated.complianceLinks,
        });
      } catch {
        // Sync is best-effort; risk links remain saved.
      }

      return updated;
    },

    /**
     * Mirror Compliance evidence onto risk links without re-entering sync.
     * Used by ComplianceRiskMirrorPort adapter.
     */
    async mirrorAddComplianceClause(input: {
      organizationId: string;
      riskId: string;
      toolkitId: string;
      clause: string;
    }): Promise<void> {
      const risk = await repository.findById(input.organizationId, input.riskId);
      if (!risk || risk.deletedAt || risk.mitigated.status) return;
      const next = mergeComplianceClause(
        risk.complianceLinks,
        input.toolkitId,
        input.clause
      );
      if (next === risk.complianceLinks) return;
      await repository.update(input.organizationId, input.riskId, {
        complianceLinks: next,
        updatedBy: "system-compliance-mirror",
        updatedOn: new Date(),
      });
    },

    async mirrorRemoveComplianceClause(input: {
      organizationId: string;
      riskId: string;
      toolkitId: string;
      clause: string;
    }): Promise<void> {
      const risk = await repository.findById(input.organizationId, input.riskId);
      if (!risk || risk.deletedAt) return;
      const next = removeComplianceClause(
        risk.complianceLinks,
        input.toolkitId,
        input.clause
      );
      await repository.update(input.organizationId, input.riskId, {
        complianceLinks: next,
        updatedBy: "system-compliance-mirror",
        updatedOn: new Date(),
      });
    },

    async stats(
      identity: SecurityIdentity | null | undefined
    ): Promise<RiskStats> {
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
      const risks = await repository.listForReport(
        actor.organizationId,
        scope,
        100
      );

      const header = [
        "reference",
        "businessUnitId",
        "title",
        "description",
        "likelihood",
        "consequence",
        "score",
        "mitigation",
        "acceptance",
        "decisionMaker",
        "raisedOn",
        "updatedOn",
        "status",
      ].join(",");

      const rows = risks.map((risk) =>
        [
          risk.reference,
          risk.businessUnitId ?? "",
          risk.title,
          risk.description,
          String(risk.currentScore.likelihood),
          String(risk.currentScore.consequence),
          String(risk.currentScore.total),
          risk.mitigationText ?? "",
          risk.acceptanceRationale ?? "",
          risk.decisionMaker ?? "",
          risk.raisedOn.toISOString(),
          risk.updatedOn?.toISOString() ?? "",
          risk.displayStatus,
        ]
          .map((cell) => escapeCsv(cell))
          .join(",")
      );

      return [header, ...rows].join("\n");
    },
  };
}
