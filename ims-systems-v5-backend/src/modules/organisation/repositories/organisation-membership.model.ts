import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ORGANISATION_ROLES } from "../types";

const organisationMembershipSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: [...ORGANISATION_ROLES],
      required: true,
    },
    jobTitle: { type: String, default: "", trim: true },
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
