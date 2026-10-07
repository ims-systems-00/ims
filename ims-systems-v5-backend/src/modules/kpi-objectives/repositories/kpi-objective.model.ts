/**
 * KPI Objective Mongoose model.
 * Spec: docs/module-specifications/kpi-objective.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { KPI_MODULE_TYPES, KPI_PRIVACY } from "../types";

const kpiObjectiveSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    value: { type: String, required: true, trim: true },
    privacy: {
      type: String,
      required: true,
      enum: [...KPI_PRIVACY],
      default: "Organisational",
    },
    businessUnitId: { type: String },
    targetValue: { type: Number, default: 0, min: 0 },
    currentValue: { type: Number, default: 0, min: 0 },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    unit: { type: String, default: "", trim: true },
    moduleType: { type: String, enum: [...KPI_MODULE_TYPES] },
    moduleId: { type: String },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true }
);

kpiObjectiveSchema.index(
  { organizationId: 1, reference: 1 },
  { unique: true }
);
kpiObjectiveSchema.index({ organizationId: 1, privacy: 1, createdOn: -1 });
kpiObjectiveSchema.index({
  organizationId: 1,
  businessUnitId: 1,
  createdOn: -1,
});
kpiObjectiveSchema.index({ organizationId: 1, createdOn: -1 });

export type KpiObjectiveDocument = InferSchemaType<typeof kpiObjectiveSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type KpiObjectiveModel = Model<KpiObjectiveDocument>;

let cached: KpiObjectiveModel | null = null;

export function getKpiObjectiveModel(): KpiObjectiveModel {
  if (cached) return cached;
  cached =
    (mongoose.models.KpiObjective as KpiObjectiveModel | undefined) ??
    mongoose.model<KpiObjectiveDocument>("KpiObjective", kpiObjectiveSchema);
  return cached;
}
