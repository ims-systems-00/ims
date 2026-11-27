import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const evidenceSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    url: { type: String, trim: true },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, required: true },
  },
  { _id: false }
);

const legalDutySchema = new Schema(
  {
    organizationId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    legislation: { type: String, required: true, trim: true },
    reference: { type: String, trim: true },
    appliesTo: { type: String, trim: true },
    evidence: { type: [evidenceSchema], default: [] },
    lastCheckedOn: { type: Date, default: null },
    createdBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
legalDutySchema.index({ organizationId: 1, deletedAt: 1, name: 1 });

const settingsSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true },
    lastReviewedOn: { type: Date, default: null },
    lastReviewedBy: { type: String, default: null },
    reviewIntervalMonths: { type: Number, default: 12, min: 1, max: 36 },
  },
  { timestamps: true }
);

export type LegalDutyDocument = InferSchemaType<typeof legalDutySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};
export type LegalRegisterSettingsDocument = InferSchemaType<typeof settingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

let dutyModel: Model<LegalDutyDocument> | null = null;
let settingsModel: Model<LegalRegisterSettingsDocument> | null = null;

export function getLegalDutyModel(): Model<LegalDutyDocument> {
  if (dutyModel) return dutyModel;
  dutyModel =
    (mongoose.models.LegalDuty as Model<LegalDutyDocument> | undefined) ??
    mongoose.model<LegalDutyDocument>("LegalDuty", legalDutySchema, "legalDuties");
  return dutyModel;
}

export function getLegalRegisterSettingsModel(): Model<LegalRegisterSettingsDocument> {
  if (settingsModel) return settingsModel;
  settingsModel =
    (mongoose.models.LegalRegisterSettings as Model<LegalRegisterSettingsDocument> | undefined) ??
    mongoose.model<LegalRegisterSettingsDocument>(
      "LegalRegisterSettings",
      settingsSchema,
      "legalRegisterSettings"
    );
  return settingsModel;
}
