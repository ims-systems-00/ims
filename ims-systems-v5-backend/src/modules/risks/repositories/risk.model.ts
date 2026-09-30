/**
 * Risk Mongoose model (organisation risk register).
 * Spec: docs/module-specifications/risk-management.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { RISK_TYPES } from "../types";

const scorePairSchema = new Schema(
  {
    likelihood: { type: Number, required: true, min: 1, max: 5 },
    consequence: { type: Number, required: true, min: 1, max: 5 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

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

const complianceLinkSchema = new Schema(
  {
    toolkitId: { type: String, required: true, trim: true },
    clauseIds: { type: [String], default: [] },
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

const riskSchema = new Schema(
  {
    organizationId: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [...RISK_TYPES],
    },
    businessUnitId: {
      type: String,
    },
    categoryId: {
      type: String,
    },
    assetId: {
      type: String,
    },
    ownerId: {
      type: String,
    },
    initialScore: {
      type: scorePairSchema,
      required: true,
    },
    currentScore: {
      type: scorePairSchema,
      required: true,
    },
    mitigationText: {
      type: String,
      trim: true,
    },
    mitigated: {
      type: lifecycleFlagSchema,
      default: () => ({ status: false, by: null, on: null }),
    },
    acceptanceRationale: {
      type: String,
      trim: true,
    },
    decisionMaker: {
      type: String,
      trim: true,
    },
    accepted: {
      type: lifecycleFlagSchema,
      default: () => ({ status: false, by: null, on: null }),
    },
    escalated: {
      type: lifecycleFlagSchema,
      default: () => ({ status: false, by: null, on: null }),
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    complianceLinks: {
      type: [complianceLinkSchema],
      default: [],
    },
    source: {
      type: sourceSchema,
    },
    activity: {
      type: [activitySchema],
      default: [],
    },
    raisedBy: {
      type: String,
      required: true,
    },
    raisedOn: {
      type: Date,
      required: true,
    },
    updatedBy: {
      type: String,
      default: null,
    },
    updatedOn: {
      type: Date,
      default: null,
    },
    nextNudgeAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Org-scoped list + soft-delete + common filters.
riskSchema.index({ organizationId: 1, deletedAt: 1, raisedOn: -1 });
riskSchema.index({ organizationId: 1, deletedAt: 1, "mitigated.status": 1 });
riskSchema.index({ organizationId: 1, deletedAt: 1, ownerId: 1 });
riskSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });
riskSchema.index({ organizationId: 1, deletedAt: 1, type: 1 });
riskSchema.index({ organizationId: 1, deletedAt: 1, "currentScore.total": -1 });
riskSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export type RiskDocument = InferSchemaType<typeof riskSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type RiskModel = Model<RiskDocument>;

export const RiskModelName = "Risk";

export function getRiskModel(): RiskModel {
  return (
    (mongoose.models[RiskModelName] as RiskModel | undefined) ??
    mongoose.model<RiskDocument>(RiskModelName, riskSchema)
  );
}
