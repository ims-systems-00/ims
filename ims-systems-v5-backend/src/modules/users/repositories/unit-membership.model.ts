import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * User ↔ Functional Unit association (Membership.groups equivalent).
 * Owned by the Users module until a dedicated Memberships module exists.
 */
const unitMembershipSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    userId: { type: String, required: true },
    functionalUnitId: { type: String, required: true },
  },
  { timestamps: true }
);

unitMembershipSchema.index(
  { organizationId: 1, functionalUnitId: 1, userId: 1 },
  { unique: true }
);
unitMembershipSchema.index({ organizationId: 1, functionalUnitId: 1 });
unitMembershipSchema.index({ organizationId: 1, userId: 1 });

export type UnitMembershipDocument = InferSchemaType<
  typeof unitMembershipSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type UnitMembershipModel = Model<UnitMembershipDocument>;

export const UnitMembershipModelName = "UnitMembership";

export function getUnitMembershipModel(): UnitMembershipModel {
  return (
    (mongoose.models[UnitMembershipModelName] as
      | UnitMembershipModel
      | undefined) ??
    mongoose.model<UnitMembershipDocument>(
      UnitMembershipModelName,
      unitMembershipSchema
    )
  );
}
