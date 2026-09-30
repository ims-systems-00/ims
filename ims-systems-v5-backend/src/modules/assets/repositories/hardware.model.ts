import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const hardwareAssetSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    tag: { type: String, trim: true },
    ownerId: { type: String, required: true },
    businessUnitId: { type: String },
    categoryId: { type: String },
    assignedDate: { type: Date, default: () => new Date() },
    returnDate: { type: Date },
    destructionDate: { type: Date },
    cost: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

hardwareAssetSchema.index({ organizationId: 1, deletedAt: 1, createdAt: -1 });
hardwareAssetSchema.index({ organizationId: 1, reference: 1 }, { unique: true });
hardwareAssetSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });
hardwareAssetSchema.index({ organizationId: 1, deletedAt: 1, ownerId: 1 });

export type HardwareAssetDocument = InferSchemaType<typeof hardwareAssetSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type HardwareAssetModel = Model<HardwareAssetDocument>;
export const HardwareAssetModelName = "HardwareAsset";

export function getHardwareAssetModel(): HardwareAssetModel {
  return (
    (mongoose.models[HardwareAssetModelName] as HardwareAssetModel | undefined) ??
    mongoose.model<HardwareAssetDocument>(HardwareAssetModelName, hardwareAssetSchema)
  );
}
