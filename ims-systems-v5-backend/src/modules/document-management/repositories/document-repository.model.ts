/**
 * Document Repository Mongoose model.
 * Spec: docs/module-specifications/document-management.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  DOCUMENT_PRIVACY_VALUES,
  DOCUMENT_REVIEW_INTERVALS,
} from "../types";

const documentRepositorySchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    privacy: {
      type: String,
      enum: [...DOCUMENT_PRIVACY_VALUES],
      required: true,
    },
    businessUnitId: { type: String, default: null },
    owners: { type: [String], default: [] },
    sharedWith: { type: [String], default: [] },
    reviewInterval: {
      type: String,
      enum: [...DOCUMENT_REVIEW_INTERVALS],
      default: "Yearly",
    },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

documentRepositorySchema.index({ organizationId: 1, deletedAt: 1, createdOn: -1 });
documentRepositorySchema.index({ organizationId: 1, deletedAt: 1, name: 1 });
documentRepositorySchema.index({ organizationId: 1, reference: 1 }, { unique: true });
documentRepositorySchema.index({ organizationId: 1, deletedAt: 1, privacy: 1 });

export type DocumentRepositoryDocument = InferSchemaType<
  typeof documentRepositorySchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentRepositoryModel = Model<DocumentRepositoryDocument>;

const MODEL_NAME = "DocumentRepository";

export function getDocumentRepositoryModel(): DocumentRepositoryModel {
  return (
    (mongoose.models[MODEL_NAME] as DocumentRepositoryModel | undefined) ??
    mongoose.model<DocumentRepositoryDocument>(
      MODEL_NAME,
      documentRepositorySchema
    )
  );
}
