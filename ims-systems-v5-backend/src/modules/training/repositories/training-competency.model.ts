import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const quizQuestionSchema = new Schema(
  {
    q: { type: String, required: true },
    opts: { type: [String], default: [] },
    a: { type: Number, required: true },
  },
  { _id: false }
);

const trainingCompetencySchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    months: { type: Number, required: true },
    evidence: { type: String, required: true },
    basis: { type: String, default: "" },
    covers: { type: [String], default: [] },
    quiz: { type: [quizQuestionSchema], default: [] },
    description: { type: String, default: "" },
    provider: { type: String, default: "" },
    archived: { type: Boolean, default: false },
    custom: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "training_competencies" }
);

trainingCompetencySchema.index(
  { organizationId: 1, key: 1 },
  { unique: true }
);

export type TrainingCompetencyDocument = InferSchemaType<
  typeof trainingCompetencySchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TrainingCompetencyModel = Model<TrainingCompetencyDocument>;

export const TrainingCompetencyModelName = "TrainingCompetency";

export function getTrainingCompetencyModel(): TrainingCompetencyModel {
  return (
    (mongoose.models[TrainingCompetencyModelName] as
      | TrainingCompetencyModel
      | undefined) ??
    mongoose.model<TrainingCompetencyDocument>(
      TrainingCompetencyModelName,
      trainingCompetencySchema
    )
  );
}
