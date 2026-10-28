/**
 * Alice floating chat thread persistence.
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const pinnedSchema = new Schema(
  {
    module: { type: String, required: true, trim: true },
    id: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const citationSchema = new Schema(
  {
    module: { type: String, required: true },
    id: { type: String, required: true },
    reference: { type: String, default: null },
    title: { type: String, required: true },
    href: { type: String, required: true },
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["user", "assistant", "system"],
    },
    content: { type: String, required: true },
    citations: { type: [citationSchema], default: [] },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true }
);

const aiChatThreadSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    userId: { type: String, required: true },
    title: { type: String, required: true, trim: true, default: "New chat" },
    pinnedRecords: { type: [pinnedSchema], default: [] },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true, collection: "aiChatThreads" }
);

aiChatThreadSchema.index({ organizationId: 1, userId: 1, updatedAt: -1 });

export type AiChatThreadDocument = InferSchemaType<typeof aiChatThreadSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type AiChatThreadModel = Model<AiChatThreadDocument>;

export const AiChatThreadModelName = "AiChatThread";

export function getAiChatThreadModel(): AiChatThreadModel {
  return (
    (mongoose.models[AiChatThreadModelName] as AiChatThreadModel | undefined) ??
    mongoose.model<AiChatThreadDocument>(
      AiChatThreadModelName,
      aiChatThreadSchema
    )
  );
}
