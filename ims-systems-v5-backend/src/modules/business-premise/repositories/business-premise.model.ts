/**
 * Business Premise Mongoose model.
 * Spec: docs/module-specifications/business-premise.md
 *
 * Collection: `businesspremises` (V5). V4 used `grouppremises`.
 * Lifecycle: hard delete (no soft-delete / archive field per specification).
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const businessPremiseSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    /** V4 field name: `groups`. */
    functionalUnitIds: { type: [String], default: [] },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true }
);

businessPremiseSchema.index({ organizationId: 1, createdOn: -1 });
businessPremiseSchema.index({ organizationId: 1, name: 1 });
businessPremiseSchema.index({ organizationId: 1, functionalUnitIds: 1 });

export type BusinessPremiseDocument = InferSchemaType<
  typeof businessPremiseSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessPremiseModel = Model<BusinessPremiseDocument>;

export const BusinessPremiseModelName = "BusinessPremise";

export function getBusinessPremiseModel(): BusinessPremiseModel {
  return (
    (mongoose.models[BusinessPremiseModelName] as
      | BusinessPremiseModel
      | undefined) ??
    mongoose.model<BusinessPremiseDocument>(
      BusinessPremiseModelName,
      businessPremiseSchema
    )
  );
}
