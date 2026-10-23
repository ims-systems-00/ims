import mongoose, { Schema } from "mongoose";
import type { Invoice } from "../types";

export type InvoiceDocument = mongoose.Document & {
  number: number;
  reference: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  groupId: string | null;
  accountManagerId: string | null;
  status: string;
  dueDate: Date;
  entries: {
    item: string;
    unitPrice: number;
    units: number;
    vatRate: number;
    vatFigure: number;
    subtotal: number;
  }[];
  calculations: { total: number; vatFigure: number; discount: number };
  emails: { name: string; email: string }[];
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const entrySchema = new Schema(
  {
    item: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    units: { type: Number, required: true },
    vatRate: { type: Number, required: true },
    vatFigure: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    number: { type: Number, required: true },
    reference: { type: String, required: true },
    organizationId: { type: String, required: true, index: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    groupId: { type: String, default: null },
    accountManagerId: { type: String, default: null },
    status: { type: String, enum: ["Draft", "Sent", "Paid"], default: "Draft" },
    dueDate: { type: Date, required: true },
    entries: { type: [entrySchema], default: [] },
    calculations: {
      total: { type: Number, required: true },
      vatFigure: { type: Number, required: true },
      discount: { type: Number, default: 0 },
    },
    emails: {
      type: [{ name: String, email: String }],
      default: [],
    },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

invoiceSchema.index({ organizationId: 1, reference: 1 });
invoiceSchema.index({ organizationId: 1, customerId: 1, deletedAt: 1 });
invoiceSchema.index({ organizationId: 1, number: 1 }, { unique: true });

export const InvoiceModel =
  (mongoose.models.Invoice as mongoose.Model<InvoiceDocument>) ??
  mongoose.model<InvoiceDocument>("Invoice", invoiceSchema, "invoices");

const counterSchema = new Schema({
  organizationId: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const InvoiceCounterModel =
  (mongoose.models.InvoiceCounter as mongoose.Model<{ organizationId: string; seq: number }>) ??
  mongoose.model("InvoiceCounter", counterSchema, "invoice_counters");

export function toInvoice(doc: InvoiceDocument): Invoice {
  return {
    id: String(doc._id),
    number: doc.number,
    reference: doc.reference,
    organizationId: doc.organizationId,
    customerId: doc.customerId,
    customerName: doc.customerName,
    groupId: doc.groupId ?? null,
    accountManagerId: doc.accountManagerId ?? null,
    status: doc.status as Invoice["status"],
    dueDate: doc.dueDate,
    entries: (doc.entries ?? []).map((e) => ({ ...e })),
    calculations: { ...doc.calculations },
    emails: (doc.emails ?? []).map((e) => ({ name: e.name, email: e.email })),
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
