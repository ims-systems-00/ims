import type {
  CreateCompetencyInput,
  TrainingCompetency,
  UpdateCompetencyInput,
} from "../types";
import {
  getTrainingCompetencyModel,
  type TrainingCompetencyDocument,
} from "./training-competency.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: TrainingCompetencyDocument): TrainingCompetency {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    key: doc.key,
    name: doc.name,
    months: doc.months ?? 0,
    evidence: doc.evidence as TrainingCompetency["evidence"],
    basis: doc.basis ?? "",
    covers: [...(doc.covers ?? [])],
    quiz: (doc.quiz ?? []).map((q) => ({
      q: q.q,
      opts: [...(q.opts ?? [])],
      a: q.a,
    })),
    description: doc.description ?? "",
    provider: doc.provider ?? "",
    archived: Boolean(doc.archived),
    custom: Boolean(doc.custom),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type TrainingCompetencyRepository = ReturnType<
  typeof createTrainingCompetencyRepository
>;

export function createTrainingCompetencyRepository() {
  const Model = getTrainingCompetencyModel();

  return {
    async list(
      organizationId: string,
      opts?: { includeArchived?: boolean }
    ): Promise<TrainingCompetency[]> {
      const filter: Record<string, unknown> = { organizationId };
      if (!opts?.includeArchived) {
        filter.archived = { $ne: true };
      }
      const docs = await Model.find(filter).sort({ name: 1 }).lean();
      return docs.map((d) => toDomain(d as TrainingCompetencyDocument));
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<TrainingCompetency | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as TrainingCompetencyDocument) : null;
    },

    async findByKey(
      organizationId: string,
      key: string
    ): Promise<TrainingCompetency | null> {
      const doc = await Model.findOne({
        organizationId,
        key: key.trim(),
      }).lean();
      return doc ? toDomain(doc as TrainingCompetencyDocument) : null;
    },

    async create(
      organizationId: string,
      input: CreateCompetencyInput & {
        key: string;
        custom?: boolean;
        archived?: boolean;
      }
    ): Promise<TrainingCompetency> {
      const doc = await Model.create({
        organizationId,
        key: input.key.trim(),
        name: input.name.trim(),
        months: input.months,
        evidence: input.evidence,
        basis: input.basis?.trim() ?? "",
        covers: input.covers ?? [],
        quiz: input.quiz ?? [],
        description: input.description?.trim() ?? "",
        provider: input.provider?.trim() ?? "",
        archived: Boolean(input.archived),
        custom: input.custom !== undefined ? Boolean(input.custom) : true,
      });
      return toDomain(doc.toObject() as TrainingCompetencyDocument);
    },

    async update(
      organizationId: string,
      id: string,
      input: UpdateCompetencyInput
    ): Promise<TrainingCompetency | null> {
      const $set: Record<string, unknown> = {};
      if (input.key !== undefined) $set.key = input.key.trim();
      if (input.name !== undefined) $set.name = input.name.trim();
      if (input.months !== undefined) $set.months = input.months;
      if (input.evidence !== undefined) $set.evidence = input.evidence;
      if (input.basis !== undefined) $set.basis = input.basis.trim();
      if (input.covers !== undefined) $set.covers = input.covers;
      if (input.quiz !== undefined) $set.quiz = input.quiz;
      if (input.description !== undefined) {
        $set.description = input.description.trim();
      }
      if (input.provider !== undefined) $set.provider = input.provider.trim();
      if (input.archived !== undefined) $set.archived = input.archived;

      if (!Object.keys($set).length) {
        return this.findById(organizationId, id);
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        { $set },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as TrainingCompetencyDocument) : null;
    },

    async archive(
      organizationId: string,
      id: string
    ): Promise<TrainingCompetency | null> {
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        { $set: { archived: true } },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as TrainingCompetencyDocument) : null;
    },
  };
}
