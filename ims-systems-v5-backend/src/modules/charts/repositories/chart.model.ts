/**
 * Chart Mongoose model — definition registry only.
 * Spec: docs/module-specifications/charts.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  CHART_DISPLAY_TYPES,
  CHART_GROUP_BY_DIMENSIONS,
  CHART_OPERATIONS,
  CHART_SOURCE_MODULES,
} from "../types";

const derivationSchema = new Schema(
  {
    sourceModule: {
      type: String,
      required: true,
      enum: [...CHART_SOURCE_MODULES],
    },
    operation: {
      type: String,
      required: true,
      enum: [...CHART_OPERATIONS],
    },
    groupBy: {
      type: [String],
      enum: [...CHART_GROUP_BY_DIMENSIONS],
      default: undefined,
    },
    metricField: { type: String, trim: true },
    filters: {
      type: new Schema(
        {
          statuses: { type: [String], default: undefined },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { _id: false }
);

const configSchema = new Schema(
  {
    chartType: { type: String, enum: [...CHART_DISPLAY_TYPES] },
    title: { type: String, trim: true },
  },
  { _id: false }
);

const chartSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    derivation: { type: derivationSchema, required: true },
    moduleType: { type: String, enum: [...CHART_SOURCE_MODULES] },
    moduleId: { type: String },
    config: { type: configSchema },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true }
);

chartSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true }
);
chartSchema.index({ organizationId: 1, createdOn: -1 });
chartSchema.index({ organizationId: 1, moduleType: 1, createdOn: -1 });

export type ChartDocument = InferSchemaType<typeof chartSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type ChartModel = Model<ChartDocument>;

let cached: ChartModel | null = null;

export function getChartModel(): ChartModel {
  if (cached) return cached;
  cached =
    (mongoose.models.Chart as ChartModel | undefined) ??
    mongoose.model<ChartDocument>("Chart", chartSchema);
  return cached;
}
