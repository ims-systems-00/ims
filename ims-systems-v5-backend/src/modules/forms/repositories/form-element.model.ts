import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const formElementSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    formId: { type: String, required: true, index: true },
    type: { type: String, required: true, trim: true },
    attributes: { type: Schema.Types.Mixed, default: {} },
    previousElementId: { type: String, default: null },
    nextElementId: { type: String, default: null },
    parentElementId: { type: String, default: null },
  },
  { timestamps: true }
);

formElementSchema.index({ formId: 1, previousElementId: 1 });
formElementSchema.index({ formId: 1, nextElementId: 1 });
formElementSchema.index({ organizationId: 1, formId: 1 });

export type FormElementDocument = InferSchemaType<typeof formElementSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type FormElementModel = Model<FormElementDocument>;
export const FormElementModelName = "ImsFormElement";

export function getFormElementModel(): FormElementModel {
  return (
    (mongoose.models[FormElementModelName] as FormElementModel | undefined) ??
    mongoose.model<FormElementDocument>(FormElementModelName, formElementSchema)
  );
}
