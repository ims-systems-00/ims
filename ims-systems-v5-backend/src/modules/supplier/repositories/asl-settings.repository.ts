import {
  DEFAULT_ASL_CRITERIA,
  DEFAULT_ASL_INTERVAL,
  type AslCriticality,
  type AslSettings,
  type UpdateAslSettingsInput,
} from "../types";
import {
  getAslSettingsModel,
  type AslSettingsDocument,
} from "./asl-settings.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: AslSettingsDocument): AslSettings {
  const interval = doc.interval ?? DEFAULT_ASL_INTERVAL;
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    lead: doc.lead,
    follow: doc.follow,
    esc: doc.esc,
    from: doc.from,
    interval: {
      Critical: interval.Critical ?? DEFAULT_ASL_INTERVAL.Critical,
      High: interval.High ?? DEFAULT_ASL_INTERVAL.High,
      Standard: interval.Standard ?? DEFAULT_ASL_INTERVAL.Standard,
    },
    criteria: (doc.criteria ?? []).map((c) => ({
      k: c.k,
      n: c.n,
      w: c.w,
    })),
    updatedBy: doc.updatedBy ?? null,
    updatedOn: iso(doc.updatedOn),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type AslSettingsRepository = ReturnType<
  typeof createAslSettingsRepository
>;

export function createAslSettingsRepository(defaultFromEmail: string) {
  const Model = getAslSettingsModel();

  return {
    async getOrCreate(organizationId: string): Promise<AslSettings> {
      const existing = await Model.findOne({ organizationId }).lean();
      if (existing) return toDomain(existing as AslSettingsDocument);

      const created = await Model.create({
        organizationId,
        lead: 30,
        follow: 7,
        esc: 14,
        from: defaultFromEmail,
        interval: { ...DEFAULT_ASL_INTERVAL },
        criteria: [...DEFAULT_ASL_CRITERIA],
        updatedBy: null,
        updatedOn: null,
      });
      return toDomain(created.toObject() as AslSettingsDocument);
    },

    async update(
      organizationId: string,
      input: UpdateAslSettingsInput,
      actorId: string
    ): Promise<AslSettings> {
      const current = await this.getOrCreate(organizationId);
      const now = new Date();
      const interval: Record<AslCriticality, number> = {
        ...current.interval,
        ...(input.interval ?? {}),
      };
      const doc = await Model.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            lead: input.lead ?? current.lead,
            follow: input.follow ?? current.follow,
            esc: input.esc ?? current.esc,
            from: input.from ?? current.from,
            interval,
            criteria: input.criteria ?? current.criteria,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { returnDocument: "after", upsert: true }
      ).lean();
      if (!doc) {
        return this.getOrCreate(organizationId);
      }
      return toDomain(doc as AslSettingsDocument);
    },
  };
}
