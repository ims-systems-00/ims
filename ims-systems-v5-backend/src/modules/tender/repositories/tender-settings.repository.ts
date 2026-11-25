import {
  DEFAULT_SETTINGS,
  type TenderFacts,
  type TenderSettings,
} from "../types";
import {
  getTenderSettingsModel,
  type TenderSettingsDocument,
} from "./tender-settings.model";

export type TenderSettingsRecord = TenderSettings & {
  organizationId: string;
  facts: TenderFacts;
  updatedBy?: string | null;
  updatedOn?: string | null;
};

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toFacts(raw: unknown): TenderFacts {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: TenderFacts = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function toDomain(doc: TenderSettingsDocument): TenderSettingsRecord {
  return {
    organizationId: doc.organizationId,
    reviewMonths: doc.reviewMonths ?? DEFAULT_SETTINGS.reviewMonths,
    approvers: [...(doc.approvers ?? [])],
    tone: doc.tone ?? DEFAULT_SETTINGS.tone,
    minConfidence: doc.minConfidence ?? DEFAULT_SETTINGS.minConfidence,
    certWarnDays: doc.certWarnDays ?? DEFAULT_SETTINGS.certWarnDays,
    learn: doc.learn ?? DEFAULT_SETTINGS.learn,
    submissionCc: doc.submissionCc ?? "",
    fromEmail: doc.fromEmail ?? "",
    facts: toFacts(doc.facts),
    updatedBy: doc.updatedBy ?? null,
    updatedOn: iso(doc.updatedOn),
  };
}

export type TenderSettingsRepository = ReturnType<
  typeof createTenderSettingsRepository
>;

export function createTenderSettingsRepository() {
  const Model = getTenderSettingsModel();

  return {
    async getOrCreate(organizationId: string): Promise<TenderSettingsRecord> {
      const existing = await Model.findOne({ organizationId }).lean();
      if (existing) return toDomain(existing as TenderSettingsDocument);

      const created = await Model.create({
        organizationId,
        ...DEFAULT_SETTINGS,
        facts: {},
        updatedBy: null,
        updatedOn: null,
      });
      return toDomain(created.toObject() as TenderSettingsDocument);
    },

    async update(
      organizationId: string,
      input: Partial<TenderSettings>,
      actorId: string
    ): Promise<TenderSettingsRecord> {
      const current = await this.getOrCreate(organizationId);
      const now = new Date();
      const doc = await Model.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            reviewMonths: input.reviewMonths ?? current.reviewMonths,
            approvers: input.approvers ?? current.approvers,
            tone: input.tone ?? current.tone,
            minConfidence: input.minConfidence ?? current.minConfidence,
            certWarnDays: input.certWarnDays ?? current.certWarnDays,
            learn: input.learn ?? current.learn,
            submissionCc: input.submissionCc ?? current.submissionCc,
            fromEmail: input.fromEmail ?? current.fromEmail,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { returnDocument: "after", upsert: true }
      ).lean();
      if (!doc) return this.getOrCreate(organizationId);
      return toDomain(doc as TenderSettingsDocument);
    },

    async updateFacts(
      organizationId: string,
      facts: TenderFacts,
      actorId: string
    ): Promise<TenderSettingsRecord> {
      await this.getOrCreate(organizationId);
      const now = new Date();
      const doc = await Model.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            facts,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { returnDocument: "after" }
      ).lean();
      if (!doc) return this.getOrCreate(organizationId);
      return toDomain(doc as TenderSettingsDocument);
    },
  };
}
