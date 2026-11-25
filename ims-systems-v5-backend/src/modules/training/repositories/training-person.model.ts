import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const exemptionSchema = new Schema(
  {
    cid: { type: String, required: true },
    reason: { type: String, default: "" },
    by: { type: String, default: "" },
    date: { type: String, required: true },
  },
  { _id: false }
);

const historySchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const trainingPersonSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    roles: { type: [String], default: [] },
    site: { type: String, default: "" },
    manager: { type: String, default: "" },
    start: { type: String, default: "" },
    email: { type: String, default: "" },
    status: { type: String, required: true, default: "Active" },
    end: { type: String, default: "" },
    extra: { type: [String], default: [] },
    exempt: { type: [exemptionSchema], default: [] },
    external: { type: Boolean, default: false },
    company: { type: String, default: "" },
    userId: { type: String, default: null },
    hist: { type: [historySchema], default: [] },
  },
  { timestamps: true, collection: "training_people" }
);

trainingPersonSchema.index({ organizationId: 1, email: 1 });
trainingPersonSchema.index({ organizationId: 1, status: 1 });
trainingPersonSchema.index({ organizationId: 1, site: 1 });

export type TrainingPersonDocument = InferSchemaType<
  typeof trainingPersonSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TrainingPersonModel = Model<TrainingPersonDocument>;

export const TrainingPersonModelName = "TrainingPerson";

export function getTrainingPersonModel(): TrainingPersonModel {
  return (
    (mongoose.models[TrainingPersonModelName] as
      | TrainingPersonModel
      | undefined) ??
    mongoose.model<TrainingPersonDocument>(
      TrainingPersonModelName,
      trainingPersonSchema
    )
  );
}
