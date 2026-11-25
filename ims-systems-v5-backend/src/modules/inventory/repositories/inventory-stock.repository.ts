import type {
  CreateStockItemInput,
  InventoryHistoryEntry,
  InventoryStockItem,
  UpdateStockItemInput,
} from "../types";
import {
  getInventoryStockModel,
  type InventoryStockDocument,
} from "./inventory-stock.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: InventoryStockDocument): InventoryStockItem {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    code: doc.code,
    name: doc.name,
    location: doc.location ?? "",
    qty: doc.qty ?? 0,
    min: doc.min ?? 0,
    max: doc.max ?? 0,
    batch: doc.batch ?? "",
    expiry: doc.expiry ?? null,
    history: (doc.history ?? []).map((h) => ({
      t: h.t,
      by: h.by,
      what: h.what,
    })),
    createdBy: doc.createdBy,
    createdOn: iso(doc.createdOn) ?? new Date().toISOString(),
    updatedBy: doc.updatedBy ?? null,
    updatedOn: iso(doc.updatedOn),
    deletedAt: iso(doc.deletedAt),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type InventoryStockRepository = ReturnType<
  typeof createInventoryStockRepository
>;

export function createInventoryStockRepository() {
  const Model = getInventoryStockModel();

  return {
    async create(
      organizationId: string,
      input: CreateStockItemInput & {
        createdBy: string;
        history: InventoryHistoryEntry[];
      }
    ): Promise<InventoryStockItem> {
      const now = new Date();
      const doc = await Model.create({
        organizationId,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        location: input.location?.trim() ?? "",
        qty: input.qty ?? 0,
        min: input.min ?? 0,
        max: input.max ?? 0,
        batch: input.batch?.trim() ?? "",
        expiry: input.expiry || null,
        history: input.history,
        createdBy: input.createdBy,
        createdOn: now,
        updatedBy: null,
        updatedOn: null,
        deletedAt: null,
      });
      return toDomain(doc.toObject() as InventoryStockDocument);
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<InventoryStockItem | null> {
      const doc = await Model.findOne({
        _id: id,
        organizationId,
        deletedAt: null,
      }).lean();
      return doc ? toDomain(doc as InventoryStockDocument) : null;
    },

    async list(organizationId: string): Promise<InventoryStockItem[]> {
      const docs = await Model.find({ organizationId, deletedAt: null })
        .sort({ code: 1 })
        .lean();
      return docs.map((d) => toDomain(d as InventoryStockDocument));
    },

    async replace(
      organizationId: string,
      id: string,
      item: InventoryStockItem,
      actorId: string
    ): Promise<InventoryStockItem | null> {
      const now = new Date();
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        {
          $set: {
            code: item.code.trim().toUpperCase(),
            name: item.name.trim(),
            location: item.location,
            qty: item.qty,
            min: item.min,
            max: item.max,
            batch: item.batch,
            expiry: item.expiry,
            history: item.history,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as InventoryStockDocument) : null;
    },

    async updateFields(
      organizationId: string,
      id: string,
      input: UpdateStockItemInput,
      actorId: string
    ): Promise<InventoryStockItem | null> {
      const $set: Record<string, unknown> = {
        updatedBy: actorId,
        updatedOn: new Date(),
      };
      if (input.code !== undefined) $set.code = input.code.trim().toUpperCase();
      if (input.name !== undefined) $set.name = input.name.trim();
      if (input.location !== undefined) $set.location = input.location.trim();
      if (input.qty !== undefined) $set.qty = input.qty;
      if (input.min !== undefined) $set.min = input.min;
      if (input.max !== undefined) $set.max = input.max;
      if (input.batch !== undefined) $set.batch = input.batch.trim();
      if (input.expiry !== undefined) $set.expiry = input.expiry || null;

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $set },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as InventoryStockDocument) : null;
    },
  };
}
