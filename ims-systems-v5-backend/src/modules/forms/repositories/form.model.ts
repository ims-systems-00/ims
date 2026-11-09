import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const formSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      required: true,
    },
    theme: {
      foregroundColor: { type: String, default: "#111827" },
      backgroundColor: { type: String, default: "#F9FAFB" },
      accentColor: { type: String, default: "#0F766E" },
      logo: {
        type: {
          src: { type: String },
          storage: {
            bucket: { type: String },
            key: { type: String },
            fileName: { type: String },
          },
        },
        default: null,
      },
      coverImage: {
        type: {
          src: { type: String },
          storage: {
            bucket: { type: String },
            key: { type: String },
            fileName: { type: String },
          },
        },
        default: null,
      },
    },
    usagesType: { type: String, default: null },
    availableForStandards: { type: [String], default: [] },
    createdBy: { type: String, required: true },
    submissionCount: { type: Number, default: 0 },
    collaboration: { type: [String], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

formSchema.index({ organizationId: 1, deletedAt: 1, updatedAt: -1 });
formSchema.index({ organizationId: 1, deletedAt: 1, status: 1 });
formSchema.index({ organizationId: 1, deletedAt: 1, title: 1 });

export type FormDocument = InferSchemaType<typeof formSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type FormModel = Model<FormDocument>;
export const FormModelName = "ImsForm";

export function getFormModel(): FormModel {
  return (
    (mongoose.models[FormModelName] as FormModel | undefined) ??
    mongoose.model<FormDocument>(FormModelName, formSchema)
  );
}
