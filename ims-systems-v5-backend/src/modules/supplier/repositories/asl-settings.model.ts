import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const criterionSchema = new Schema(
  {
    k: { type: String, required: true },
    n: { type: String, required: true },
    w: { type: Number, required: true },
  },
  { _id: false }
);

const aslSettingsSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true },
    lead: { type: Number, required: true, default: 30 },
    follow: { type: Number, required: true, default: 7 },
    esc: { type: Number, required: true, default: 14 },
    from: { type: String, required: true },
    interval: {
      Critical: { type: Number, required: true, default: 6 },
      High: { type: Number, required: true, default: 12 },
      Standard: { type: Number, required: true, default: 24 },
    },
    criteria: { type: [criterionSchema], default: [] },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true, collection: "asl_supplier_settings" }
);

export type AslSettingsDocument = InferSchemaType<typeof aslSettingsSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type AslSettingsModel = Model<AslSettingsDocument>;

export const AslSettingsModelName = "AslSupplierSettings";

export function getAslSettingsModel(): AslSettingsModel {
  return (
    (mongoose.models[AslSettingsModelName] as AslSettingsModel | undefined) ??
    mongoose.model<AslSettingsDocument>(AslSettingsModelName, aslSettingsSchema)
  );
}
