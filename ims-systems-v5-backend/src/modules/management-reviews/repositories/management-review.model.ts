/**
 * Management Review Mongoose model.
 * Spec: docs/module-specifications/management-review.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { REVIEW_INTERVALS, REVIEW_PRIVACY } from "../types";

const lifecycleFlagSchema = new Schema(
  {
    status: { type: Boolean, default: false },
    by: { type: String, default: null },
    on: { type: Date, default: null },
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

const managementReviewSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    time: { type: String, trim: true },
    interval: {
      type: String,
      required: true,
      enum: [...REVIEW_INTERVALS],
    },
    privacy: {
      type: String,
      required: true,
      enum: [...REVIEW_PRIVACY],
      default: "Organisational",
    },
    businessUnitId: { type: String },
    attendees: { type: [String], default: [] },
    agenda: { type: [attachmentSchema], default: [] },
    minutes: { type: [attachmentSchema], default: [] },
    completed: {
      type: lifecycleFlagSchema,
      default: () => ({ status: false, by: null, on: null }),
    },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

managementReviewSchema.index({ organizationId: 1, deletedAt: 1, date: -1 });
managementReviewSchema.index({
  organizationId: 1,
  deletedAt: 1,
  "completed.status": 1,
});
managementReviewSchema.index({
  organizationId: 1,
  deletedAt: 1,
  businessUnitId: 1,
});
managementReviewSchema.index({
  organizationId: 1,
  deletedAt: 1,
  attendees: 1,
});
managementReviewSchema.index(
  { organizationId: 1, reference: 1 },
  { unique: true }
);

export type ManagementReviewDocument = InferSchemaType<
  typeof managementReviewSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ManagementReviewModel = Model<ManagementReviewDocument>;

export const ManagementReviewModelName = "ManagementReview";

export function getManagementReviewModel(): ManagementReviewModel {
  return (
    (mongoose.models[ManagementReviewModelName] as
      | ManagementReviewModel
      | undefined) ??
    mongoose.model<ManagementReviewDocument>(
      ManagementReviewModelName,
      managementReviewSchema
    )
  );
}
