/**
 * Campaign Delivery batch Mongoose model.
 * Spec: docs/module-specifications/email-campaign.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const recipientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const campaignDeliverySchema = new Schema(
  {
    organizationId: { type: String, required: true },
    campaignId: { type: String, required: true },
    recipients: { type: [recipientSchema], default: [] },
    total: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

campaignDeliverySchema.index({ organizationId: 1, campaignId: 1, createdAt: 1 });

export type CampaignDeliveryDocument = InferSchemaType<
  typeof campaignDeliverySchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignDeliveryModel = Model<CampaignDeliveryDocument>;

const MODEL_NAME = "CampaignDelivery";

export function getCampaignDeliveryModel(): CampaignDeliveryModel {
  return (
    (mongoose.models[MODEL_NAME] as CampaignDeliveryModel | undefined) ??
    mongoose.model<CampaignDeliveryDocument>(
      MODEL_NAME,
      campaignDeliverySchema
    )
  );
}
