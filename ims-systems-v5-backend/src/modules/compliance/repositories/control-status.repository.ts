/**
 * Control Status repository (organisation-scoped).
 */

import type {
  ComplianceAttachment,
  ComplianceToolkitName,
  ControlSelected,
  ControlState,
  ControlStatus,
  ListControlsQuery,
  PaginatedControlStatuses,
  PaginatedCompliancePicker,
  CompliancePickerQuery,
  CompliancePickerItem,
  UpdateControlRaciInput,
} from "../types";
import {
  getControlStatusModel,
  type ControlStatusDocument,
} from "./control-status.model";

function mapAttachment(
  raw: ControlStatusDocument["evidences"][number]
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

function mapDoc(doc: ControlStatusDocument): ControlStatus {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    name: doc.name as ComplianceToolkitName,
    controlId: doc.controlId,
    clause: doc.clause,
    title: doc.title,
    description: doc.description ?? "",
    annex: doc.annex ?? "",
    note: doc.note ?? "",
    isLocked: Boolean(doc.isLocked),
    parentClause: doc.parentClause ?? null,
    childrenClauses: [...(doc.childrenClauses ?? [])],
    moreInfo: (doc.moreInfo as Record<string, unknown> | null) ?? null,
    selected: doc.selected as ControlSelected,
    state: doc.state as ControlState,
    compliancePercentage: doc.compliancePercentage ?? 0,
    numberOfCompliantChildren: doc.numberOfCompliantChildren ?? 0,
    evidences: (doc.evidences ?? []).map(mapAttachment),
    responsibleUserId: doc.responsibleUserId ?? null,
    accountableUserId: doc.accountableUserId ?? null,
    consultedUserId: doc.consultedUserId ?? null,
    informedUserId: doc.informedUserId ?? null,
    groupId: doc.groupId ?? null,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ControlStatusCreateInput = {
  name: ComplianceToolkitName;
  controlId: string;
  clause: string;
  title: string;
  description: string;
  annex: string;
  note: string;
  isLocked: boolean;
  parentClause: string | null;
  childrenClauses: string[];
  moreInfo: Record<string, unknown> | null;
};

export type ControlStatusPatch = {
  selected?: ControlSelected;
  state?: ControlState;
  compliancePercentage?: number;
  numberOfCompliantChildren?: number;
  updatedBy?: string | null;
  updatedOn?: Date | null;
};

export type ControlStatusRepository = ReturnType<
  typeof createControlStatusRepository
>;

export function createControlStatusRepository() {
  const Model = getControlStatusModel();

  return {
    async createMany(
      organizationId: string,
      rows: ControlStatusCreateInput[]
    ): Promise<number> {
      if (rows.length === 0) return 0;
      const result = await Model.insertMany(
        rows.map((row) => ({
          organizationId,
          ...row,
          selected: "Not selected",
          state: "Not implemented",
          compliancePercentage: 0,
          numberOfCompliantChildren: 0,
          evidences: [],
          deletedAt: null,
        })),
        { ordered: false }
      );
      return result.length;
    },

    async listAllForToolkit(
      organizationId: string,
      name: ComplianceToolkitName
    ): Promise<ControlStatus[]> {
      const docs = await Model.find({
        organizationId,
        name,
        deletedAt: null,
      })
        .sort({ clause: 1 })
        .exec();
      return docs.map(mapDoc);
    },

    async list(
      organizationId: string,
      name: ComplianceToolkitName,
      query: ListControlsQuery
    ): Promise<PaginatedControlStatuses> {
      const filter: Record<string, unknown> = {
        organizationId,
        name,
        deletedAt: null,
      };
      if (query.search?.trim()) {
        const pattern = escapeRegex(query.search.trim());
        filter.$or = [
          { clause: { $regex: pattern, $options: "i" } },
          { title: { $regex: pattern, $options: "i" } },
          { description: { $regex: pattern, $options: "i" } },
        ];
      }
      if (query.section?.trim()) {
        const section = escapeRegex(query.section.trim());
        filter.clause = {
          $regex: `^${section}([.]|$)`,
          $options: "i",
        };
      }

      const sortField = query.sort ?? "clause";
      const sortDir = query.sortDir === "desc" ? -1 : 1;
      const sort: Record<string, 1 | -1> = { [sortField]: sortDir };

      const page = query.page;
      const pageSize = query.pageSize;
      const skip = (page - 1) * pageSize;

      const [total, docs] = await Promise.all([
        Model.countDocuments(filter).exec(),
        Model.find(filter).sort(sort).skip(skip).limit(pageSize).exec(),
      ]);

      return {
        items: docs.map(mapDoc),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    },

    async picker(
      organizationId: string,
      query: CompliancePickerQuery
    ): Promise<PaginatedCompliancePicker> {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      if (query.name) filter.name = query.name;
      if (query.search?.trim()) {
        const pattern = escapeRegex(query.search.trim());
        filter.$or = [
          { clause: { $regex: pattern, $options: "i" } },
          { title: { $regex: pattern, $options: "i" } },
        ];
      }

      const page = query.page;
      const pageSize = query.pageSize;
      const skip = (page - 1) * pageSize;

      const [total, docs] = await Promise.all([
        Model.countDocuments(filter).exec(),
        Model.find(filter)
          .sort({ name: 1, clause: 1 })
          .skip(skip)
          .limit(pageSize)
          .exec(),
      ]);

      const items: CompliancePickerItem[] = docs.map((doc) => {
        const mapped = mapDoc(doc);
        return {
          controlStatusId: mapped.id,
          controlId: mapped.controlId,
          name: mapped.name,
          clause: mapped.clause,
          title: mapped.title,
          isLocked: mapped.isLocked,
          selected: mapped.selected,
          state: mapped.state,
          compliancePercentage: mapped.compliancePercentage,
        };
      });

      return {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<ControlStatus | null> {
      const doc = await Model.findOne({
        _id: id,
        organizationId,
        deletedAt: null,
      }).exec();
      return doc ? mapDoc(doc) : null;
    },

    async findByToolkitAndClause(
      organizationId: string,
      name: ComplianceToolkitName,
      clause: string
    ): Promise<ControlStatus | null> {
      const doc = await Model.findOne({
        organizationId,
        name,
        clause,
        deletedAt: null,
      }).exec();
      return doc ? mapDoc(doc) : null;
    },

    async countActiveForToolkit(
      organizationId: string,
      name: ComplianceToolkitName
    ): Promise<number> {
      return Model.countDocuments({
        organizationId,
        name,
        deletedAt: null,
      }).exec();
    },

    async patchMany(
      organizationId: string,
      patches: Array<{ id: string; patch: ControlStatusPatch }>
    ): Promise<void> {
      await Promise.all(
        patches.map(({ id, patch }) =>
          Model.updateOne(
            { _id: id, organizationId, deletedAt: null },
            { $set: patch }
          ).exec()
        )
      );
    },

    async updateRaci(
      organizationId: string,
      id: string,
      input: UpdateControlRaciInput,
      updatedBy: string
    ): Promise<ControlStatus | null> {
      const $set: Record<string, unknown> = {
        updatedBy,
        updatedOn: new Date(),
      };
      if (input.responsibleUserId !== undefined) {
        $set.responsibleUserId = input.responsibleUserId;
      }
      if (input.accountableUserId !== undefined) {
        $set.accountableUserId = input.accountableUserId;
      }
      if (input.consultedUserId !== undefined) {
        $set.consultedUserId = input.consultedUserId;
      }
      if (input.informedUserId !== undefined) {
        $set.informedUserId = input.informedUserId;
      }
      if (input.groupId !== undefined) {
        $set.groupId = input.groupId;
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $set },
        { new: true }
      ).exec();
      return doc ? mapDoc(doc) : null;
    },

    async addEmbeddedEvidence(
      organizationId: string,
      id: string,
      evidence: ComplianceAttachment
    ): Promise<ControlStatus | null> {
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        {
          $push: { evidences: evidence },
          $set: { updatedBy: evidence.uploadedBy, updatedOn: new Date() },
        },
        { new: true }
      ).exec();
      return doc ? mapDoc(doc) : null;
    },

    async removeEmbeddedEvidence(
      organizationId: string,
      id: string,
      evidenceId: string,
      actorId: string
    ): Promise<ControlStatus | null> {
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        {
          $pull: { evidences: { id: evidenceId } },
          $set: { updatedBy: actorId, updatedOn: new Date() },
        },
        { new: true }
      ).exec();
      return doc ? mapDoc(doc) : null;
    },

    async softDeleteToolkit(
      organizationId: string,
      name: ComplianceToolkitName
    ): Promise<number> {
      const result = await Model.updateMany(
        { organizationId, name, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount ?? 0;
    },
  };
}
