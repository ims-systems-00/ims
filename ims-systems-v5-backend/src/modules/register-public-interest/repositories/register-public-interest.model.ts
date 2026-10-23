/**
 * Register Public Interest records — platform-level (no organisation).
 * Email is unique across all registrations (one sign-up per address).
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const registerPublicInterestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 20 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
      unique: true,
      index: true,
    },
    companyName: { type: String, required: true, trim: true, maxlength: 30 },
    product: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export type RegisterPublicInterestDocument = InferSchemaType<
  typeof registerPublicInterestSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type RegisterPublicInterestModel = Model<RegisterPublicInterestDocument>;

let cached: RegisterPublicInterestModel | null = null;

export function getRegisterPublicInterestModel(): RegisterPublicInterestModel {
  if (cached) return cached;
  cached =
    (mongoose.models.RegisterPublicInterest as
      | RegisterPublicInterestModel
      | undefined) ??
    mongoose.model<RegisterPublicInterestDocument>(
      "RegisterPublicInterest",
      registerPublicInterestSchema
    );
  return cached;
}
