import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_SETTINGS } from "../types";

const tenderSettingsSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    reviewMonths: { type: Number, default: DEFAULT_SETTINGS.reviewMonths },
    approvers: { type: [String], default: [] },
    tone: { type: String, default: DEFAULT_SETTINGS.tone },
    minConfidence: { type: Number, default: DEFAULT_SETTINGS.minConfidence },
    certWarnDays: { type: Number, default: DEFAULT_SETTINGS.certWarnDays },
    learn: { type: Boolean, default: DEFAULT_SETTINGS.learn },
    submissionCc: { type: String, default: "" },
    fromEmail: { type: String, default: "" },
    facts: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true, collection: "tender_settings" }
);

export type TenderSettingsDocument = InferSchemaType<
  typeof tenderSettingsSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderSettingsModel = Model<TenderSettingsDocument>;

export const TenderSettingsModelName = "TenderSettings";

export function getTenderSettingsModel(): TenderSettingsModel {
  return (
    (mongoose.models[TenderSettingsModelName] as
      | TenderSettingsModel
      | undefined) ??
    mongoose.model<TenderSettingsDocument>(
      TenderSettingsModelName,
      tenderSettingsSchema
    )
  );
}
