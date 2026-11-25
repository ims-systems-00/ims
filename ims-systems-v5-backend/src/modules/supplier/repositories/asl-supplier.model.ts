import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const fileMetaSchema = new Schema(
  {
    Name: { type: String, required: true },
    Key: { type: String, required: true },
    key: { type: String },
    Bucket: { type: String, required: true },
    Size: { type: Number },
  },
  { _id: false }
);

const docSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    exp: { type: String, default: null },
    ref: { type: String, default: "" },
    req: { type: Boolean, default: true },
    chased: { type: String, default: null },
    file: { type: fileMetaSchema, default: null },
  },
  { _id: false }
);

const evalSchema = new Schema(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    by: { type: String, required: true },
    scores: { type: Schema.Types.Mixed, required: true },
    note: { type: String, default: "" },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const commSchema = new Schema(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, required: true },
    subject: { type: String, required: true },
    by: { type: String, required: true },
    outcome: { type: String, default: "" },
  },
  { _id: false }
);

const trailSchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const aslSupplierSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    cat: { type: String, required: true },
    crit: { type: String, required: true },
    status: { type: String, required: true },
    contact: { type: String, default: "" },
    email: { type: String, default: "" },
    stds: { type: [String], default: [] },
    scope: { type: String, default: "" },
    reqs: { type: String, default: "" },
    appby: { type: String, default: "" },
    appon: { type: String, default: null },
    evalDue: { type: String, default: null },
    evalDueNotifiedOn: { type: String, default: null },
    docs: { type: [docSchema], default: [] },
    evals: { type: [evalSchema], default: [] },
    comms: { type: [commSchema], default: [] },
    trail: { type: [trailSchema], default: [] },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "asl_suppliers" }
);

aslSupplierSchema.index({ organizationId: 1, deletedAt: 1, name: 1 });
aslSupplierSchema.index({ organizationId: 1, deletedAt: 1, status: 1 });
aslSupplierSchema.index({ organizationId: 1, deletedAt: 1, crit: 1 });
aslSupplierSchema.index(
  { organizationId: 1, reference: 1 },
  { unique: true }
);

export type AslSupplierDocument = InferSchemaType<typeof aslSupplierSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type AslSupplierModel = Model<AslSupplierDocument>;

export const AslSupplierModelName = "AslSupplier";

export function getAslSupplierModel(): AslSupplierModel {
  return (
    (mongoose.models[AslSupplierModelName] as AslSupplierModel | undefined) ??
    mongoose.model<AslSupplierDocument>(AslSupplierModelName, aslSupplierSchema)
  );
}
