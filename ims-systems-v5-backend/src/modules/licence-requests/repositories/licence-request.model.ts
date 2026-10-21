import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { LICENCE_REQUEST_STATUSES } from "../types";

const licenceRequestSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    organizationId: { type: String, required: true, index: true },
    requestedBy: { type: String, required: true },
    superUser: { type: Number, default: 0 },
    users: { type: Number, default: 0 },
    groups: { type: Number, default: 0 },
    complianceTools: { type: [String], default: [] },
    additionalModules: { type: [String], default: [] },
    message: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: [...LICENCE_REQUEST_STATUSES],
      default: "Pending",
      index: true,
    },
    grantedBy: { type: String, default: null },
    grantedOn: { type: Date, default: null },
  },
  { timestamps: true }
);

export type LicenceRequestDocument = InferSchemaType<
  typeof licenceRequestSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type LicenceRequestModel = Model<LicenceRequestDocument>;

let cached: LicenceRequestModel | null = null;

export function getLicenceRequestModel(): LicenceRequestModel {
  if (cached) return cached;
  cached =
    (mongoose.models.LicenceRequest as LicenceRequestModel | undefined) ??
    mongoose.model<LicenceRequestDocument>(
      "LicenceRequest",
      licenceRequestSchema
    );
  return cached;
}

/** Global sequence counters (LR- references). */
const licenceRequestCounterSchema = new Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export type LicenceRequestCounterModel = Model<
  InferSchemaType<typeof licenceRequestCounterSchema>
>;

let cachedCounter: LicenceRequestCounterModel | null = null;

export function getLicenceRequestCounterModel(): LicenceRequestCounterModel {
  if (cachedCounter) return cachedCounter;
  cachedCounter =
    (mongoose.models.LicenceRequestCounter as
      | LicenceRequestCounterModel
      | undefined) ??
    mongoose.model("LicenceRequestCounter", licenceRequestCounterSchema);
  return cachedCounter;
}
