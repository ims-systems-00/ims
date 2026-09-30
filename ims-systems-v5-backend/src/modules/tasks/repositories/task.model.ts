/**
 * Task Mongoose model.
 * Spec: docs/module-specifications/task.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  ASSIGNEE_ACCEPTANCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../types";

const assigneeSchema = new Schema(
  {
    userId: { type: String, required: true },
    acceptance: {
      type: String,
      required: true,
      enum: [...ASSIGNEE_ACCEPTANCES],
      default: "Pending",
    },
  },
  { _id: false }
);

const attachmentSchema = new Schema(
  {
    id: { type: String, required: true },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    sizeBytes: { type: Number },
    storageKey: { type: String, trim: true },
    url: { type: String, trim: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false }
);

const sourceSchema = new Schema(
  {
    moduleType: { type: String, required: true, trim: true },
    moduleId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const activitySchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    actorId: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const taskSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    dueDate: { type: Date, required: true },
    priority: {
      type: String,
      required: true,
      enum: [...TASK_PRIORITIES],
      default: "Medium",
    },
    teamPriority: { type: Boolean, required: true, default: false },
    businessUnitId: { type: String },
    assignees: { type: [assigneeSchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: [...TASK_STATUSES],
      default: "Pending",
    },
    completedBy: { type: String, default: null },
    completedOn: { type: Date, default: null },
    attachments: { type: [attachmentSchema], default: [] },
    source: { type: sourceSchema },
    activity: { type: [activitySchema], default: [] },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    nextNudgeAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Org + soft-delete + creator/assignee visibility queries.
taskSchema.index({ organizationId: 1, deletedAt: 1, createdOn: -1 });
taskSchema.index({ organizationId: 1, deletedAt: 1, createdBy: 1 });
taskSchema.index({
  organizationId: 1,
  deletedAt: 1,
  "assignees.userId": 1,
});
taskSchema.index({ organizationId: 1, deletedAt: 1, status: 1 });
taskSchema.index({ organizationId: 1, deletedAt: 1, dueDate: 1 });
taskSchema.index({ organizationId: 1, deletedAt: 1, priority: 1 });
taskSchema.index({
  organizationId: 1,
  deletedAt: 1,
  "source.moduleType": 1,
  "source.moduleId": 1,
});
taskSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export type TaskDocument = InferSchemaType<typeof taskSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskModel = Model<TaskDocument>;

export const TaskModelName = "Task";

export function getTaskModel(): TaskModel {
  return (
    (mongoose.models[TaskModelName] as TaskModel | undefined) ??
    mongoose.model<TaskDocument>(TaskModelName, taskSchema)
  );
}
