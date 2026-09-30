/**
 * OFI Mongoose model.
 * Spec: docs/module-specifications/ofi.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { OFI_IMPLEMENTATION_STATUSES } from "../types";

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
    type: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    actorId: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const implementedSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [...OFI_IMPLEMENTATION_STATUSES],
      default: "Pending",
    },
    by: { type: String, default: null },
    on: { type: Date, default: null },
  },
  { _id: false }
);

const ofiSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    opportunityForImprovement: { type: String, required: true, trim: true },
    ownerId: { type: String },
    businessUnitId: { type: String, required: true },
    cost: { type: Number },
    implemented: {
      type: implementedSchema,
      default: () => ({ status: "Pending", by: null, on: null }),
    },
    attachments: { type: [attachmentSchema], default: [] },
    complianceLinks: { type: [complianceLinkSchema], default: [] },
    source: { type: sourceSchema },
    activity: { type: [activitySchema], default: [] },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    nextNudgeAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ofiSchema.index({ organizationId: 1, deletedAt: 1, createdOn: -1 });
ofiSchema.index({ organizationId: 1, deletedAt: 1, "implemented.status": 1 });
ofiSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });
ofiSchema.index({ organizationId: 1, deletedAt: 1, ownerId: 1 });
ofiSchema.index({
  organizationId: 1,
  deletedAt: 1,
  "source.moduleType": 1,
  "source.moduleId": 1,
});
ofiSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export type OfiDocument = InferSchemaType<typeof ofiSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type OfiModel = Model<OfiDocument>;

export const OfiModelName = "Ofi";

export function getOfiModel(): OfiModel {
  return (
    (mongoose.models[OfiModelName] as OfiModel | undefined) ??
    mongoose.model<OfiDocument>(OfiModelName, ofiSchema)
  );
}
