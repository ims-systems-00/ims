import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const attrsSchema = new Schema(
  {
    employs: { type: Number, default: 0 },
    sites: { type: Number, default: 0 },
    premises: { type: Number, default: 0 },
    contractor: { type: Number, default: 0 },
    vehicles: { type: Number, default: 0 },
    lifting: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    regulated: { type: Number, default: 0 },
    data: { type: Number, default: 0 },
  },
  { _id: false }
);

const declarationSchema = new Schema(
  {
    attr: { type: String, required: true },
    contradicted: { type: Boolean, default: false },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const scopeSchema = new Schema(
  {
    family: { type: String, default: "other" },
    sizeBand: { type: String, default: "unknown" },
    attrs: { type: attrsSchema, default: () => ({}) },
    confirmed: { type: Boolean, default: false },
    declarations: { type: [declarationSchema], default: [] },
  },
  { _id: false }
);

const factsSchema = new Schema(
  {
    accountsOverdue: { type: Boolean, default: false },
    insolvency: { type: Boolean, default: false },
    enforcement: { type: Boolean, default: false },
    disqualifiedDirector: { type: Boolean, default: false },
    riddorOpen: { type: Boolean, default: false },
  },
  { _id: false }
);

const relyableSettingsSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    companyNumber: { type: String, default: null },
    legalName: { type: String, default: null },
    sic: { type: [String], default: [] },
    employees: { type: Number, default: null },
    scope: { type: scopeSchema, default: () => ({}) },
    facts: { type: factsSchema, default: () => ({}) },
    listedCertifications: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
    lastSyncedAt: { type: Date, default: null },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true, collection: "relyable_settings" }
);

export type RelyableSettingsDocument = InferSchemaType<
  typeof relyableSettingsSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type RelyableSettingsModel = Model<RelyableSettingsDocument>;

export const RelyableSettingsModelName = "RelyableSettings";

export function getRelyableSettingsModel(): RelyableSettingsModel {
  return (
    (mongoose.models[RelyableSettingsModelName] as
      | RelyableSettingsModel
      | undefined) ??
    mongoose.model<RelyableSettingsDocument>(
      RelyableSettingsModelName,
      relyableSettingsSchema
    )
  );
}
