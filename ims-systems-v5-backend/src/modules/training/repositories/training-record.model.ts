import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const trainingRecordSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    personId: { type: String, required: true, index: true },
    cid: { type: String, required: true, index: true },
    date: { type: String, required: true },
    result: { type: String, required: true },
    provider: { type: String, default: "" },
    ref: { type: String, default: "" },
    fileId: { type: String, default: null },
    verifiedBy: { type: String, default: "" },
    note: { type: String, default: "" },
    toVerify: { type: Boolean, default: false },
    t: { type: String, required: true },
  },
  { timestamps: true, collection: "training_records" }
);

trainingRecordSchema.index({ organizationId: 1, personId: 1 });
trainingRecordSchema.index({ organizationId: 1, cid: 1 });

export type TrainingRecordDocument = InferSchemaType<
  typeof trainingRecordSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TrainingRecordModel = Model<TrainingRecordDocument>;

export const TrainingRecordModelName = "TrainingRecord";

export function getTrainingRecordModel(): TrainingRecordModel {
  return (
    (mongoose.models[TrainingRecordModelName] as
      | TrainingRecordModel
      | undefined) ??
    mongoose.model<TrainingRecordDocument>(
      TrainingRecordModelName,
      trainingRecordSchema
    )
  );
}
