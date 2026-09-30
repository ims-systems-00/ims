/**
 * Customer Mongoose model.
 * Spec: docs/module-specifications/customers.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  CUSTOMER_STAGES,
  CUSTOMER_STATUSES,
  DEFAULT_CUSTOMER_LOGO_SRC,
} from "../types";

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

const logoSchema = new Schema(
  {
    fileName: { type: String, trim: true },
    storageKey: { type: String, trim: true },
    url: { type: String, trim: true },
    src: {
      type: String,
      trim: true,
      default: DEFAULT_CUSTOMER_LOGO_SRC,
    },
  },
  { _id: false }
);

const customerSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    companyNumber: { type: String, trim: true },
    businessUnitId: { type: String },
    categoryId: { type: String },
    stage: {
      type: String,
      enum: CUSTOMER_STAGES,
      required: true,
      default: "Prospect",
    },
    status: {
      type: String,
      enum: CUSTOMER_STATUSES,
      required: true,
      default: "Open",
    },
    probability: { type: Number, required: true, default: 10 },
    source: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    buildingName: { type: String, trim: true },
    streetName: { type: String, trim: true },
    town: { type: String, trim: true },
    postCode: { type: String, trim: true },
    primaryContact: { type: String, trim: true },
    primaryEmail: { type: String, required: true, trim: true },
    secondaryContact: { type: String, trim: true },
    secondaryEmail: { type: String, trim: true },
    serviceProvision: { type: String, trim: true },
    contractValue: { type: Number, required: true, default: 0 },
    accountManager: { type: String, trim: true },
    accountNumber: { type: String, trim: true, default: "" },
    contractStartDate: { type: Date, default: null },
    contractEndDate: { type: Date, default: null },
    reviewDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
    reasonForLoss: { type: String, trim: true },
    isChampion: { type: Boolean, required: true, default: false },
    logo: { type: logoSchema, default: () => ({ src: DEFAULT_CUSTOMER_LOGO_SRC }) },
    attachments: { type: [attachmentSchema], default: [] },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

customerSchema.index({ organizationId: 1, deletedAt: 1, createdOn: -1 });
customerSchema.index({ organizationId: 1, deletedAt: 1, stage: 1 });
customerSchema.index({ organizationId: 1, deletedAt: 1, status: 1 });
customerSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });
customerSchema.index({ organizationId: 1, deletedAt: 1, accountManager: 1 });
customerSchema.index({ organizationId: 1, deletedAt: 1, categoryId: 1 });
customerSchema.index({ organizationId: 1, deletedAt: 1, name: 1 });
customerSchema.index({ organizationId: 1, reference: 1 }, { unique: true });
customerSchema.index({
  organizationId: 1,
  deletedAt: 1,
  accountManager: 1,
  contractStartDate: 1,
});
customerSchema.index({
  organizationId: 1,
  deletedAt: 1,
  accountManager: 1,
  contractEndDate: 1,
});
customerSchema.index({
  organizationId: 1,
  deletedAt: 1,
  accountManager: 1,
  reviewDate: 1,
});

export type CustomerDocument = InferSchemaType<typeof customerSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerModel = Model<CustomerDocument>;

export const CustomerModelName = "Customer";

export function getCustomerModel(): CustomerModel {
  return (
    (mongoose.models[CustomerModelName] as CustomerModel | undefined) ??
    mongoose.model<CustomerDocument>(CustomerModelName, customerSchema)
  );
}
