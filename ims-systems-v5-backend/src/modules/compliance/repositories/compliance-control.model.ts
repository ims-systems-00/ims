/**
 * Global Compliance Control catalogue model (no organizationId).
 * Spec: docs/module-specifications/compliance.md §6–7
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { COMPLIANCE_TOOLKIT_NAMES } from "../types";

const complianceControlSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      enum: [...COMPLIANCE_TOOLKIT_NAMES],
    },
    clause: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    annex: { type: String, default: "" },
    note: { type: String, default: "" },
    isLocked: { type: Boolean, required: true, default: false },
    parentClause: { type: String, default: null },
    childrenClauses: { type: [String], default: [] },
    moreInfo: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

complianceControlSchema.index({ name: 1, clause: 1 }, { unique: true });
complianceControlSchema.index({ name: 1, title: 1 });

export type ComplianceControlDocument = InferSchemaType<
  typeof complianceControlSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ComplianceControlModel = Model<ComplianceControlDocument>;

let cached: ComplianceControlModel | null = null;

export function getComplianceControlModel(): ComplianceControlModel {
  if (cached) return cached;
  cached =
    (mongoose.models.ComplianceControl as ComplianceControlModel | undefined) ??
    mongoose.model<ComplianceControlDocument>(
      "ComplianceControl",
      complianceControlSchema
    );
  return cached;
}
