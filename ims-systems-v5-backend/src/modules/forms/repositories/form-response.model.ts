import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const formResponseSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    formId: { type: String, required: true, index: true },
    formElementId: { type: String, required: true },
    formSubmissionId: { type: String, required: true, index: true },
    responseValue: { type: Schema.Types.Mixed, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

formResponseSchema.index({
  organizationId: 1,
  formSubmissionId: 1,
  deletedAt: 1,
});
formResponseSchema.index({ formId: 1, formElementId: 1 });

export type FormResponseDocument = InferSchemaType<typeof formResponseSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type FormResponseModel = Model<FormResponseDocument>;
export const FormResponseModelName = "ImsFormResponse";

export function getFormResponseModel(): FormResponseModel {
  return (
    (mongoose.models[FormResponseModelName] as FormResponseModel | undefined) ??
    mongoose.model<FormResponseDocument>(
      FormResponseModelName,
      formResponseSchema
    )
  );
}
