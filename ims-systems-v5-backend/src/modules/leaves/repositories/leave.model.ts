/**
 * Leave Mongoose model.
 * Spec: docs/module-specifications/leaves.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { LEAVE_STATUSES, LEAVE_TYPES } from "../types";

const countrySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const submissionSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [...LEAVE_STATUSES],
      default: "Draft",
    },
    submissionDate: { type: Date },
    decisionDate: { type: Date },
    decisionMakerId: { type: String },
    lineManagerIds: { type: [String], default: [] },
  },
  { _id: false }
);

const leaveSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    type: { type: String, required: true, enum: [...LEAVE_TYPES] },
    description: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startDayFraction: { type: Number, required: true, default: 1 },
    endDayFraction: { type: Number, required: true, default: 1 },
    days: { type: Number, required: true },
    country: { type: countrySchema, required: true },
    submission: { type: submissionSchema, required: true },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveSchema.index({ organizationId: 1, createdBy: 1, createdOn: -1 });
leaveSchema.index({
  organizationId: 1,
  "submission.lineManagerIds": 1,
  createdOn: -1,
});
leaveSchema.index({ organizationId: 1, "submission.status": 1 });
leaveSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export type LeaveDocument = InferSchemaType<typeof leaveSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type LeaveModel = Model<LeaveDocument>;

export const LeaveModelName = "Leave";

export function getLeaveModel(): LeaveModel {
  return (
    (mongoose.models[LeaveModelName] as LeaveModel | undefined) ??
    mongoose.model<LeaveDocument>(LeaveModelName, leaveSchema)
  );
}
