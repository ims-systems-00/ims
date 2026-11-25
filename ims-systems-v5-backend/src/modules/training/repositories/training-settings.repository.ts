import type {
  TrainingLogEntry,
  TrainingSettings,
  UpdateTrainingSettingsInput,
} from "../types";
import { DEFAULT_SETTINGS } from "../lib/training-rules";
import {
  getTrainingSettingsModel,
  type TrainingSettingsDocument,
} from "./training-settings.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: TrainingSettingsDocument): TrainingSettings {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    orgName: doc.orgName ?? "",
    leadDays: doc.leadDays ?? DEFAULT_SETTINGS.leadDays,
    inductionDays: doc.inductionDays ?? DEFAULT_SETTINGS.inductionDays,
    siteLabel: doc.siteLabel ?? DEFAULT_SETTINGS.siteLabel,
    sites: [...(doc.sites ?? [])],
    providers: [...(doc.providers ?? [])],
    allowSelfUpload:
      doc.allowSelfUpload ?? DEFAULT_SETTINGS.allowSelfUpload,
    requireVerification:
      doc.requireVerification ?? DEFAULT_SETTINGS.requireVerification,
    selfTokenDays: doc.selfTokenDays ?? DEFAULT_SETTINGS.selfTokenDays,
    reminderDays: [...(doc.reminderDays ?? DEFAULT_SETTINGS.reminderDays)],
    inviteSubject: doc.inviteSubject ?? DEFAULT_SETTINGS.inviteSubject,
    inviteBody: doc.inviteBody ?? DEFAULT_SETTINGS.inviteBody,
    organiserEmail: doc.organiserEmail ?? DEFAULT_SETTINGS.organiserEmail,
    log: (doc.log ?? []).map((e) => ({
      t: e.t,
      by: e.by,
      what: e.what,
    })),
    updatedBy: doc.updatedBy ?? null,
    updatedOn: iso(doc.updatedOn),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type TrainingSettingsRepository = ReturnType<
  typeof createTrainingSettingsRepository
>;

export function createTrainingSettingsRepository() {
  const Model = getTrainingSettingsModel();

  return {
    async getOrCreate(organizationId: string): Promise<TrainingSettings> {
      const existing = await Model.findOne({ organizationId }).lean();
      if (existing) return toDomain(existing as TrainingSettingsDocument);

      const created = await Model.create({
        organizationId,
        orgName: "",
        leadDays: DEFAULT_SETTINGS.leadDays,
        inductionDays: DEFAULT_SETTINGS.inductionDays,
        siteLabel: DEFAULT_SETTINGS.siteLabel,
        sites: [...DEFAULT_SETTINGS.sites],
        providers: [...DEFAULT_SETTINGS.providers],
        allowSelfUpload: DEFAULT_SETTINGS.allowSelfUpload,
        requireVerification: DEFAULT_SETTINGS.requireVerification,
        selfTokenDays: DEFAULT_SETTINGS.selfTokenDays,
        reminderDays: [...DEFAULT_SETTINGS.reminderDays],
        inviteSubject: DEFAULT_SETTINGS.inviteSubject,
        inviteBody: DEFAULT_SETTINGS.inviteBody,
        organiserEmail: DEFAULT_SETTINGS.organiserEmail,
        log: [],
        updatedBy: null,
        updatedOn: null,
      });
      return toDomain(created.toObject() as TrainingSettingsDocument);
    },

    async update(
      organizationId: string,
      input: UpdateTrainingSettingsInput,
      actorId: string
    ): Promise<TrainingSettings> {
      const current = await this.getOrCreate(organizationId);
      const now = new Date();
      const doc = await Model.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            orgName: input.orgName ?? current.orgName,
            leadDays: input.leadDays ?? current.leadDays,
            inductionDays: input.inductionDays ?? current.inductionDays,
            siteLabel: input.siteLabel ?? current.siteLabel,
            sites: input.sites ?? current.sites,
            providers: input.providers ?? current.providers,
            allowSelfUpload:
              input.allowSelfUpload ?? current.allowSelfUpload,
            requireVerification:
              input.requireVerification ?? current.requireVerification,
            selfTokenDays: input.selfTokenDays ?? current.selfTokenDays,
            reminderDays: input.reminderDays ?? current.reminderDays,
            inviteSubject: input.inviteSubject ?? current.inviteSubject,
            inviteBody: input.inviteBody ?? current.inviteBody,
            organiserEmail: input.organiserEmail ?? current.organiserEmail,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { returnDocument: "after", upsert: true }
      ).lean();
      if (!doc) return this.getOrCreate(organizationId);
      return toDomain(doc as TrainingSettingsDocument);
    },

    async appendLog(
      organizationId: string,
      entry: TrainingLogEntry
    ): Promise<TrainingSettings> {
      await this.getOrCreate(organizationId);
      const doc = await Model.findOneAndUpdate(
        { organizationId },
        {
          $push: {
            log: {
              $each: [entry],
              $position: 0,
              $slice: 500,
            },
          },
        },
        { returnDocument: "after" }
      ).lean();
      if (!doc) return this.getOrCreate(organizationId);
      return toDomain(doc as TrainingSettingsDocument);
    },

    async listOrganizationIds(): Promise<string[]> {
      return Model.distinct("organizationId");
    },
  };
}
