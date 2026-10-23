import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ORGANISATION_ROLES } from "../types";

const dayHoursSchema = new Schema(
  {
    start: { type: String, trim: true, default: "" },
    end: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const workShiftSchema = new Schema(
  {
    timezone: { type: String, trim: true, default: "UTC" },
    monday: { type: dayHoursSchema, default: null },
    tuesday: { type: dayHoursSchema, default: null },
    wednesday: { type: dayHoursSchema, default: null },
    thursday: { type: dayHoursSchema, default: null },
    friday: { type: dayHoursSchema, default: null },
    saturday: { type: dayHoursSchema, default: null },
    sunday: { type: dayHoursSchema, default: null },
  },
  { _id: false }
);

const organisationMembershipSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: [...ORGANISATION_ROLES],
      required: true,
    },
    jobTitle: { type: String, default: "Not set", trim: true },
    workLocationType: {
      type: String,
      enum: ["On-site", "Remote"],
      default: "On-site",
    },
    salary: { type: Number, default: 0 },
    country: {
      name: { type: String, default: "United Kingdom", trim: true },
      code: { type: String, default: "GB", trim: true },
    },
    leaveDaysEntitled: { type: Number, default: 0 },
    toilBalance: { type: Number, default: 0 },
    workShift: { type: workShiftSchema, default: () => ({ timezone: "UTC" }) },
    /** Compliance toolkit names granted to this member (U-07/N-10). */
    complianceToolkits: { type: [String], default: [] },
    lineManagerIds: { type: [String], default: [] },
    createdOn: { type: Date, required: true },
  },
  { timestamps: true }
);

organisationMembershipSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true }
);

export type OrganisationMembershipDocument = InferSchemaType<
  typeof organisationMembershipSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganisationMembershipModel = Model<OrganisationMembershipDocument>;

let cached: OrganisationMembershipModel | null = null;

export function getOrganisationMembershipModel(): OrganisationMembershipModel {
  if (cached) return cached;
  cached =
    (mongoose.models.OrganisationMembership as
      | OrganisationMembershipModel
      | undefined) ??
    mongoose.model<OrganisationMembershipDocument>(
      "OrganisationMembership",
      organisationMembershipSchema
    );
  return cached;
}
