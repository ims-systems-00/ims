/**
 * Compliance application service.
 * Spec: docs/module-specifications/compliance.md
 */

import { randomUUID } from "node:crypto";
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  applyStatusUpdateForToolkit,
  calculateOverviewForToolkit,
  sectionKeyFromClause,
  type MutableStatusNode,
} from "../lib/compliance-algorithms";
import type {
  ComplianceActivityPort,
  ComplianceAutomationPort,
  ComplianceEvidenceLinkPort,
  ComplianceIamGrantPort,
  ComplianceLicencePort,
  ComplianceNotificationPort,
  ComplianceIncidentMirrorPort,
  ComplianceOfiMirrorPort,
  ComplianceRiskMirrorPort,
} from "../ports";
import {
  NoOpComplianceIncidentMirrorAdapter,
  NoOpComplianceOfiMirrorAdapter,
  NoOpComplianceRiskMirrorAdapter,
} from "../ports";
import type { ComplianceControlRepository } from "../repositories/compliance-control.repository";
import type { ComplianceOverviewRepository } from "../repositories/compliance-overview.repository";
import type { ControlEvidenceRepository } from "../repositories/control-evidence.repository";
import type { ControlStatusRepository } from "../repositories/control-status.repository";
import {
  COMPLIANCE_RESOURCE,
  COMPLIANCE_TOOLKIT_NAMES,
  type AddEmbeddedEvidenceInput,
  type ComplianceOverviewDetail,
  type CompliancePickerQuery,
  type ComplianceToolkitName,
  type ComplianceToolkitSummary,
  type ControlEvidence,
  type ControlStatus,
  type CreateControlEvidenceInput,
  type ListCatalogueControlsQuery,
  type ListControlEvidenceQuery,
  type ListControlsQuery,
  type PaginatedCatalogueControls,
  type PaginatedCompliancePicker,
  type PaginatedControlEvidence,
  type PaginatedControlStatuses,
  type ProvisionToolkitInput,
  type SectionProgress,
  type UpdateControlRaciInput,
  type UpdateControlStatusInput,
  isComplianceToolkitName,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

function buildSections(controls: ControlStatus[]): SectionProgress[] {
  const bySection = new Map<string, ControlStatus[]>();
  for (const control of controls) {
    const key = sectionKeyFromClause(control.clause);
    const bucket = bySection.get(key) ?? [];
    bucket.push(control);
    bySection.set(key, bucket);
  }

  return [...bySection.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([section, rows]) => {
      const title =
        rows.find((row) => row.clause === section)?.title ??
        rows[0]?.title ??
        section;
      const leaves = rows.filter((row) => !row.isLocked);
      const basis = leaves.length > 0 ? leaves : rows;
      const totalPercentage =
        basis.length === 0
          ? 0
          : Math.round(
              basis.reduce((sum, row) => sum + row.compliancePercentage, 0) /
                basis.length
            );
      return {
        section,
        title,
        totalPercentage,
        controlsSelected: rows.filter((r) => r.selected === "Selected").length,
        controlsImplemented: rows.filter((r) => r.state === "Implemented")
          .length,
        controlCount: rows.length,
      };
    });
}

export type ComplianceServiceDeps = {
  controls: ComplianceControlRepository;
  statuses: ControlStatusRepository;
  overviews: ComplianceOverviewRepository;
  evidence: ControlEvidenceRepository;
  authorizer: Authorizer;
  licences: ComplianceLicencePort;
  iamGrant: ComplianceIamGrantPort;
  notifications: ComplianceNotificationPort;
  activities: ComplianceActivityPort;
  automation: ComplianceAutomationPort;
  evidenceLinks: ComplianceEvidenceLinkPort;
  riskMirror?: ComplianceRiskMirrorPort;
  incidentMirror?: ComplianceIncidentMirrorPort;
  ofiMirror?: ComplianceOfiMirrorPort;
};

export type ComplianceService = ReturnType<typeof createComplianceService>;

export type RiskComplianceLinkSyncInput = {
  organizationId: string;
  actorId: string;
  riskId: string;
  previousLinks: Array<{ toolkitId: string; clauseIds: string[] }>;
  nextLinks: Array<{ toolkitId: string; clauseIds: string[] }>;
};

/**
 * Narrow public surface for Stats / Dashboard / reverse-link consumers.
 */
export type ComplianceApplicationPort = {
  frameworkPercentages(
    organizationId: string
  ): Promise<Array<{ name: string; totalPercentage: number }>>;
  getControlStatusById(
    organizationId: string,
    id: string
  ): Promise<ControlStatus | null>;
  listPicker(
    organizationId: string,
    query: CompliancePickerQuery
  ): Promise<PaginatedCompliancePicker>;
  syncRiskComplianceLinks(input: RiskComplianceLinkSyncInput): Promise<void>;
  clearRiskComplianceEvidence(input: {
    organizationId: string;
    riskId: string;
  }): Promise<void>;
  syncIncidentComplianceLinks(
    input: IncidentComplianceLinkSyncInput
  ): Promise<void>;
  clearIncidentComplianceEvidence(input: {
    organizationId: string;
    incidentId: string;
  }): Promise<void>;
  syncOfiComplianceLinks(input: OfiComplianceLinkSyncInput): Promise<void>;
  clearOfiComplianceEvidence(input: {
    organizationId: string;
    ofiId: string;
  }): Promise<void>;
};

export type IncidentComplianceLinkSyncInput = {
  organizationId: string;
  actorId: string;
  incidentId: string;
  previousLinks: Array<{ toolkitId: string; clauseIds: string[] }>;
  nextLinks: Array<{ toolkitId: string; clauseIds: string[] }>;
};

export type OfiComplianceLinkSyncInput = {
  organizationId: string;
  actorId: string;
  ofiId: string;
  previousLinks: Array<{ toolkitId: string; clauseIds: string[] }>;
  nextLinks: Array<{ toolkitId: string; clauseIds: string[] }>;
};

function linkPairs(
  links: Array<{ toolkitId: string; clauseIds: string[] }>
): Set<string> {
  const pairs = new Set<string>();
  for (const link of links) {
    if (!isComplianceToolkitName(link.toolkitId)) continue;
    for (const clause of link.clauseIds) {
      const trimmed = clause.trim();
      if (trimmed) pairs.add(`${link.toolkitId}\u0000${trimmed}`);
    }
  }
  return pairs;
}

export function createComplianceService(deps: ComplianceServiceDeps) {
  const {
    controls,
    statuses,
    overviews,
    evidence,
    authorizer,
    licences,
    iamGrant,
    notifications,
    activities,
    automation,
    evidenceLinks,
    riskMirror = new NoOpComplianceRiskMirrorAdapter(),
    incidentMirror = new NoOpComplianceIncidentMirrorAdapter(),
    ofiMirror = new NoOpComplianceOfiMirrorAdapter(),
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update" | "delete"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: COMPLIANCE_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Compliance"
      );
    }
  }

  async function assertLicensed(
    organizationId: string,
    name: ComplianceToolkitName
  ): Promise<void> {
    const ok = await licences.isToolkitLicensed(organizationId, name);
    if (!ok) {
      throw new ForbiddenError(
        `Organisation doesn't have tool license: ${name}`
      );
    }
  }

  function toMutable(nodes: ControlStatus[]): MutableStatusNode[] {
    return nodes.map((node) => ({
      id: node.id,
      clause: node.clause,
      selected: node.selected,
      state: node.state,
      compliancePercentage: node.compliancePercentage,
      numberOfCompliantChildren: node.numberOfCompliantChildren,
      isLocked: node.isLocked,
      parentClause: node.parentClause,
      childrenClauses: [...node.childrenClauses],
      updatedBy: node.updatedBy,
      updatedOn: node.updatedOn,
    }));
  }

  async function validateEvidenceLinks(
    organizationId: string,
    input: CreateControlEvidenceInput
  ): Promise<void> {
    if (input.evidenceType === "risk-management" && input.relatedRiskId) {
      if (!(await evidenceLinks.riskExists(organizationId, input.relatedRiskId))) {
        throw new ValidationAppError("Linked risk was not found");
      }
    }
    if (
      input.evidenceType === "incident-management" &&
      input.relatedIncidentId
    ) {
      if (
        !(await evidenceLinks.incidentExists(
          organizationId,
          input.relatedIncidentId
        ))
      ) {
        throw new ValidationAppError("Linked incident was not found");
      }
    }
    if (input.evidenceType === "cip" && input.relatedCipId) {
      if (!(await evidenceLinks.cipExists(organizationId, input.relatedCipId))) {
        throw new ValidationAppError("Linked CIP was not found");
      }
    }
    if (
      input.evidenceType === "document-management" &&
      input.relatedDocumentId
    ) {
      if (
        !(await evidenceLinks.documentExists(
          organizationId,
          input.relatedDocumentId
        ))
      ) {
        throw new ValidationAppError(
          "Linked document was not found (Document Management may be unavailable)"
        );
      }
    }
  }

  async function ensureToolkitProvisioned(
    organizationId: string,
    name: ComplianceToolkitName,
    actorId: string
  ): Promise<void> {
    await assertLicensed(organizationId, name);
    const existing = await statuses.countActiveForToolkit(organizationId, name);
    if (existing > 0) return;

    const templates = await controls.listByToolkit(name);
    if (templates.length === 0) {
      throw new ValidationAppError(`No controls found for ${name}`);
    }

    await statuses.createMany(
      organizationId,
      templates.map((template) => ({
        name: template.name,
        controlId: template.id,
        clause: template.clause,
        title: template.title,
        description: template.description,
        annex: template.annex,
        note: template.note,
        isLocked: template.isLocked,
        parentClause: template.parentClause,
        childrenClauses: template.childrenClauses,
        moreInfo: template.moreInfo,
      }))
    );
    await overviews.create(organizationId, name);

    try {
      await iamGrant.grantToolkitAccess({
        organizationId,
        toolkitName: name,
        actorId,
      });
    } catch {
      // Spec: IAM grant errors are swallowed after successful provision.
    }

    try {
      await automation.onToolkitProvisioned({
        organizationId,
        toolkitName: name,
        actorId,
      });
    } catch {
      // Automation must not fail provisioning.
    }
  }

  return {
    async listToolkits(
      identity: SecurityIdentity | null | undefined
    ): Promise<ComplianceToolkitSummary[]> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");

      const [licensed, provisioned] = await Promise.all([
        licences.listLicensedToolkits(organizationId),
        overviews.listForOrganization(organizationId),
      ]);
      const licensedSet = new Set(licensed);
      const byName = new Map(provisioned.map((row) => [row.name, row]));

      return COMPLIANCE_TOOLKIT_NAMES.filter((name) => licensedSet.has(name)).map(
        (name) => {
          const overview = byName.get(name);
          return {
            name,
            licensed: true,
            provisioned: Boolean(overview),
            totalPercentage: overview?.totalPercentage ?? null,
            controlsSelected: overview?.controlsSelected ?? null,
            controlsImplemented: overview?.controlsImplemented ?? null,
          };
        }
      );
    },

    async provisionToolkit(
      identity: SecurityIdentity | null | undefined,
      input: ProvisionToolkitInput
    ): Promise<{ name: ComplianceToolkitName; controlCount: number }> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      await assertLicensed(organizationId, input.name);

      const existing = await statuses.countActiveForToolkit(
        organizationId,
        input.name
      );
      if (existing > 0) {
        throw new ConflictError("Organisation already has this toolkit.");
      }

      await ensureToolkitProvisioned(organizationId, input.name, subjectId);
      const controlCount = await statuses.countActiveForToolkit(
        organizationId,
        input.name
      );
      return { name: input.name, controlCount };
    },

    async deleteToolkit(
      identity: SecurityIdentity | null | undefined,
      name: ComplianceToolkitName
    ): Promise<{ name: ComplianceToolkitName; deletedControls: number }> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      await assertLicensed(organizationId, name);

      const rows = await statuses.listAllForToolkit(organizationId, name);
      if (rows.length === 0) {
        throw new NotFoundError("This iso tool has been deleted or removed");
      }

      await evidence.softDeleteForToolkitControls(
        organizationId,
        rows.map((row) => row.id)
      );
      const deletedControls = await statuses.softDeleteToolkit(
        organizationId,
        name
      );
      await overviews.softDelete(organizationId, name);
      return { name, deletedControls };
    },

    async getOverview(
      identity: SecurityIdentity | null | undefined,
      name: ComplianceToolkitName
    ): Promise<ComplianceOverviewDetail> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await assertLicensed(organizationId, name);

      const overview = await overviews.findByName(organizationId, name);
      if (!overview) {
        throw new NotFoundError("This iso tool has been deleted or removed");
      }
      const controlRows = await statuses.listAllForToolkit(
        organizationId,
        name
      );
      return {
        ...overview,
        sections: buildSections(controlRows),
      };
    },

    async listControls(
      identity: SecurityIdentity | null | undefined,
      name: ComplianceToolkitName,
      query: ListControlsQuery
    ): Promise<PaginatedControlStatuses> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await assertLicensed(organizationId, name);

      const overview = await overviews.findByName(organizationId, name);
      if (!overview) {
        throw new NotFoundError("This iso tool has been deleted or removed");
      }
      return statuses.list(organizationId, name, query);
    },

    async getControl(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<ControlStatus> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");

      const control = await statuses.findById(organizationId, id);
      if (!control) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      await assertLicensed(organizationId, control.name);
      return control;
    },

    async updateControlStatus(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateControlStatusInput
    ): Promise<ControlStatus> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");

      const current = await statuses.findById(organizationId, id);
      if (!current) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      await assertLicensed(organizationId, current.name);

      if (current.isLocked) {
        throw new ValidationAppError(
          "This control is not allowed to update manually."
        );
      }

      if (
        input.selected === "Not selected" &&
        input.state !== "Not implemented"
      ) {
        throw new ValidationAppError(
          "No control selected. Select a control before implementing."
        );
      }

      if (
        current.selected === input.selected &&
        current.state === input.state
      ) {
        return current;
      }

      const all = await statuses.listAllForToolkit(
        organizationId,
        current.name
      );
      const mutable = toMutable(all);
      applyStatusUpdateForToolkit(
        current.name,
        current.clause,
        input.selected,
        input.state,
        mutable,
        subjectId
      );

      const dirty = mutable.filter((node) => node.dirty);
      await statuses.patchMany(
        organizationId,
        dirty.map((node) => ({
          id: node.id,
          patch: {
            selected: node.selected,
            state: node.state,
            compliancePercentage: node.compliancePercentage,
            numberOfCompliantChildren: node.numberOfCompliantChildren,
            updatedBy: node.updatedBy,
            updatedOn: node.updatedOn,
          },
        }))
      );

      const totals = calculateOverviewForToolkit(current.name, mutable);
      await overviews.updateTotals(organizationId, current.name, totals);

      const updated = await statuses.findById(organizationId, id);
      if (!updated) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }

      if (input.state === "Implemented") {
        const message = `This control has been selected and implemented by ${
          actor.email ?? subjectId
        }.`;
        try {
          await activities.recordControlImplemented({
            organizationId,
            actorId: subjectId,
            actorName: actor.email,
            controlStatusId: updated.id,
            message,
          });
        } catch {
          // Timeline must not fail the status update.
        }
        try {
          await notifications.notifyControlImplemented({
            organizationId,
            actorId: subjectId,
            actorName: actor.email,
            controlStatusId: updated.id,
            toolkitName: updated.name,
            clause: updated.clause,
            title: updated.title,
          });
        } catch {
          // Notifications must not fail the status update.
        }
      }

      return updated;
    },

    async updateControlRaci(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateControlRaciInput
    ): Promise<ControlStatus> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");

      const current = await statuses.findById(organizationId, id);
      if (!current) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      await assertLicensed(organizationId, current.name);

      const updated = await statuses.updateRaci(
        organizationId,
        id,
        input,
        subjectId
      );
      if (!updated) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      return updated;
    },

    async listControlEvidence(
      identity: SecurityIdentity | null | undefined,
      controlStatusId: string,
      query: ListControlEvidenceQuery
    ): Promise<PaginatedControlEvidence> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");

      const control = await statuses.findById(organizationId, controlStatusId);
      if (!control) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      await assertLicensed(organizationId, control.name);
      return evidence.list(organizationId, controlStatusId, query);
    },

    async addControlEvidence(
      identity: SecurityIdentity | null | undefined,
      controlStatusId: string,
      input: CreateControlEvidenceInput
    ): Promise<ControlEvidence> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const control = await statuses.findById(organizationId, controlStatusId);
      if (!control) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      await assertLicensed(organizationId, control.name);
      await validateEvidenceLinks(organizationId, input);

      const duplicate = await evidence.findDuplicate(
        organizationId,
        controlStatusId,
        input
      );
      if (duplicate) {
        throw new ConflictError(
          "This module record is already linked as evidence for this control"
        );
      }

      const fileStorage =
        input.evidenceType === "raw-file" && input.fileStorage
          ? {
              id: input.fileStorage.id?.trim() || randomUUID(),
              fileName: input.fileStorage.fileName,
              mimeType: input.fileStorage.mimeType,
              sizeBytes: input.fileStorage.sizeBytes,
              storageKey: input.fileStorage.storageKey,
              url: input.fileStorage.url,
              uploadedBy: subjectId,
              uploadedAt: new Date(),
            }
          : null;

      const created = await evidence.create(organizationId, controlStatusId, {
        evidenceType: input.evidenceType,
        relatedRiskId: input.relatedRiskId ?? null,
        relatedIncidentId: input.relatedIncidentId ?? null,
        relatedCipId: input.relatedCipId ?? null,
        relatedDocumentId: input.relatedDocumentId ?? null,
        textContent: input.textContent?.trim() ?? null,
        fileStorage,
        groupId: input.groupId ?? null,
        updatedBy: subjectId,
      });

      if (
        created.evidenceType === "risk-management" &&
        created.relatedRiskId
      ) {
        try {
          await riskMirror.addClause({
            organizationId,
            riskId: created.relatedRiskId,
            toolkitId: control.name,
            clause: control.clause,
          });
        } catch {
          // Mirror must not fail evidence create.
        }
      }

      if (
        created.evidenceType === "incident-management" &&
        created.relatedIncidentId
      ) {
        try {
          await incidentMirror.addClause({
            organizationId,
            incidentId: created.relatedIncidentId,
            toolkitId: control.name,
            clause: control.clause,
          });
        } catch {
          // Mirror must not fail evidence create.
        }
      }

      if (created.evidenceType === "cip" && created.relatedCipId) {
        try {
          await ofiMirror.addClause({
            organizationId,
            ofiId: created.relatedCipId,
            toolkitId: control.name,
            clause: control.clause,
          });
        } catch {
          // Mirror must not fail evidence create.
        }
      }

      return created;
    },

    async removeControlEvidence(
      identity: SecurityIdentity | null | undefined,
      controlStatusId: string,
      evidenceId: string
    ): Promise<ControlEvidence> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");

      const control = await statuses.findById(organizationId, controlStatusId);
      if (!control) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      await assertLicensed(organizationId, control.name);

      const removed = await evidence.softDelete(
        organizationId,
        controlStatusId,
        evidenceId
      );
      if (!removed) {
        throw new NotFoundError("Control evidence not found");
      }

      if (
        removed.evidenceType === "risk-management" &&
        removed.relatedRiskId
      ) {
        try {
          await riskMirror.removeClause({
            organizationId,
            riskId: removed.relatedRiskId,
            toolkitId: control.name,
            clause: control.clause,
          });
        } catch {
          // Mirror must not fail evidence remove.
        }
      }

      if (
        removed.evidenceType === "incident-management" &&
        removed.relatedIncidentId
      ) {
        try {
          await incidentMirror.removeClause({
            organizationId,
            incidentId: removed.relatedIncidentId,
            toolkitId: control.name,
            clause: control.clause,
          });
        } catch {
          // Mirror must not fail evidence remove.
        }
      }

      if (removed.evidenceType === "cip" && removed.relatedCipId) {
        try {
          await ofiMirror.removeClause({
            organizationId,
            ofiId: removed.relatedCipId,
            toolkitId: control.name,
            clause: control.clause,
          });
        } catch {
          // Mirror must not fail evidence remove.
        }
      }
      return removed;
    },

    async addEmbeddedEvidence(
      identity: SecurityIdentity | null | undefined,
      controlStatusId: string,
      input: AddEmbeddedEvidenceInput
    ): Promise<ControlStatus> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const control = await statuses.findById(organizationId, controlStatusId);
      if (!control) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      await assertLicensed(organizationId, control.name);

      const updated = await statuses.addEmbeddedEvidence(
        organizationId,
        controlStatusId,
        {
          id: randomUUID(),
          fileName: input.fileName.trim(),
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storageKey: input.storageKey,
          url: input.url,
          uploadedBy: subjectId,
          uploadedAt: new Date(),
        }
      );
      if (!updated) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      return updated;
    },

    async removeEmbeddedEvidence(
      identity: SecurityIdentity | null | undefined,
      controlStatusId: string,
      attachmentId: string
    ): Promise<ControlStatus> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");

      const control = await statuses.findById(organizationId, controlStatusId);
      if (!control) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      await assertLicensed(organizationId, control.name);

      const existing = control.evidences.find((row) => row.id === attachmentId);
      if (!existing) {
        throw new NotFoundError("Attachment not found");
      }

      const updated = await statuses.removeEmbeddedEvidence(
        organizationId,
        controlStatusId,
        attachmentId,
        subjectId
      );
      if (!updated) {
        throw new NotFoundError("This Tool has been deleted or removed");
      }
      return updated;
    },

    /**
     * Global catalogue clauses for cross-module linking.
     * Does not require the toolkit to be provisioned for the organisation.
     */
    async listCatalogueControls(
      identity: SecurityIdentity | null | undefined,
      name: ComplianceToolkitName,
      query: ListCatalogueControlsQuery
    ): Promise<PaginatedCatalogueControls> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      await assertLicensed(organizationId, name);

      const page = await controls.listCatalogue(name, query);
      if (page.total === 0 && !query.search) {
        throw new NotFoundError(`No catalogue controls found for ${name}`);
      }
      return page;
    },

    async picker(
      identity: SecurityIdentity | null | undefined,
      query: CompliancePickerQuery
    ): Promise<PaginatedCompliancePicker> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      if (query.name) {
        await assertLicensed(organizationId, query.name);
      }
      return statuses.picker(organizationId, query);
    },

    /** Cross-module helpers (no HTTP auth — caller must be trusted). */
    async frameworkPercentagesForOrganization(
      organizationId: string
    ): Promise<Array<{ name: string; totalPercentage: number }>> {
      const rows = await overviews.listForOrganization(organizationId);
      return rows.map((row) => ({
        name: row.name,
        totalPercentage: row.totalPercentage,
      }));
    },

    async getControlStatusForOrganization(
      organizationId: string,
      id: string
    ): Promise<ControlStatus | null> {
      return statuses.findById(organizationId, id);
    },

    async pickerForOrganization(
      organizationId: string,
      query: CompliancePickerQuery
    ): Promise<PaginatedCompliancePicker> {
      return statuses.picker(organizationId, query);
    },

    /**
     * Sync Risk.complianceLinks into control-evidence (risk-management).
     * Auto-provisions toolkits when needed. Best-effort per clause.
     */
    async syncRiskComplianceLinks(
      input: RiskComplianceLinkSyncInput
    ): Promise<void> {
      const desired = linkPairs(input.nextLinks);
      const previous = linkPairs(input.previousLinks);

      const toolkits = new Set<ComplianceToolkitName>();
      for (const key of desired) {
        const toolkitId = key.split("\u0000")[0]!;
        if (isComplianceToolkitName(toolkitId)) toolkits.add(toolkitId);
      }
      for (const key of previous) {
        const toolkitId = key.split("\u0000")[0]!;
        if (isComplianceToolkitName(toolkitId)) toolkits.add(toolkitId);
      }

      for (const toolkit of toolkits) {
        try {
          await ensureToolkitProvisioned(
            input.organizationId,
            toolkit,
            input.actorId
          );
        } catch {
          // Skip toolkit if catalogue missing / unlicensed.
        }
      }

      for (const key of desired) {
        if (previous.has(key)) continue;
        const [toolkitId, clause] = key.split("\u0000");
        if (!toolkitId || !clause || !isComplianceToolkitName(toolkitId)) {
          continue;
        }
        const control = await statuses.findByToolkitAndClause(
          input.organizationId,
          toolkitId,
          clause
        );
        if (!control) continue;

        const duplicate = await evidence.findDuplicate(
          input.organizationId,
          control.id,
          {
            evidenceType: "risk-management",
            relatedRiskId: input.riskId,
          }
        );
        if (duplicate) continue;

        await evidence.create(input.organizationId, control.id, {
          evidenceType: "risk-management",
          relatedRiskId: input.riskId,
          relatedIncidentId: null,
          relatedCipId: null,
          relatedDocumentId: null,
          textContent: null,
          fileStorage: null,
          groupId: null,
          updatedBy: input.actorId,
        });
      }

      for (const key of previous) {
        if (desired.has(key)) continue;
        const [toolkitId, clause] = key.split("\u0000");
        if (!toolkitId || !clause || !isComplianceToolkitName(toolkitId)) {
          continue;
        }
        const control = await statuses.findByToolkitAndClause(
          input.organizationId,
          toolkitId,
          clause
        );
        if (!control) continue;
        await evidence.softDeleteForRelatedRiskAndControl(
          input.organizationId,
          control.id,
          input.riskId
        );
      }
    },

    async clearRiskComplianceEvidence(input: {
      organizationId: string;
      riskId: string;
    }): Promise<void> {
      await evidence.softDeleteForRelatedRisk(
        input.organizationId,
        input.riskId
      );
    },

    async syncIncidentComplianceLinks(
      input: IncidentComplianceLinkSyncInput
    ): Promise<void> {
      const desired = linkPairs(input.nextLinks);
      const previous = linkPairs(input.previousLinks);

      const toolkits = new Set<ComplianceToolkitName>();
      for (const key of [...desired, ...previous]) {
        const toolkitId = key.split("\u0000")[0]!;
        if (isComplianceToolkitName(toolkitId)) toolkits.add(toolkitId);
      }

      for (const toolkit of toolkits) {
        try {
          await ensureToolkitProvisioned(
            input.organizationId,
            toolkit,
            input.actorId
          );
        } catch {
          // Skip toolkit if catalogue missing / unlicensed.
        }
      }

      for (const key of desired) {
        if (previous.has(key)) continue;
        const [toolkitId, clause] = key.split("\u0000");
        if (!toolkitId || !clause || !isComplianceToolkitName(toolkitId)) {
          continue;
        }
        const control = await statuses.findByToolkitAndClause(
          input.organizationId,
          toolkitId,
          clause
        );
        if (!control) continue;

        const duplicate = await evidence.findDuplicate(
          input.organizationId,
          control.id,
          {
            evidenceType: "incident-management",
            relatedIncidentId: input.incidentId,
          }
        );
        if (duplicate) continue;

        await evidence.create(input.organizationId, control.id, {
          evidenceType: "incident-management",
          relatedRiskId: null,
          relatedIncidentId: input.incidentId,
          relatedCipId: null,
          relatedDocumentId: null,
          textContent: null,
          fileStorage: null,
          groupId: null,
          updatedBy: input.actorId,
        });
      }

      for (const key of previous) {
        if (desired.has(key)) continue;
        const [toolkitId, clause] = key.split("\u0000");
        if (!toolkitId || !clause || !isComplianceToolkitName(toolkitId)) {
          continue;
        }
        const control = await statuses.findByToolkitAndClause(
          input.organizationId,
          toolkitId,
          clause
        );
        if (!control) continue;
        await evidence.softDeleteForRelatedIncidentAndControl(
          input.organizationId,
          control.id,
          input.incidentId
        );
      }
    },

    async clearIncidentComplianceEvidence(input: {
      organizationId: string;
      incidentId: string;
    }): Promise<void> {
      await evidence.softDeleteForRelatedIncident(
        input.organizationId,
        input.incidentId
      );
    },

    async syncOfiComplianceLinks(
      input: OfiComplianceLinkSyncInput
    ): Promise<void> {
      const desired = linkPairs(input.nextLinks);
      const previous = linkPairs(input.previousLinks);

      const toolkits = new Set<ComplianceToolkitName>();
      for (const key of [...desired, ...previous]) {
        const toolkitId = key.split("\u0000")[0]!;
        if (isComplianceToolkitName(toolkitId)) toolkits.add(toolkitId);
      }

      for (const toolkit of toolkits) {
        try {
          await ensureToolkitProvisioned(
            input.organizationId,
            toolkit,
            input.actorId
          );
        } catch {
          // Skip toolkit if catalogue missing / unlicensed.
        }
      }

      for (const key of desired) {
        if (previous.has(key)) continue;
        const [toolkitId, clause] = key.split("\u0000");
        if (!toolkitId || !clause || !isComplianceToolkitName(toolkitId)) {
          continue;
        }
        const control = await statuses.findByToolkitAndClause(
          input.organizationId,
          toolkitId,
          clause
        );
        if (!control) continue;

        const duplicate = await evidence.findDuplicate(
          input.organizationId,
          control.id,
          {
            evidenceType: "cip",
            relatedCipId: input.ofiId,
          }
        );
        if (duplicate) continue;

        await evidence.create(input.organizationId, control.id, {
          evidenceType: "cip",
          relatedRiskId: null,
          relatedIncidentId: null,
          relatedCipId: input.ofiId,
          relatedDocumentId: null,
          textContent: null,
          fileStorage: null,
          groupId: null,
          updatedBy: input.actorId,
        });
      }

      for (const key of previous) {
        if (desired.has(key)) continue;
        const [toolkitId, clause] = key.split("\u0000");
        if (!toolkitId || !clause || !isComplianceToolkitName(toolkitId)) {
          continue;
        }
        const control = await statuses.findByToolkitAndClause(
          input.organizationId,
          toolkitId,
          clause
        );
        if (!control) continue;
        await evidence.softDeleteForRelatedCipAndControl(
          input.organizationId,
          control.id,
          input.ofiId
        );
      }
    },

    async clearOfiComplianceEvidence(input: {
      organizationId: string;
      ofiId: string;
    }): Promise<void> {
      await evidence.softDeleteForRelatedCip(
        input.organizationId,
        input.ofiId
      );
    },

    parseToolkitName(value: string): ComplianceToolkitName {
      if (!isComplianceToolkitName(value)) {
        throw new ValidationAppError(`Unsupported compliance toolkit: ${value}`);
      }
      return value;
    },
  };
}
