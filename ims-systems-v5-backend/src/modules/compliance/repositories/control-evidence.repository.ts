/**
 * Control Evidence repository (organisation-scoped).
 */

import type {
  ComplianceAttachment,
  ControlEvidence,
  ControlEvidenceType,
  CreateControlEvidenceInput,
  ListControlEvidenceQuery,
  PaginatedControlEvidence,
} from "../types";
import {
  getControlEvidenceModel,
  type ControlEvidenceDocument,
} from "./control-evidence.model";

function mapAttachment(
  raw: NonNullable<ControlEvidenceDocument["fileStorage"]>
): ComplianceAttachment {
  return {
    id: raw.id,
    fileName: raw.fileName,
    mimeType: raw.mimeType ?? undefined,
    sizeBytes: raw.sizeBytes ?? undefined,
    storageKey: raw.storageKey ?? undefined,
    url: raw.url ?? undefined,
    uploadedBy: raw.uploadedBy,
    uploadedAt: raw.uploadedAt,
  };
}

function mapDoc(doc: ControlEvidenceDocument): ControlEvidence {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    controlStatusId: doc.controlStatusId,
    evidenceType: doc.evidenceType as ControlEvidenceType,
    relatedRiskId: doc.relatedRiskId ?? null,
    relatedIncidentId: doc.relatedIncidentId ?? null,
    relatedCipId: doc.relatedCipId ?? null,
    relatedDocumentId: doc.relatedDocumentId ?? null,
    textContent: doc.textContent ?? null,
    fileStorage: doc.fileStorage ? mapAttachment(doc.fileStorage) : null,
    groupId: doc.groupId ?? null,
    updatedBy: doc.updatedBy ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type ControlEvidenceRepository = ReturnType<
  typeof createControlEvidenceRepository
>;

export function createControlEvidenceRepository() {
  const Model = getControlEvidenceModel();

  return {
    async create(
      organizationId: string,
      controlStatusId: string,
      input: {
        evidenceType: ControlEvidenceType;
        relatedRiskId: string | null;
        relatedIncidentId: string | null;
        relatedCipId: string | null;
        relatedDocumentId: string | null;
        textContent: string | null;
        fileStorage: ComplianceAttachment | null;
        groupId: string | null;
        updatedBy: string;
      }
    ): Promise<ControlEvidence> {
      const doc = await Model.create({
        organizationId,
        controlStatusId,
        evidenceType: input.evidenceType,
        relatedRiskId: input.relatedRiskId,
        relatedIncidentId: input.relatedIncidentId,
        relatedCipId: input.relatedCipId,
        relatedDocumentId: input.relatedDocumentId,
        textContent: input.textContent,
        fileStorage: input.fileStorage,
        groupId: input.groupId,
        updatedBy: input.updatedBy,
        deletedAt: null,
      });
      return mapDoc(doc);
    },

    async list(
      organizationId: string,
      controlStatusId: string,
      query: ListControlEvidenceQuery
    ): Promise<PaginatedControlEvidence> {
      const filter: Record<string, unknown> = {
        organizationId,
        controlStatusId,
        deletedAt: null,
      };
      if (query.evidenceType) filter.evidenceType = query.evidenceType;

      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const page = query.page;
      const pageSize = query.pageSize;
      const skip = (page - 1) * pageSize;

      const [total, docs] = await Promise.all([
        Model.countDocuments(filter).exec(),
        Model.find(filter)
          .sort({ createdAt: sortDir })
          .skip(skip)
          .limit(pageSize)
          .exec(),
      ]);

      return {
        items: docs.map(mapDoc),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    },

    async findDuplicate(
      organizationId: string,
      controlStatusId: string,
      input: CreateControlEvidenceInput
    ): Promise<ControlEvidence | null> {
      const filter: Record<string, unknown> = {
        organizationId,
        controlStatusId,
        evidenceType: input.evidenceType,
        deletedAt: null,
      };
      if (input.evidenceType === "risk-management" && input.relatedRiskId) {
        filter.relatedRiskId = input.relatedRiskId;
      } else if (
        input.evidenceType === "incident-management" &&
        input.relatedIncidentId
      ) {
        filter.relatedIncidentId = input.relatedIncidentId;
      } else if (input.evidenceType === "cip" && input.relatedCipId) {
        filter.relatedCipId = input.relatedCipId;
      } else if (
        input.evidenceType === "document-management" &&
        input.relatedDocumentId
      ) {
        filter.relatedDocumentId = input.relatedDocumentId;
      } else {
        return null;
      }

      const doc = await Model.findOne(filter).exec();
      return doc ? mapDoc(doc) : null;
    },

    async softDelete(
      organizationId: string,
      controlStatusId: string,
      evidenceId: string
    ): Promise<ControlEvidence | null> {
      const doc = await Model.findOneAndUpdate(
        {
          _id: evidenceId,
          organizationId,
          controlStatusId,
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } },
        { new: true }
      ).exec();
      return doc ? mapDoc(doc) : null;
    },

    async softDeleteForToolkitControls(
      organizationId: string,
      controlStatusIds: string[]
    ): Promise<number> {
      if (controlStatusIds.length === 0) return 0;
      const result = await Model.updateMany(
        {
          organizationId,
          controlStatusId: { $in: controlStatusIds },
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount ?? 0;
    },

    async listActiveForRelatedRisk(
      organizationId: string,
      relatedRiskId: string
    ): Promise<ControlEvidence[]> {
      const docs = await Model.find({
        organizationId,
        evidenceType: "risk-management",
        relatedRiskId,
        deletedAt: null,
      }).exec();
      return docs.map(mapDoc);
    },

    async softDeleteForRelatedRisk(
      organizationId: string,
      relatedRiskId: string
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          evidenceType: "risk-management",
          relatedRiskId,
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount ?? 0;
    },

    async softDeleteForRelatedRiskAndControl(
      organizationId: string,
      controlStatusId: string,
      relatedRiskId: string
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          controlStatusId,
          evidenceType: "risk-management",
          relatedRiskId,
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount ?? 0;
    },

    async softDeleteForRelatedIncident(
      organizationId: string,
      relatedIncidentId: string
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          evidenceType: "incident-management",
          relatedIncidentId,
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount ?? 0;
    },

    async softDeleteForRelatedIncidentAndControl(
      organizationId: string,
      controlStatusId: string,
      relatedIncidentId: string
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          controlStatusId,
          evidenceType: "incident-management",
          relatedIncidentId,
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount ?? 0;
    },

    async softDeleteForRelatedCip(
      organizationId: string,
      relatedCipId: string
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          evidenceType: "cip",
          relatedCipId,
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount ?? 0;
    },

    async softDeleteForRelatedCipAndControl(
      organizationId: string,
      controlStatusId: string,
      relatedCipId: string
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          controlStatusId,
          evidenceType: "cip",
          relatedCipId,
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount ?? 0;
    },
  };
}
