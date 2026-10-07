/**
 * Organisation-scoped Control Status model.
 * Spec: docs/module-specifications/compliance.md §6–7 / ADR 0009
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  CONTROL_SELECTED_VALUES,
  CONTROL_STATE_VALUES,
} from "../types";

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

const controlStatusSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    name: {
      type: String,
      required: true,
      enum: [...COMPLIANCE_TOOLKIT_NAMES],
    },
    controlId: { type: String, required: true },
    clause: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    annex: { type: String, default: "" },
    note: { type: String, default: "" },
    isLocked: { type: Boolean, required: true, default: false },
    parentClause: { type: String, default: null },
    childrenClauses: { type: [String], default: [] },
    moreInfo: { type: Schema.Types.Mixed, default: null },
    selected: {
      type: String,
      enum: [...CONTROL_SELECTED_VALUES],
      default: "Not selected",
    },
    state: {
      type: String,
      enum: [...CONTROL_STATE_VALUES],
      default: "Not implemented",
    },
    compliancePercentage: { type: Number, default: 0 },
    numberOfCompliantChildren: { type: Number, default: 0 },
    evidences: { type: [attachmentSchema], default: [] },
    responsibleUserId: { type: String, default: null },
    accountableUserId: { type: String, default: null },
    consultedUserId: { type: String, default: null },
    informedUserId: { type: String, default: null },
    groupId: { type: String, default: null },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

controlStatusSchema.index(
  { organizationId: 1, name: 1, clause: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
controlStatusSchema.index({ organizationId: 1, name: 1, deletedAt: 1, clause: 1 });
controlStatusSchema.index({ organizationId: 1, deletedAt: 1, updatedOn: -1 });
controlStatusSchema.index({ organizationId: 1, name: 1, deletedAt: 1, title: 1 });

export type ControlStatusDocument = InferSchemaType<
  typeof controlStatusSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ControlStatusModel = Model<ControlStatusDocument>;

let cached: ControlStatusModel | null = null;

export function getControlStatusModel(): ControlStatusModel {
  if (cached) return cached;
  cached =
    (mongoose.models.ControlStatus as ControlStatusModel | undefined) ??
    mongoose.model<ControlStatusDocument>(
      "ControlStatus",
      controlStatusSchema
    );
  return cached;
}
