import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const histSchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const tenderCertificateSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    name: { type: String, required: true },
    body: { type: String },
    number: { type: String },
    standard: { type: String },
    scope: { type: String },
    issued: { type: String },
    expires: { type: String },
    fileId: { type: String, default: null },
    fileName: { type: String, default: null },
    fileMeta: { type: Schema.Types.Mixed, default: null },
    hist: { type: [histSchema], default: [] },
  },
  { timestamps: true, collection: "tender_certificates" }
);

tenderCertificateSchema.index(
  { organizationId: 1, entityId: 1 },
  { unique: true }
);

export type TenderCertificateDocument = InferSchemaType<
  typeof tenderCertificateSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderCertificateModel = Model<TenderCertificateDocument>;
export const TenderCertificateModelName = "TenderCertificate";

export function getTenderCertificateModel(): TenderCertificateModel {
  return (
    (mongoose.models[TenderCertificateModelName] as
      | TenderCertificateModel
      | undefined) ??
    mongoose.model<TenderCertificateDocument>(
      TenderCertificateModelName,
      tenderCertificateSchema
    )
  );
}
