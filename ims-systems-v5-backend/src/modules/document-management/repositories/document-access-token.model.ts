/**
 * Limited-access tokens for document share links and external signing.
 * Only the SHA-256 hash of the token is stored.
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const documentAccessTokenSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    documentNodeId: { type: String, required: true, index: true },
    signatureId: { type: String, index: true },
    purpose: {
      type: String,
      enum: ["share", "signature"],
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    recipientEmail: { type: String, trim: true, lowercase: true },
    createdBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    invalidatedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type DocumentAccessTokenDocument = InferSchemaType<
  typeof documentAccessTokenSchema
> & { _id: mongoose.Types.ObjectId };

const MODEL_NAME = "DocumentAccessToken";

export function getDocumentAccessTokenModel(): Model<DocumentAccessTokenDocument> {
  return (
    (mongoose.models[MODEL_NAME] as Model<DocumentAccessTokenDocument>) ||
    mongoose.model<DocumentAccessTokenDocument>(
      MODEL_NAME,
      documentAccessTokenSchema
    )
  );
}
