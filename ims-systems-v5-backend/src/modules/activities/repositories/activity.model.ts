/**
 * Activity Mongoose model.
 * Spec: docs/module-specifications/activity.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ACTIVITY_MODULE_TYPES } from "../types";

const extraLogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    icon: { type: String, default: null },
    image: { type: String, default: null },
  },
  { _id: false }
);

const activitySchema = new Schema(
  {
    organizationId: { type: String, required: true },
    moduleType: {
      type: String,
      required: true,
      enum: [...ACTIVITY_MODULE_TYPES],
    },
    moduleId: { type: String, required: true },
    value: { type: String, required: true },
    isAutomated: { type: Boolean, required: true, default: false },
    iconSrc: { type: String, default: null },
    extraLogs: { type: [extraLogSchema], default: [] },
    metaInfo: { type: Schema.Types.Mixed, default: {} },
    groupId: { type: String, default: null },
    assignedTo: { type: String, default: null },
    assignedOn: { type: Date, default: null },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true }
);

activitySchema.index({
  organizationId: 1,
  moduleType: 1,
  moduleId: 1,
  createdOn: -1,
});
activitySchema.index({
  organizationId: 1,
  "metaInfo.threadId": 1,
  createdOn: -1,
});
activitySchema.index({ organizationId: 1, createdOn: -1 });
activitySchema.index({ organizationId: 1, groupId: 1, createdOn: -1 });

export type ActivityDocument = InferSchemaType<typeof activitySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityModel = Model<ActivityDocument>;

let cached: ActivityModel | null = null;

export function getActivityModel(): ActivityModel {
  if (cached) return cached;
  cached =
    (mongoose.models.Activity as ActivityModel | undefined) ??
    mongoose.model<ActivityDocument>("Activity", activitySchema);
  return cached;
}
