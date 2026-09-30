import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  EMAIL_VERIFICATION_STATUSES,
  SYSTEM_ACCESS_STATUSES,
  SYSTEM_PASSWORD_STATUSES,
  USER_TYPES,
} from "../types";

const verificationSchema = new Schema(
  {
    status: {
      type: String,
      enum: [...EMAIL_VERIFICATION_STATUSES],
      default: "pending",
    },
    on: { type: Date, default: null },
  },
  { _id: false }
);

const systemAccessSchema = new Schema(
  {
    status: {
      type: String,
      enum: [...SYSTEM_ACCESS_STATUSES],
      default: "Active",
    },
    period: { type: String, default: "Full time" },
    expires: { type: Date, default: null },
    updatedOn: { type: Date, default: null },
  },
  { _id: false }
);

const accessPolicySchema = new Schema(
  {
    groupId: { type: String, required: true },
    roleId: { type: String },
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    type: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    reference: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [...USER_TYPES],
      default: "Internal",
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    emailVerified: { type: verificationSchema, default: () => ({}) },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: "" },
    phoneVerified: { type: verificationSchema, default: () => ({}) },
    systemPassword: {
      status: {
        type: String,
        enum: [...SYSTEM_PASSWORD_STATUSES],
        default: "active",
      },
    },
    systemAccess: { type: systemAccessSchema, default: () => ({}) },
    accessPolicies: { type: [accessPolicySchema], default: [] },
    profileImage: {
      url: {
        type: String,
        default:
          "https://assets.imssystems.tech/images/system/avatar-placeholder.jpg",
      },
      fileName: { type: String },
      storageKey: { type: String },
    },
    signatureInfo: {
      url: { type: String },
      fileName: { type: String },
      storageKey: { type: String },
    },
    preferences: {
      darkMode: { type: Boolean, default: false },
      activeTheme: { type: String, default: "blue" },
    },
    country: {
      name: { type: String, default: "United Kingdom" },
      code: { type: String, default: "GB" },
    },
    locations: { type: [locationSchema], default: [] },
    loggedIn: {
      status: { type: String, default: null },
      on: { type: Date, default: null },
    },
    createdBy: { type: String, default: null },
    createdOn: { type: Date, default: null },
    badAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Unique login identity (active and soft-deleted emails must remain unique).
userSchema.index({ email: 1 }, { unique: true });
// Directory listing: Active non-deleted users, sorted by name.
userSchema.index({ "systemAccess.status": 1, deletedAt: 1, name: 1 });
// Lookup by stable product reference.
userSchema.index({ reference: 1 }, { unique: true });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type UserModel = Model<UserDocument>;

export const UserModelName = "User";

export function getUserModel(): UserModel {
  return (
    (mongoose.models[UserModelName] as UserModel | undefined) ??
    mongoose.model<UserDocument>(UserModelName, userSchema)
  );
}
