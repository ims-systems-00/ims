import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const tenderAuditLogSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { timestamps: true, collection: "tender_audit_logs" }
);

tenderAuditLogSchema.index({ organizationId: 1, createdAt: -1 });

export type TenderAuditLogDocument = InferSchemaType<
  typeof tenderAuditLogSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderAuditLogModel = Model<TenderAuditLogDocument>;
export const TenderAuditLogModelName = "TenderAuditLog";

export function getTenderAuditLogModel(): TenderAuditLogModel {
  return (
    (mongoose.models[TenderAuditLogModelName] as
      | TenderAuditLogModel
      | undefined) ??
    mongoose.model<TenderAuditLogDocument>(
      TenderAuditLogModelName,
      tenderAuditLogSchema
    )
  );
}
