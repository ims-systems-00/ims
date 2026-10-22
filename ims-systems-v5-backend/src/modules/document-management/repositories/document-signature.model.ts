/**
 * Electronic signature invitations for managed documents.
 * Spec: docs/module-specifications/document-management.md §2/§10
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const signatureLocationSchema = new Schema(
  {
    page: { type: Number, required: true, min: 1 },
    x: { type: Number, required: true, min: 0, max: 1 },
    y: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const fileMetaSchema = new Schema(
  {
    Name: { type: String },
    Key: { type: String },
    key: { type: String },
    Bucket: { type: String },
  },
  { _id: false }
);

const documentSignatureSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    repositoryId: { type: String, required: true, index: true },
    documentNodeId: { type: String, required: true, index: true },
    inviteeType: { type: String, enum: ["user", "email"], required: true },
    userId: { type: String, index: true },
    email: { type: String, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Signed"],
      default: "Pending",
      index: true,
    },
    signatureLocations: { type: [signatureLocationSchema], default: [] },
    signatureName: { type: String },
    signatureFont: { type: String },
    jobTitle: { type: String },
    organisation: { type: String },
    signedCopy: { type: fileMetaSchema },
    securityToken: { type: String },
    lastOpenedAt: { type: Date, default: null },
    signedAt: { type: Date, default: null },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export type DocumentSignatureDocument = InferSchemaType<
  typeof documentSignatureSchema
> & { _id: mongoose.Types.ObjectId };

const MODEL_NAME = "DocumentSignature";

export function getDocumentSignatureModel(): Model<DocumentSignatureDocument> {
  return (
    (mongoose.models[MODEL_NAME] as Model<DocumentSignatureDocument>) ||
    mongoose.model<DocumentSignatureDocument>(
      MODEL_NAME,
      documentSignatureSchema
    )
  );
}
