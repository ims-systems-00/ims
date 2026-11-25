import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const logEntrySchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const trainingSettingsSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    orgName: { type: String, default: "" },
    leadDays: { type: Number, default: 60 },
    inductionDays: { type: Number, default: 14 },
    siteLabel: { type: String, default: "Site" },
    sites: { type: [String], default: [] },
    providers: { type: [String], default: [] },
    allowSelfUpload: { type: Boolean, default: true },
    requireVerification: { type: Boolean, default: true },
    selfTokenDays: { type: Number, default: 90 },
    reminderDays: { type: [Number], default: [14, 1] },
    inviteSubject: { type: String, default: "" },
    inviteBody: { type: String, default: "" },
    organiserEmail: { type: String, default: "" },
    log: { type: [logEntrySchema], default: [] },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true, collection: "training_settings" }
);

export type TrainingSettingsDocument = InferSchemaType<
  typeof trainingSettingsSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TrainingSettingsModel = Model<TrainingSettingsDocument>;

export const TrainingSettingsModelName = "TrainingSettings";

export function getTrainingSettingsModel(): TrainingSettingsModel {
  return (
    (mongoose.models[TrainingSettingsModelName] as
      | TrainingSettingsModel
      | undefined) ??
    mongoose.model<TrainingSettingsDocument>(
      TrainingSettingsModelName,
      trainingSettingsSchema
    )
  );
}
