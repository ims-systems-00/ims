/**
 * AI Response Mongoose model (saved Analytical Assistant reports).
 * Spec: docs/module-specifications/ai.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { AI_SOURCE_MODULE_TYPES } from "../types";

const reportSectionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    prompt: { type: String, required: true },
    response: { type: String, default: null },
  },
  { _id: false }
);

const analyserTemplateSchema = new Schema(
  {
    dataDisplay: { type: String, required: true },
    context: { type: String, required: true },
    reportStructure: { type: [reportSectionSchema], default: [] },
  },
  { _id: false }
);

const sourceSchema = new Schema(
  {
    moduleType: {
      type: String,
      required: true,
      enum: [...AI_SOURCE_MODULE_TYPES],
    },
    moduleId: { type: String, required: true },
  },
  { _id: false }
);

const aiResponseSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    source: { type: sourceSchema, required: true },
    template: { type: analyserTemplateSchema, required: true },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
  },
  { timestamps: true }
);

aiResponseSchema.index({
  organizationId: 1,
  "source.moduleType": 1,
  "source.moduleId": 1,
  createdOn: -1,
});
aiResponseSchema.index({ organizationId: 1, createdOn: -1 });

export type AiResponseDocument = InferSchemaType<typeof aiResponseSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type AiResponseModel = Model<AiResponseDocument>;

export const AiResponseModelName = "AiResponse";

export function getAiResponseModel(): AiResponseModel {
  return (
    (mongoose.models[AiResponseModelName] as AiResponseModel | undefined) ??
    mongoose.model<AiResponseDocument>(AiResponseModelName, aiResponseSchema)
  );
}
