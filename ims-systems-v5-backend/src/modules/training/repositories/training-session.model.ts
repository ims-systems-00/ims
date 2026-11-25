import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const attachmentSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    type: { type: String, default: "" },
    fileId: { type: String, default: null },
    url: { type: String, default: null },
    shared: { type: Boolean, default: false },
    note: { type: String, default: "" },
    by: { type: String, default: "" },
    t: { type: String, required: true },
  },
  { _id: false }
);

const inviteLogSchema = new Schema(
  {
    personId: { type: String, required: true },
    to: { type: String, default: "" },
    status: { type: String, required: true },
    t: { type: String, required: true },
    by: { type: String },
    error: { type: String },
  },
  { _id: false }
);

const trainingSessionSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    cid: { type: String, required: true, index: true },
    date: { type: String, required: true },
    time: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    location: { type: String, default: "" },
    trainer: { type: String, default: "" },
    provider: { type: String, default: "" },
    cost: { type: Number, default: 0 },
    note: { type: String, default: "" },
    attendees: { type: [String], default: [] },
    materials: { type: [attachmentSchema], default: [] },
    outputs: { type: [attachmentSchema], default: [] },
    invites: { type: [inviteLogSchema], default: [] },
    rsvp: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, required: true, default: "Planned" },
    cancelReason: { type: String, default: "" },
    completedBy: { type: String, default: null },
    completedAt: { type: Date, default: null },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
  },
  { timestamps: true, collection: "training_sessions" }
);

trainingSessionSchema.index({ organizationId: 1, status: 1 });
trainingSessionSchema.index({ organizationId: 1, date: 1 });

export type TrainingSessionDocument = InferSchemaType<
  typeof trainingSessionSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TrainingSessionModel = Model<TrainingSessionDocument>;

export const TrainingSessionModelName = "TrainingSession";

export function getTrainingSessionModel(): TrainingSessionModel {
  return (
    (mongoose.models[TrainingSessionModelName] as
      | TrainingSessionModel
      | undefined) ??
    mongoose.model<TrainingSessionDocument>(
      TrainingSessionModelName,
      trainingSessionSchema
    )
  );
}
