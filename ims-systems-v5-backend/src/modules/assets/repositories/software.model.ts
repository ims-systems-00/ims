import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const softwareKeySchema = new Schema(
  {
    value: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const softwareDocumentSchema = new Schema(
  {
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    sizeBytes: { type: Number, min: 0 },
    storageKey: { type: String, trim: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const softwareAssetSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    businessUnitId: { type: String },
    categoryId: { type: String },
    licenceCount: { type: Number, default: 0, min: 0 },
    installCount: { type: Number, default: 0, min: 0 },
    keys: { type: [softwareKeySchema], default: [] },
    documents: { type: [softwareDocumentSchema], default: [] },
    cost: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

softwareAssetSchema.index({ organizationId: 1, deletedAt: 1, createdAt: -1 });
softwareAssetSchema.index({ organizationId: 1, reference: 1 }, { unique: true });
softwareAssetSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });

export type SoftwareAssetDocument = InferSchemaType<typeof softwareAssetSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type SoftwareAssetModel = Model<SoftwareAssetDocument>;
export const SoftwareAssetModelName = "SoftwareAsset";

export function getSoftwareAssetModel(): SoftwareAssetModel {
  return (
    (mongoose.models[SoftwareAssetModelName] as SoftwareAssetModel | undefined) ??
    mongoose.model<SoftwareAssetDocument>(SoftwareAssetModelName, softwareAssetSchema)
  );
}
