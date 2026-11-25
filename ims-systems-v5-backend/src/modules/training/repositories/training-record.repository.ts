import type { CreateRecordInput, TrainingRecord } from "../types";
import {
  getTrainingRecordModel,
  type TrainingRecordDocument,
} from "./training-record.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: TrainingRecordDocument): TrainingRecord {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    personId: doc.personId,
    cid: doc.cid,
    date: doc.date,
    result: doc.result as TrainingRecord["result"],
    provider: doc.provider ?? "",
    ref: doc.ref ?? "",
    fileId: doc.fileId ?? null,
    verifiedBy: doc.verifiedBy ?? "",
    note: doc.note ?? "",
    toVerify: Boolean(doc.toVerify),
    t: doc.t,
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type UpdateTrainingRecordInput = {
  date?: string;
  result?: TrainingRecord["result"];
  provider?: string;
  ref?: string;
  fileId?: string | null;
  verifiedBy?: string;
  note?: string;
  toVerify?: boolean;
};

export type TrainingRecordRepository = ReturnType<
  typeof createTrainingRecordRepository
>;

export function createTrainingRecordRepository() {
  const Model = getTrainingRecordModel();

  return {
    async list(
      organizationId: string,
      opts?: { personId?: string }
    ): Promise<TrainingRecord[]> {
      const filter: Record<string, unknown> = { organizationId };
      if (opts?.personId) filter.personId = opts.personId;
      const docs = await Model.find(filter).sort({ date: -1 }).lean();
      return docs.map((d) => toDomain(d as TrainingRecordDocument));
    },

    async listByPerson(
      organizationId: string,
      personId: string
    ): Promise<TrainingRecord[]> {
      return this.list(organizationId, { personId });
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<TrainingRecord | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as TrainingRecordDocument) : null;
    },

    async create(
      organizationId: string,
      input: CreateRecordInput & {
        date: string;
        result: TrainingRecord["result"];
        t: string;
        verifiedBy?: string;
        toVerify?: boolean;
      }
    ): Promise<TrainingRecord> {
      const doc = await Model.create({
        organizationId,
        personId: input.personId,
        cid: input.cid,
        date: input.date,
        result: input.result,
        provider: input.provider?.trim() ?? "",
        ref: input.ref?.trim() ?? "",
        fileId: input.fileId ?? null,
        verifiedBy: input.verifiedBy ?? "",
        note: input.note?.trim() ?? "",
        toVerify: Boolean(input.toVerify),
        t: input.t,
      });
      return toDomain(doc.toObject() as TrainingRecordDocument);
    },

    async update(
      organizationId: string,
      id: string,
      input: UpdateTrainingRecordInput
    ): Promise<TrainingRecord | null> {
      const $set: Record<string, unknown> = {};
      if (input.date !== undefined) $set.date = input.date;
      if (input.result !== undefined) $set.result = input.result;
      if (input.provider !== undefined) $set.provider = input.provider.trim();
      if (input.ref !== undefined) $set.ref = input.ref.trim();
      if (input.fileId !== undefined) $set.fileId = input.fileId;
      if (input.verifiedBy !== undefined) $set.verifiedBy = input.verifiedBy;
      if (input.note !== undefined) $set.note = input.note.trim();
      if (input.toVerify !== undefined) $set.toVerify = input.toVerify;

      if (!Object.keys($set).length) {
        return this.findById(organizationId, id);
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        { $set },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as TrainingRecordDocument) : null;
    },
  };
}
