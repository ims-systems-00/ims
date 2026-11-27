import { randomUUID } from "node:crypto";
import type {
  CreateLegalDutyInput,
  LegalDuty,
  LegalEvidence,
  LegalRegisterSettings,
  UpdateLegalDutyInput,
} from "../types";
import {
  getLegalDutyModel,
  getLegalRegisterSettingsModel,
  type LegalDutyDocument,
} from "./legal-register.models";

function toDuty(doc: LegalDutyDocument): LegalDuty {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    name: doc.name,
    legislation: doc.legislation,
    reference: doc.reference || undefined,
    appliesTo: doc.appliesTo || undefined,
    evidence: ((doc.evidence ?? []) as LegalEvidence[]).map((e) => ({
      id: e.id,
      label: e.label,
      ...(e.url ? { url: e.url } : {}),
      addedBy: e.addedBy,
      addedAt: e.addedAt,
    })),
    lastCheckedOn: doc.lastCheckedOn ?? null,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type LegalRegisterRepository = ReturnType<typeof createLegalRegisterRepository>;

export function createLegalRegisterRepository() {
  const Duty = getLegalDutyModel();
  const Settings = getLegalRegisterSettingsModel();

  return {
    async listDuties(organizationId: string): Promise<LegalDuty[]> {
      const docs = await Duty.find({ organizationId, deletedAt: null })
        .sort({ legislation: 1, name: 1 })
        .exec();
      return docs.map(toDuty);
    },

    async findDuty(organizationId: string, id: string): Promise<LegalDuty | null> {
      const doc = await Duty.findOne({ _id: id, organizationId, deletedAt: null }).exec();
      return doc ? toDuty(doc) : null;
    },

    async createDuties(
      organizationId: string,
      inputs: CreateLegalDutyInput[],
      createdBy: string
    ): Promise<LegalDuty[]> {
      if (!inputs.length) return [];
      const docs = await Duty.insertMany(
        inputs.map((input) => ({ organizationId, ...input, createdBy, evidence: [] }))
      );
      return (docs as unknown as LegalDutyDocument[]).map(toDuty);
    },

    async updateDuty(
      organizationId: string,
      id: string,
      patch: UpdateLegalDutyInput & { lastCheckedOn?: Date }
    ): Promise<LegalDuty | null> {
      const set: Record<string, unknown> = {};
      const unset: Record<string, ""> = {};
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        if (value === null || value === "") unset[key] = "";
        else set[key] = value;
      }
      const doc = await Duty.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
        { returnDocument: "after" }
      ).exec();
      return doc ? toDuty(doc) : null;
    },

    async addEvidence(
      organizationId: string,
      id: string,
      evidence: { label: string; url?: string; addedBy: string }
    ): Promise<LegalDuty | null> {
      const now = new Date();
      const doc = await Duty.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        {
          $push: { evidence: { id: randomUUID(), ...evidence, addedAt: now } },
          $set: { lastCheckedOn: now },
        },
        { returnDocument: "after" }
      ).exec();
      return doc ? toDuty(doc) : null;
    },

    async removeEvidence(
      organizationId: string,
      id: string,
      evidenceId: string
    ): Promise<LegalDuty | null> {
      const doc = await Duty.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $pull: { evidence: { id: evidenceId } } },
        { returnDocument: "after" }
      ).exec();
      return doc ? toDuty(doc) : null;
    },

    async softDeleteDuty(organizationId: string, id: string): Promise<boolean> {
      const result = await Duty.updateOne(
        { _id: id, organizationId, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return result.modifiedCount > 0;
    },

    async getSettings(organizationId: string): Promise<LegalRegisterSettings> {
      const doc = await Settings.findOne({ organizationId }).lean().exec();
      return {
        lastReviewedOn: doc?.lastReviewedOn ?? null,
        lastReviewedBy: doc?.lastReviewedBy ?? null,
        reviewIntervalMonths: doc?.reviewIntervalMonths ?? 12,
      };
    },

    async updateSettings(
      organizationId: string,
      patch: Partial<LegalRegisterSettings>
    ): Promise<LegalRegisterSettings> {
      await Settings.updateOne({ organizationId }, { $set: patch }, { upsert: true }).exec();
      return this.getSettings(organizationId);
    },
  };
}
