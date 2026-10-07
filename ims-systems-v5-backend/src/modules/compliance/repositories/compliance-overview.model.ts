/**
 * Organisation-scoped Compliance Overview model.
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { COMPLIANCE_TOOLKIT_NAMES } from "../types";

const complianceOverviewSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    name: {
      type: String,
      required: true,
      enum: [...COMPLIANCE_TOOLKIT_NAMES],
    },
    totalPercentage: { type: Number, default: 0 },
    controlsSelected: { type: Number, default: 0 },
    controlsImplemented: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complianceOverviewSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
complianceOverviewSchema.index({ organizationId: 1, deletedAt: 1 });

export type ComplianceOverviewDocument = InferSchemaType<
  typeof complianceOverviewSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ComplianceOverviewModel = Model<ComplianceOverviewDocument>;

let cached: ComplianceOverviewModel | null = null;

export function getComplianceOverviewModel(): ComplianceOverviewModel {
  if (cached) return cached;
  cached =
    (mongoose.models.ComplianceOverview as
      | ComplianceOverviewModel
      | undefined) ??
    mongoose.model<ComplianceOverviewDocument>(
      "ComplianceOverview",
      complianceOverviewSchema
    );
  return cached;
}
