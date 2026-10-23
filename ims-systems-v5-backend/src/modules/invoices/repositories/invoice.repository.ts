import type {
  Invoice,
  InvoiceStatusBucket,
  ListInvoicesQuery,
  PaginatedInvoices,
} from "../types";
import { InvoiceCounterModel, InvoiceModel, toInvoice } from "./invoice.model";

export type InvoiceRepository = ReturnType<typeof createInvoiceRepository>;

export function createInvoiceRepository() {
  return {
    async nextNumber(organizationId: string): Promise<number> {
      const counter = await InvoiceCounterModel.findOneAndUpdate(
        { organizationId },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after" },
      ).lean();
      return counter?.seq ?? 1;
    },

    async create(data: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<Invoice> {
      const doc = await InvoiceModel.create(data);
      return toInvoice(doc);
    },

    async findById(organizationId: string, id: string): Promise<Invoice | null> {
      if (!/^[a-f\d]{24}$/i.test(id)) return null;
      const doc = await InvoiceModel.findOne({
        _id: id,
        organizationId,
        deletedAt: null,
      }).lean();
      return doc ? toInvoice(doc as never) : null;
    },

    async list(
      organizationId: string,
      query: ListInvoicesQuery,
    ): Promise<PaginatedInvoices> {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
      const filter: Record<string, unknown> = { organizationId, deletedAt: null };
      if (query.customerId) filter.customerId = query.customerId;
      if (query.status) filter.status = query.status;
      if (query.search?.trim()) {
        filter.reference = { $regex: query.search.trim(), $options: "i" };
      }
      const [docs, total] = await Promise.all([
        InvoiceModel.find(filter)
          .sort({ createdOn: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
        InvoiceModel.countDocuments(filter),
      ]);
      return {
        items: docs.map((d) => toInvoice(d as never)),
        page,
        pageSize,
        total,
      };
    },

    async update(
      organizationId: string,
      id: string,
      patch: Partial<Invoice>,
    ): Promise<Invoice | null> {
      const doc = await InvoiceModel.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $set: patch },
        { returnDocument: "after" },
      ).lean();
      return doc ? toInvoice(doc as never) : null;
    },

    async remove(organizationId: string, id: string): Promise<boolean> {
      const res = await InvoiceModel.deleteOne({
        _id: id,
        organizationId,
        deletedAt: null,
      });
      return res.deletedCount > 0;
    },

    /** N-15: per-customer invoice totals by status. */
    async statsByCustomer(
      organizationId: string,
      customerId: string,
    ): Promise<InvoiceStatusBucket[]> {
      const rows = await InvoiceModel.aggregate([
        { $match: { organizationId, customerId, deletedAt: null } },
        {
          $group: {
            _id: "$status",
            amount: { $sum: "$calculations.total" },
            count: { $sum: 1 },
          },
        },
      ]);
      return rows.map((r) => ({ status: r._id, amount: r.amount, count: r.count }));
    },

    /** N-15: manager's invoices created this month, by status. */
    async statsByManagerThisMonth(
      organizationId: string,
      managerId: string,
    ): Promise<InvoiceStatusBucket[]> {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const rows = await InvoiceModel.aggregate([
        {
          $match: {
            organizationId,
            accountManagerId: managerId,
            deletedAt: null,
            createdOn: { $gte: start },
          },
        },
        {
          $group: {
            _id: "$status",
            amount: { $sum: "$calculations.total" },
            count: { $sum: 1 },
          },
        },
      ]);
      return rows.map((r) => ({ status: r._id, amount: r.amount, count: r.count }));
    },

    /** N-17: monthly Sent invoice count/amount for the last 12 months. */
    async monthlySentLast12Months(
      organizationId: string,
    ): Promise<{ year: number; month: number; count: number; amount: number }[]> {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const rows = await InvoiceModel.aggregate([
        {
          $match: {
            organizationId,
            status: "Sent",
            deletedAt: null,
            createdOn: { $gte: start },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$createdOn" }, m: { $month: "$createdOn" } },
            count: { $sum: 1 },
            amount: { $sum: "$calculations.total" },
          },
        },
      ]);
      return rows.map((r) => ({
        year: r._id.y,
        month: r._id.m,
        count: r.count,
        amount: r.amount,
      }));
    },
  };
}
