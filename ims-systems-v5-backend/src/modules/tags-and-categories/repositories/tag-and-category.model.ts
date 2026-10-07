/**
 * Tag and Category Mongoose model.
 * Spec: docs/module-specifications/tags-and-categories.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TAG_APPLICABLE_MODULES } from "../types";

const tagAndCategorySchema = new Schema(
  {
    organizationId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    applicableModules: {
      type: [
        {
          type: String,
          enum: [...TAG_APPLICABLE_MODULES],
        },
      ],
      default: [],
    },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
  },
  { timestamps: true }
);

tagAndCategorySchema.index({ organizationId: 1, createdOn: -1 });
tagAndCategorySchema.index({ organizationId: 1, name: 1 });
tagAndCategorySchema.index({
  organizationId: 1,
  applicableModules: 1,
  createdOn: -1,
});

export type TagAndCategoryDocument = InferSchemaType<
  typeof tagAndCategorySchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TagAndCategoryModel = Model<TagAndCategoryDocument>;

let cached: TagAndCategoryModel | null = null;

export function getTagAndCategoryModel(): TagAndCategoryModel {
  if (cached) return cached;
  cached =
    (mongoose.models.TagAndCategory as TagAndCategoryModel | undefined) ??
    mongoose.model<TagAndCategoryDocument>(
      "TagAndCategory",
      tagAndCategorySchema
    );
  return cached;
}
