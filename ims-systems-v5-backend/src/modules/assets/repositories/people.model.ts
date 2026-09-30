import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const peopleAssetSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    responsibility: { type: String, trim: true },
    skill: { type: String, required: true, trim: true },
    businessUnitId: { type: String },
    categoryId: { type: String },
    cost: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

peopleAssetSchema.index({ organizationId: 1, deletedAt: 1, createdAt: -1 });
peopleAssetSchema.index({ organizationId: 1, reference: 1 }, { unique: true });
peopleAssetSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });

export type PeopleAssetDocument = InferSchemaType<typeof peopleAssetSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PeopleAssetModel = Model<PeopleAssetDocument>;
export const PeopleAssetModelName = "PeopleAsset";

export function getPeopleAssetModel(): PeopleAssetModel {
  return (
    (mongoose.models[PeopleAssetModelName] as PeopleAssetModel | undefined) ??
    mongoose.model<PeopleAssetDocument>(PeopleAssetModelName, peopleAssetSchema)
  );
}
