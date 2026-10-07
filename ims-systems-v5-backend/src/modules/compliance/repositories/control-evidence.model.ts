/**
 * Organisation-scoped Control Evidence association model.
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CONTROL_EVIDENCE_TYPES } from "../types";

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

const controlEvidenceSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    controlStatusId: { type: String, required: true },
    evidenceType: {
      type: String,
      required: true,
      enum: [...CONTROL_EVIDENCE_TYPES],
    },
    relatedRiskId: { type: String, default: null },
    relatedIncidentId: { type: String, default: null },
    relatedCipId: { type: String, default: null },
    relatedDocumentId: { type: String, default: null },
    textContent: { type: String, default: null },
    fileStorage: { type: attachmentSchema, default: null },
    groupId: { type: String, default: null },
    updatedBy: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

controlEvidenceSchema.index({
  organizationId: 1,
  controlStatusId: 1,
  deletedAt: 1,
  createdAt: -1,
});
controlEvidenceSchema.index({
  organizationId: 1,
  controlStatusId: 1,
  evidenceType: 1,
  relatedRiskId: 1,
  deletedAt: 1,
});
controlEvidenceSchema.index({
  organizationId: 1,
  controlStatusId: 1,
  evidenceType: 1,
  relatedIncidentId: 1,
  deletedAt: 1,
});
controlEvidenceSchema.index({
  organizationId: 1,
  controlStatusId: 1,
  evidenceType: 1,
  relatedCipId: 1,
  deletedAt: 1,
});
controlEvidenceSchema.index({
  organizationId: 1,
  controlStatusId: 1,
  evidenceType: 1,
  relatedDocumentId: 1,
  deletedAt: 1,
});

export type ControlEvidenceDocument = InferSchemaType<
  typeof controlEvidenceSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ControlEvidenceModel = Model<ControlEvidenceDocument>;

let cached: ControlEvidenceModel | null = null;

export function getControlEvidenceModel(): ControlEvidenceModel {
  if (cached) return cached;
  cached =
    (mongoose.models.ControlEvidence as ControlEvidenceModel | undefined) ??
    mongoose.model<ControlEvidenceDocument>(
      "ControlEvidence",
      controlEvidenceSchema
    );
  return cached;
}
