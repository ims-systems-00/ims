import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  ORGANISATION_PAYMENT_STATUSES,
  ORGANISATION_PAYMENT_TYPES,
  ORGANISATION_STATUSES,
} from "../types";

const licenceCounterSchema = new Schema(
  {
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
  },
  { _id: false }
);

const organisationSchema = new Schema(
  {
    reference: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    sizeOfOrganisation: { type: Number, required: true, min: 1 },
    officeEmail: { type: String, required: true, trim: true },
    contactNumber: { type: String, default: "", trim: true },
    companyNumber: { type: String, default: "", trim: true },
    vatNumber: { type: String, default: "", trim: true },
    address: {
      line1: { type: String, required: true, trim: true },
      line2: { type: String, default: "", trim: true },
      city: { type: String, required: true, trim: true },
      county: { type: String, required: true, trim: true },
      postCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },
    country: {
      name: { type: String, required: true, trim: true },
      code: { type: String, required: true, trim: true },
      currency: { type: String, required: true, trim: true },
      phoneCode: { type: Number, required: true },
    },
    isCustomer: { type: Boolean, default: false },
    isPartner: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [...ORGANISATION_STATUSES],
      default: "Running",
    },
    licences: {
      superUser: {
        type: licenceCounterSchema,
        default: () => ({ allocated: 1, used: 0 }),
      },
      users: {
        type: licenceCounterSchema,
        default: () => ({ allocated: 0, used: 0 }),
      },
      groups: {
        type: licenceCounterSchema,
        default: () => ({ allocated: 0, used: 0 }),
      },
      complianceTools: { type: [String], default: [] },
      additionalModules: { type: [String], default: [] },
      carbocalc: { type: Boolean, default: false },
      imsforms: { type: Boolean, default: false },
      projectims: { type: Boolean, default: false },
    },
    paymentSystem: {
      type: {
        type: String,
        enum: [...ORGANISATION_PAYMENT_TYPES],
        default: undefined,
      },
      status: {
        type: String,
        enum: [...ORGANISATION_PAYMENT_STATUSES],
        default: "Trial",
      },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
    },
    systemDate: {
      start: { type: Date, default: null },
      end: { type: Date, default: null },
      unset: { type: Boolean, default: true },
    },
    referralSource: { type: String, default: null },
    logoSrc: { type: String, default: null },
    /** Auth0 Organization id (`org_…`); omit until linked. */
    auth0OrganizationId: { type: String, default: null, trim: true },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
  },
  { timestamps: true }
);

organisationSchema.index({ reference: 1 }, { unique: true });
organisationSchema.index({ name: 1 });
organisationSchema.index(
  { auth0OrganizationId: 1 },
  {
    unique: true,
    partialFilterExpression: { auth0OrganizationId: { $type: "string" } },
  }
);

export type OrganisationDocument = InferSchemaType<typeof organisationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganisationModel = Model<OrganisationDocument>;

let cached: OrganisationModel | null = null;

export function getOrganisationModel(): OrganisationModel {
  if (cached) return cached;
  cached =
    (mongoose.models.Organisation as OrganisationModel | undefined) ??
    mongoose.model<OrganisationDocument>("Organisation", organisationSchema);
  return cached;
}
