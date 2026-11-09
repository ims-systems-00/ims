import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const formSubmissionSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    formId: { type: String, required: true, index: true },
    submittedBy: { type: String, required: true },
    collectionName: { type: String, default: null },
    collectionDocument: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

formSubmissionSchema.index({
  organizationId: 1,
  formId: 1,
  deletedAt: 1,
  createdAt: -1,
});

export type FormSubmissionDocument = InferSchemaType<
  typeof formSubmissionSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type FormSubmissionModel = Model<FormSubmissionDocument>;
export const FormSubmissionModelName = "ImsFormSubmission";

export function getFormSubmissionModel(): FormSubmissionModel {
  return (
    (mongoose.models[FormSubmissionModelName] as
      | FormSubmissionModel
      | undefined) ??
    mongoose.model<FormSubmissionDocument>(
      FormSubmissionModelName,
      formSubmissionSchema
    )
  );
}
