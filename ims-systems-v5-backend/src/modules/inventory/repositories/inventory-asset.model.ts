import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const checkRecordSchema = new Schema(
  {
    date: { type: String, required: true },
    result: { type: String, required: true },
    by: { type: String, required: true },
    ref: { type: String, default: "" },
    fileId: { type: String, default: null },
    note: { type: String },
  },
  { _id: false }
);

const historySchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const disposalSchema = new Schema(
  {
    reason: { type: String, default: "" },
    route: { type: String, default: "" },
    evidence: { type: String, default: "" },
    approvedBy: { type: String, default: "" },
    date: { type: String, required: true },
    wipeCert: { type: String },
  },
  { _id: false }
);

const inventoryAssetSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    tag: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    location: { type: String, default: "" },
    custodian: { type: String, default: "" },
    stage: { type: String, required: true },
    criticality: { type: String, required: true },
    makeModel: { type: String, default: "" },
    serial: { type: String, default: "" },
    purchaseDate: { type: String, default: null },
    cost: { type: Number, default: null },
    supplier: { type: String, default: "" },
    warrantyEnds: { type: String, default: null },
    informationAsset: { type: Boolean, default: false },
    safetyNotes: { type: String, default: "" },
    labelPrinted: { type: Boolean, default: false },
    checks: { type: Schema.Types.Mixed, default: {} },
    history: { type: [historySchema], default: [] },
    disposal: { type: disposalSchema, default: null },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "inventory_assets" }
);

inventoryAssetSchema.index({ organizationId: 1, deletedAt: 1, stage: 1 });
inventoryAssetSchema.index({ organizationId: 1, deletedAt: 1, category: 1 });
inventoryAssetSchema.index(
  { organizationId: 1, tag: 1 },
  { unique: true }
);

export type InventoryAssetDocument = InferSchemaType<
  typeof inventoryAssetSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type InventoryAssetModel = Model<InventoryAssetDocument>;

export const InventoryAssetModelName = "InventoryAsset";

export function getInventoryAssetModel(): InventoryAssetModel {
  return (
    (mongoose.models[InventoryAssetModelName] as
      | InventoryAssetModel
      | undefined) ??
    mongoose.model<InventoryAssetDocument>(
      InventoryAssetModelName,
      inventoryAssetSchema
    )
  );
}
