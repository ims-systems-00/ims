/**
 * Idempotent ledger for document / folder / repository review reminder sends.
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const documentReviewReminderSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityType: {
      type: String,
      required: true,
      enum: ["document", "folder", "repository"],
      default: "document",
    },
    /** Document/folder node id, or repository id. */
    entityId: { type: String, required: true },
    /** Legacy alias kept for older ledger rows (document-only era). */
    documentNodeId: { type: String, required: false },
    offset: { type: String, required: true, default: "on_day" },
    reviewDateKey: { type: String, required: true },
    sentOn: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

documentReviewReminderSchema.index(
  { organizationId: 1, entityType: 1, entityId: 1, offset: 1, reviewDateKey: 1 },
  { unique: true }
);

export type DocumentReviewReminderDocument = InferSchemaType<
  typeof documentReviewReminderSchema
> & { _id: mongoose.Types.ObjectId };

const MODEL_NAME = "DocumentReviewReminder";

export function getDocumentReviewReminderModel(): Model<DocumentReviewReminderDocument> {
  return (
    (mongoose.models[MODEL_NAME] as Model<DocumentReviewReminderDocument>) ||
    mongoose.model<DocumentReviewReminderDocument>(
      MODEL_NAME,
      documentReviewReminderSchema
    )
  );
}
