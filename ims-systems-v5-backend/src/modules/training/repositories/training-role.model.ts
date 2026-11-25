import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const trainingRoleSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    mandatory: { type: [String], default: [] },
    desirable: { type: [String], default: [] },
    description: { type: String, default: "" },
  },
  { timestamps: true, collection: "training_roles" }
);

trainingRoleSchema.index({ organizationId: 1, key: 1 }, { unique: true });

export type TrainingRoleDocument = InferSchemaType<
  typeof trainingRoleSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TrainingRoleModel = Model<TrainingRoleDocument>;

export const TrainingRoleModelName = "TrainingRole";

export function getTrainingRoleModel(): TrainingRoleModel {
  return (
    (mongoose.models[TrainingRoleModelName] as
      | TrainingRoleModel
      | undefined) ??
    mongoose.model<TrainingRoleDocument>(
      TrainingRoleModelName,
      trainingRoleSchema
    )
  );
}
