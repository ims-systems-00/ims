import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const informationAssetSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    informationInventory: { type: String, trim: true },
    ownerId: { type: String },
    storageLocation: { type: String, trim: true },
    format: { type: String, trim: true },
    link: { type: String, trim: true },
    businessUnitId: { type: String },
    categoryId: { type: String },
    cost: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

informationAssetSchema.index({ organizationId: 1, deletedAt: 1, createdAt: -1 });
informationAssetSchema.index(
  { organizationId: 1, reference: 1 },
  { unique: true }
);
informationAssetSchema.index({
  organizationId: 1,
  deletedAt: 1,
  businessUnitId: 1,
});
informationAssetSchema.index({ organizationId: 1, deletedAt: 1, ownerId: 1 });

export type InformationAssetDocument = InferSchemaType<
  typeof informationAssetSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type InformationAssetModel = Model<InformationAssetDocument>;
export const InformationAssetModelName = "InformationAsset";

export function getInformationAssetModel(): InformationAssetModel {
  return (
    (mongoose.models[InformationAssetModelName] as
      | InformationAssetModel
      | undefined) ??
    mongoose.model<InformationAssetDocument>(
      InformationAssetModelName,
      informationAssetSchema
    )
  );
}
