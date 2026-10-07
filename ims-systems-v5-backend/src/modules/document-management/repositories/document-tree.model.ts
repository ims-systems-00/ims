/**
 * Document Tree node Mongoose model (folder + document).
 * Spec: docs/module-specifications/document-management.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  DOCUMENT_APPLICABLE_MODULES,
  DOCUMENT_COMPLIANCE_TOOLS,
  DOCUMENT_NODE_TYPES,
  DOCUMENT_PURPOSES,
  DOCUMENT_STATUSES,
  AUTHORISATION_STATUSES,
} from "../types";

const fileMetaSchema = new Schema(
  {
    Name: { type: String, required: true },
    Key: { type: String, required: true },
    key: { type: String, required: true },
    Bucket: { type: String, required: true },
  },
  { _id: false }
);

const authorisationSchema = new Schema(
  {
    userId: { type: String, required: true },
    status: {
      type: String,
      enum: [...AUTHORISATION_STATUSES],
      default: "Pending",
    },
    handledOn: { type: Date, default: null },
    message: { type: String, default: "" },
  },
  { timestamps: false }
);

const documentDataSchema = new Schema(
  {
    storageInfo: { type: fileMetaSchema, required: true },
    purpose: {
      type: String,
      enum: [...DOCUMENT_PURPOSES],
      default: "Document",
    },
    owners: { type: [String], default: [] },
    applicableModules: {
      type: [{ type: String, enum: [...DOCUMENT_APPLICABLE_MODULES] }],
      default: [],
    },
    complianceTools: {
      type: [{ type: String, enum: [...DOCUMENT_COMPLIANCE_TOOLS] }],
      default: [],
    },
    authorisation: { type: [authorisationSchema], default: [] },
    classification: { type: String, default: "" },
    dvID: { type: Number, default: 0 },
    conformance: { type: Number, default: -1 },
    threadId: { type: String, default: "" },
    reviewDate: { type: Date, default: null },
  },
  { _id: false }
);

const folderDataSchema = new Schema(
  {
    reviewDate: { type: Date, default: null },
    modifiedBy: { type: String, default: null },
    modifiedOn: { type: Date, default: null },
  },
  { _id: false }
);

const documentTreeSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    repositoryId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [...DOCUMENT_NODE_TYPES],
      required: true,
    },
    status: {
      type: String,
      enum: [...DOCUMENT_STATUSES],
      default: "Published",
    },
    parentNodeId: { type: String, default: null },
    documentData: { type: documentDataSchema, default: null },
    folderData: { type: folderDataSchema, default: null },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

documentTreeSchema.index({
  organizationId: 1,
  repositoryId: 1,
  deletedAt: 1,
  parentNodeId: 1,
  name: 1,
});
documentTreeSchema.index({ organizationId: 1, reference: 1 }, { unique: true });
documentTreeSchema.index({
  organizationId: 1,
  deletedAt: 1,
  type: 1,
  status: 1,
  "documentData.purpose": 1,
});
documentTreeSchema.index({
  organizationId: 1,
  deletedAt: 1,
  type: 1,
  status: 1,
  "documentData.applicableModules": 1,
});
documentTreeSchema.index({
  organizationId: 1,
  repositoryId: 1,
  deletedAt: 1,
  name: 1,
  parentNodeId: 1,
  status: 1,
});

export type DocumentTreeDocument = InferSchemaType<typeof documentTreeSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentTreeModel = Model<DocumentTreeDocument>;

const MODEL_NAME = "DocumentTree";

export function getDocumentTreeModel(): DocumentTreeModel {
  return (
    (mongoose.models[MODEL_NAME] as DocumentTreeModel | undefined) ??
    mongoose.model<DocumentTreeDocument>(MODEL_NAME, documentTreeSchema)
  );
}
