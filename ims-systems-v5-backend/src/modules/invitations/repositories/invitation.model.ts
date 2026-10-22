/**
 * Invitation records. Only the SHA-256 hash of the acceptance token is
 * stored (`tokenHash`); resending regenerates the token and overwrites
 * the hash, which invalidates every previously emailed link.
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ORGANISATION_ROLES } from "../../organisation/types";

const invitationSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    role: { type: String, enum: [...ORGANISATION_ROLES], required: true },
    createdBy: { type: String, required: true },
    inviterName: { type: String, default: "", trim: true },
    organisationName: { type: String, default: "", trim: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// One pending invitation per (organisation, email).
invitationSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export type InvitationDocument = InferSchemaType<typeof invitationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type InvitationModel = Model<InvitationDocument>;

let cached: InvitationModel | null = null;

export function getInvitationModel(): InvitationModel {
  if (cached) return cached;
  cached =
    (mongoose.models.Invitation as InvitationModel | undefined) ??
    mongoose.model<InvitationDocument>("Invitation", invitationSchema);
  return cached;
}
