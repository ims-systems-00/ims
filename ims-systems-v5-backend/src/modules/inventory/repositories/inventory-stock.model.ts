import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const historySchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const inventoryStockSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "" },
    qty: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    batch: { type: String, default: "" },
    expiry: { type: String, default: null },
    history: { type: [historySchema], default: [] },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "inventory_stock" }
);

inventoryStockSchema.index(
  { organizationId: 1, code: 1 },
  { unique: true }
);

export type InventoryStockDocument = InferSchemaType<
  typeof inventoryStockSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type InventoryStockModel = Model<InventoryStockDocument>;

export const InventoryStockModelName = "InventoryStock";

export function getInventoryStockModel(): InventoryStockModel {
  return (
    (mongoose.models[InventoryStockModelName] as
      | InventoryStockModel
      | undefined) ??
    mongoose.model<InventoryStockDocument>(
      InventoryStockModelName,
      inventoryStockSchema
    )
  );
}
