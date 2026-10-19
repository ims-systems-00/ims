/**
 * Email Campaign Mongoose model.
 * Spec: docs/module-specifications/email-campaign.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CAMPAIGN_STATUSES, CUSTOMER_STAGES } from "../types";

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

const customAudienceSchema = new Schema(
  {
    customerId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    reference: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const sentFromSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const emailCampaignSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    businessUnitId: { type: String, required: true },
    target: {
      type: [{ type: String, enum: CUSTOMER_STAGES }],
      default: [],
    },
    customAudience: { type: [customAudienceSchema], default: [] },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      required: true,
      default: "Draft",
    },
    closed: { type: Boolean, required: true, default: false },
    rootCampaign: { type: Boolean, required: true, default: true },
    bundleId: { type: String, required: true },
    sentFrom: { type: sentFromSchema, required: true },
    launchedAt: { type: Date, default: null },
    totalCustomers: { type: Number, required: true, default: 0 },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

emailCampaignSchema.index({ organizationId: 1, deletedAt: 1, createdOn: -1 });
emailCampaignSchema.index({ organizationId: 1, deletedAt: 1, status: 1 });
emailCampaignSchema.index({
  organizationId: 1,
  deletedAt: 1,
  businessUnitId: 1,
});
emailCampaignSchema.index({ organizationId: 1, deletedAt: 1, bundleId: 1 });
emailCampaignSchema.index({ organizationId: 1, deletedAt: 1, createdBy: 1 });
emailCampaignSchema.index(
  { organizationId: 1, reference: 1 },
  { unique: true }
);

export type EmailCampaignDocument = InferSchemaType<
  typeof emailCampaignSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailCampaignModel = Model<EmailCampaignDocument>;

const MODEL_NAME = "EmailCampaign";

export function getEmailCampaignModel(): EmailCampaignModel {
  return (
    (mongoose.models[MODEL_NAME] as EmailCampaignModel | undefined) ??
    mongoose.model<EmailCampaignDocument>(MODEL_NAME, emailCampaignSchema)
  );
}
