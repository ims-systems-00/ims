import type {
  CreateRoleInput,
  TrainingRole,
  UpdateRoleInput,
} from "../types";
import {
  getTrainingRoleModel,
  type TrainingRoleDocument,
} from "./training-role.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: TrainingRoleDocument): TrainingRole {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    key: doc.key,
    name: doc.name,
    mandatory: [...(doc.mandatory ?? [])],
    desirable: [...(doc.desirable ?? [])],
    description: doc.description ?? "",
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type TrainingRoleRepository = ReturnType<
  typeof createTrainingRoleRepository
>;

export function createTrainingRoleRepository() {
  const Model = getTrainingRoleModel();

  return {
    async list(organizationId: string): Promise<TrainingRole[]> {
      const docs = await Model.find({ organizationId }).sort({ name: 1 }).lean();
      return docs.map((d) => toDomain(d as TrainingRoleDocument));
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<TrainingRole | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as TrainingRoleDocument) : null;
    },

    async findByKey(
      organizationId: string,
      key: string
    ): Promise<TrainingRole | null> {
      const doc = await Model.findOne({
        organizationId,
        key: key.trim(),
      }).lean();
      return doc ? toDomain(doc as TrainingRoleDocument) : null;
    },

    async create(
      organizationId: string,
      input: CreateRoleInput & { key: string }
    ): Promise<TrainingRole> {
      const doc = await Model.create({
        organizationId,
        key: input.key.trim(),
        name: input.name.trim(),
        mandatory: input.mandatory ?? [],
        desirable: input.desirable ?? [],
        description: input.description?.trim() ?? "",
      });
      return toDomain(doc.toObject() as TrainingRoleDocument);
    },

    async update(
      organizationId: string,
      id: string,
      input: UpdateRoleInput
    ): Promise<TrainingRole | null> {
      const $set: Record<string, unknown> = {};
      if (input.key !== undefined) $set.key = input.key.trim();
      if (input.name !== undefined) $set.name = input.name.trim();
      if (input.mandatory !== undefined) $set.mandatory = input.mandatory;
      if (input.desirable !== undefined) $set.desirable = input.desirable;
      if (input.description !== undefined) {
        $set.description = input.description.trim();
      }

      if (!Object.keys($set).length) {
        return this.findById(organizationId, id);
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        { $set },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as TrainingRoleDocument) : null;
    },

    async remove(organizationId: string, id: string): Promise<boolean> {
      const result = await Model.deleteOne({ _id: id, organizationId });
      return result.deletedCount > 0;
    },

    async removeCompetencyFromAll(
      organizationId: string,
      competencyId: string
    ): Promise<number> {
      const result = await Model.updateMany(
        { organizationId },
        {
          $pull: {
            mandatory: competencyId,
            desirable: competencyId,
          },
        }
      );
      return result.modifiedCount ?? 0;
    },
  };
}
