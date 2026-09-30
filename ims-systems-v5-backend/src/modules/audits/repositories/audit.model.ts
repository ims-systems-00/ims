/**
 * Audit Mongoose model.
 * Spec: docs/module-specifications/audit.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { AUDIT_INTERVALS, AUDIT_TYPES } from "../types";

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

const identificationSchema = new Schema(
  {
    id: { type: String, required: true },
    nonConformity: { type: String, required: true, trim: true },
    rootCause: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const embeddedRiskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    likelihood: { type: Number, required: true, min: 1, max: 5 },
    consequence: { type: Number, required: true, min: 1, max: 5 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const ofiSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    opportunityForImprovement: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const auditSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [...AUDIT_TYPES],
    },
    focusArea: { type: String, required: true, trim: true },
    businessUnitId: { type: String, required: true },
    complianceBodyId: { type: String, required: true },
    auditorId: { type: String, required: true },
    startDate: { type: Date, required: true },
    time: { type: String, trim: true },
    interval: {
      type: String,
      required: true,
      enum: [...AUDIT_INTERVALS],
    },
    comment: { type: String, trim: true, default: "" },
    identifications: { type: [identificationSchema], default: [] },
    risks: { type: [embeddedRiskSchema], default: [] },
    ofis: { type: [ofiSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    complianceLinks: { type: [complianceLinkSchema], default: [] },
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

auditSchema.index({ organizationId: 1, deletedAt: 1, startDate: -1 });
auditSchema.index({ organizationId: 1, deletedAt: 1, type: 1, startDate: -1 });
auditSchema.index({
  organizationId: 1,
  deletedAt: 1,
  "completed.status": 1,
});
auditSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });
auditSchema.index({ organizationId: 1, deletedAt: 1, auditorId: 1 });
auditSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export type AuditDocument = InferSchemaType<typeof auditSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditModel = Model<AuditDocument>;

export const AuditModelName = "Audit";

export function getAuditModel(): AuditModel {
  return (
    (mongoose.models[AuditModelName] as AuditModel | undefined) ??
    mongoose.model<AuditDocument>(AuditModelName, auditSchema)
  );
}
