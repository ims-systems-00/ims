import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { PARTNERSHIP_STATUSES } from "../types";

const partnershipSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    serviceProvision: { type: String, required: true, trim: true },
    customerReach: { type: Number, required: true, min: 0 },
    website: { type: String, required: true, trim: true },
    standards: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: [...PARTNERSHIP_STATUSES],
      default: "Pending",
      index: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type PartnershipDocument = InferSchemaType<
  typeof partnershipSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PartnershipModel = Model<PartnershipDocument>;

let cached: PartnershipModel | null = null;

export function getPartnershipModel(): PartnershipModel {
  if (cached) return cached;
  cached =
    (mongoose.models.Partnership as PartnershipModel | undefined) ??
    mongoose.model<PartnershipDocument>("Partnership", partnershipSchema);
  return cached;
}
