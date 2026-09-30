import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ACCESS_TYPES } from "../types";

const roleLicenceSchema = new Schema(
  {
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
  },
  { _id: false }
);

const functionalUnitSchema = new Schema(
  {
    organizationId: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    accessType: {
      type: String,
      required: true,
      enum: [...ACCESS_TYPES],
    },
    responsibility: {
      type: String,
      required: true,
      trim: true,
    },
    operatingLocation: {
      type: String,
      trim: true,
    },
    standards: {
      type: String,
      trim: true,
    },
    totalMembers: {
      type: Number,
      default: 0,
    },
    policyId: {
      type: String,
    },
    complianceToolkits: {
      type: [String],
      default: [],
    },
    userLicences: {
      superUser: { type: roleLicenceSchema, default: () => ({}) },
      hosUser: { type: roleLicenceSchema, default: () => ({}) },
      basicUser: { type: roleLicenceSchema, default: () => ({}) },
      auditorUser: { type: roleLicenceSchema, default: () => ({}) },
    },
    isSystemDefault: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Supports org-scoped list + soft-delete filter + optional accessType filter.
functionalUnitSchema.index({ organizationId: 1, deletedAt: 1, accessType: 1 });
// Supports find by org + reference (search / uniqueness tooling).
functionalUnitSchema.index({ organizationId: 1, reference: 1 });

export type FunctionalUnitDocument = InferSchemaType<
  typeof functionalUnitSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type FunctionalUnitModel = Model<FunctionalUnitDocument>;

export const FunctionalUnitModelName = "FunctionalUnit";

export function getFunctionalUnitModel(): FunctionalUnitModel {
  return (
    (mongoose.models[FunctionalUnitModelName] as
      | FunctionalUnitModel
      | undefined) ??
    mongoose.model<FunctionalUnitDocument>(
      FunctionalUnitModelName,
      functionalUnitSchema
    )
  );
}
