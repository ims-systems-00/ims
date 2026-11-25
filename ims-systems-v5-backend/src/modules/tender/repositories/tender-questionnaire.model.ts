import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const histSchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const tenderQuestionnaireSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    kind: { type: String, default: "questionnaire" },
    buyer: { type: String, default: "" },
    title: { type: String, default: "" },
    reference: { type: String, default: "" },
    submissionEmail: { type: String, default: "" },
    buyerContact: { type: String, default: "" },
    portalUrl: { type: String, default: "" },
    source: { type: String, default: "text" },
    fileName: { type: String, default: null },
    fileId: { type: String, default: null },
    received: { type: String, default: "" },
    due: { type: String, default: null },
    owner: { type: String, default: "" },
    status: { type: String, default: "new" },
    notes: { type: String },
    questions: { type: [Schema.Types.Mixed], default: [] },
    documents: { type: [Schema.Types.Mixed], default: [] },
    requirements: { type: [Schema.Types.Mixed], default: [] },
    criteria: { type: [Schema.Types.Mixed], default: [] },
    dates: { type: Schema.Types.Mixed, default: {} },
    pricing: { type: Schema.Types.Mixed, default: null },
    priceTotals: { type: Schema.Types.Mixed },
    layout: { type: Schema.Types.Mixed },
    exports: { type: [Schema.Types.Mixed], default: [] },
    submitted: { type: String },
    submittedVia: { type: String },
    submission: { type: Schema.Types.Mixed },
    hist: { type: [histSchema], default: [] },
  },
  { timestamps: true, collection: "tender_questionnaires" }
);

tenderQuestionnaireSchema.index(
  { organizationId: 1, entityId: 1 },
  { unique: true }
);

export type TenderQuestionnaireDocument = InferSchemaType<
  typeof tenderQuestionnaireSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderQuestionnaireModel = Model<TenderQuestionnaireDocument>;
export const TenderQuestionnaireModelName = "TenderQuestionnaire";

export function getTenderQuestionnaireModel(): TenderQuestionnaireModel {
  return (
    (mongoose.models[TenderQuestionnaireModelName] as
      | TenderQuestionnaireModel
      | undefined) ??
    mongoose.model<TenderQuestionnaireDocument>(
      TenderQuestionnaireModelName,
      tenderQuestionnaireSchema
    )
  );
}
