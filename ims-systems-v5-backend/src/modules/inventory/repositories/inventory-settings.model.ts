import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const checkOverrideSchema = new Schema(
  {
    name: { type: String, required: true },
    intervalMonths: { type: Number, required: true },
    basis: { type: String, default: "" },
    requiresCompetence: { type: Boolean, default: false },
  },
  { _id: false }
);

const inventorySettingsSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    leadDays: { type: Number, default: 30 },
    requireLoginForScanActions: { type: Boolean, default: false },
    scanBase: { type: String, default: null },
    categoryOverrides: { type: Schema.Types.Mixed, default: {} },
    competentPersons: { type: [String], default: [] },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true, collection: "inventory_settings" }
);

export type InventorySettingsDocument = InferSchemaType<
  typeof inventorySettingsSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type InventorySettingsModel = Model<InventorySettingsDocument>;

export const InventorySettingsModelName = "InventorySettings";

export function getInventorySettingsModel(): InventorySettingsModel {
  return (
    (mongoose.models[InventorySettingsModelName] as
      | InventorySettingsModel
      | undefined) ??
    mongoose.model<InventorySettingsDocument>(
      InventorySettingsModelName,
      inventorySettingsSchema
    )
  );
}

export { checkOverrideSchema };
