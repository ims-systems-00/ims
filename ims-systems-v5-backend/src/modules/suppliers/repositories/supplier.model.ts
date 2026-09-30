/**
 * Supplier Mongoose model.
 * Spec: docs/module-specifications/suppliers.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

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

const kpiObjectiveSchema = new Schema(
  {
    id: { type: String, required: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const supplierSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    businessUnitId: { type: String },
    accountManager: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    buyerId: { type: String },
    serviceProvision: { type: String, required: true, trim: true },
    contractValue: { type: Number, required: true, default: 0 },
    contractStartDate: { type: Date, required: true },
    contractEndDate: { type: Date, default: null },
    reviewDate: { type: Date, default: null },
    slaFiles: { type: [attachmentSchema], default: [] },
    contractFiles: { type: [attachmentSchema], default: [] },
    onboardingFiles: { type: [attachmentSchema], default: [] },
    kpiObjectives: { type: [kpiObjectiveSchema], default: [] },
    isCompliant: { type: Boolean, required: true, default: false },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

supplierSchema.index({ organizationId: 1, deletedAt: 1, createdOn: -1 });
supplierSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });
supplierSchema.index({ organizationId: 1, deletedAt: 1, createdBy: 1 });
supplierSchema.index({ organizationId: 1, deletedAt: 1, buyerId: 1 });
supplierSchema.index({ organizationId: 1, deletedAt: 1, isCompliant: 1 });
supplierSchema.index({ organizationId: 1, deletedAt: 1, name: 1 });
supplierSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export type SupplierDocument = InferSchemaType<typeof supplierSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type SupplierModel = Model<SupplierDocument>;

export const SupplierModelName = "Supplier";

export function getSupplierModel(): SupplierModel {
  return (
    (mongoose.models[SupplierModelName] as SupplierModel | undefined) ??
    mongoose.model<SupplierDocument>(SupplierModelName, supplierSchema)
  );
}
