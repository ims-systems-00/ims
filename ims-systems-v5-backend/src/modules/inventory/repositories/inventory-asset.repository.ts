import type {
  CreateInventoryAssetInput,
  InventoryAsset,
  InventoryCheckRecord,
  InventoryDisposal,
  InventoryHistoryEntry,
  ListInventoryAssetsQuery,
  UpdateInventoryAssetInput,
} from "../types";
import {
  getInventoryAssetModel,
  type InventoryAssetDocument,
} from "./inventory-asset.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toChecks(
  raw: unknown
): Record<string, InventoryCheckRecord> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, InventoryCheckRecord> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    if (typeof v.date !== "string" || typeof v.result !== "string") continue;
    out[key] = {
      date: v.date,
      result: v.result as InventoryCheckRecord["result"],
      by: String(v.by ?? ""),
      ref: String(v.ref ?? ""),
      fileId: (v.fileId as string | null | undefined) ?? null,
      note: typeof v.note === "string" ? v.note : undefined,
    };
  }
  return out;
}

function toDomain(doc: InventoryAssetDocument): InventoryAsset {
  const disposal = doc.disposal
    ? {
        reason: doc.disposal.reason ?? "",
        route: doc.disposal.route ?? "",
        evidence: doc.disposal.evidence ?? "",
        approvedBy: doc.disposal.approvedBy ?? "",
        date: doc.disposal.date,
        wipeCert: doc.disposal.wipeCert ?? undefined,
      }
    : null;

  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    tag: doc.tag,
    name: doc.name,
    category: doc.category,
    location: doc.location ?? "",
    custodian: doc.custodian ?? "",
    stage: doc.stage as InventoryAsset["stage"],
    criticality: doc.criticality as InventoryAsset["criticality"],
    makeModel: doc.makeModel ?? "",
    serial: doc.serial ?? "",
    purchaseDate: doc.purchaseDate ?? null,
    cost: doc.cost ?? null,
    supplier: doc.supplier ?? "",
    warrantyEnds: doc.warrantyEnds ?? null,
    informationAsset: Boolean(doc.informationAsset),
    safetyNotes: doc.safetyNotes ?? "",
    labelPrinted: Boolean(doc.labelPrinted),
    checks: toChecks(doc.checks),
    history: (doc.history ?? []).map((h) => ({
      t: h.t,
      by: h.by,
      what: h.what,
    })),
    disposal,
    createdBy: doc.createdBy,
    createdOn: iso(doc.createdOn) ?? new Date().toISOString(),
    updatedBy: doc.updatedBy ?? null,
    updatedOn: iso(doc.updatedOn),
    deletedAt: iso(doc.deletedAt),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type InventoryAssetRepository = ReturnType<
  typeof createInventoryAssetRepository
>;

export function createInventoryAssetRepository() {
  const Model = getInventoryAssetModel();

  return {
    async create(
      organizationId: string,
      input: CreateInventoryAssetInput & {
        createdBy: string;
        history: InventoryHistoryEntry[];
        stage: InventoryAsset["stage"];
        criticality: InventoryAsset["criticality"];
      }
    ): Promise<InventoryAsset> {
      const now = new Date();
      const doc = await Model.create({
        organizationId,
        tag: input.tag.trim().toUpperCase(),
        name: input.name.trim(),
        category: input.category.trim(),
        location: input.location?.trim() ?? "",
        custodian: input.custodian?.trim() ?? "",
        stage: input.stage,
        criticality: input.criticality,
        makeModel: input.makeModel?.trim() ?? "",
        serial: input.serial?.trim() ?? "",
        purchaseDate: input.purchaseDate || null,
        cost: input.cost ?? null,
        supplier: input.supplier?.trim() ?? "",
        warrantyEnds: input.warrantyEnds || null,
        informationAsset: Boolean(input.informationAsset),
        safetyNotes: input.safetyNotes?.trim() ?? "",
        labelPrinted: Boolean(input.labelPrinted),
        checks: {},
        history: input.history,
        disposal: null,
        createdBy: input.createdBy,
        createdOn: now,
        updatedBy: null,
        updatedOn: null,
        deletedAt: null,
      });
      return toDomain(doc.toObject() as InventoryAssetDocument);
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<InventoryAsset | null> {
      const doc = await Model.findOne({
        _id: id,
        organizationId,
        deletedAt: null,
      }).lean();
      return doc ? toDomain(doc as InventoryAssetDocument) : null;
    },

    async findByTag(
      organizationId: string,
      tag: string
    ): Promise<InventoryAsset | null> {
      const doc = await Model.findOne({
        organizationId,
        tag: tag.trim().toUpperCase(),
        deletedAt: null,
      }).lean();
      return doc ? toDomain(doc as InventoryAssetDocument) : null;
    },

    async listTags(organizationId: string): Promise<string[]> {
      const rows = await Model.find(
        { organizationId, deletedAt: null },
        { tag: 1 }
      ).lean();
      return rows.map((r) => String(r.tag));
    },

    async listAll(
      organizationId: string,
      opts?: { includeDisposed?: boolean }
    ): Promise<InventoryAsset[]> {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      if (!opts?.includeDisposed) {
        filter.stage = { $ne: "Disposed" };
      }
      const docs = await Model.find(filter).sort({ tag: 1 }).lean();
      return docs.map((d) => toDomain(d as InventoryAssetDocument));
    },

    async list(
      organizationId: string,
      query: ListInventoryAssetsQuery
    ): Promise<{
      items: InventoryAsset[];
      total: number;
      page: number;
      pageSize: number;
    }> {
      const page = query.page && query.page > 0 ? query.page : 1;
      const pageSize =
        query.pageSize && query.pageSize > 0
          ? Math.min(query.pageSize, 100)
          : 25;

      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      if (!query.includeDisposed) {
        filter.stage = { $ne: "Disposed" };
      }
      if (query.category) filter.category = query.category;
      if (query.stage) filter.stage = query.stage;
      if (query.site) {
        filter.location = { $regex: query.site, $options: "i" };
      }
      if (query.search?.trim()) {
        const q = query.search.trim();
        filter.$or = [
          { tag: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
          { serial: { $regex: q, $options: "i" } },
          { location: { $regex: q, $options: "i" } },
          { custodian: { $regex: q, $options: "i" } },
        ];
      }

      const [total, docs] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
          .sort({ tag: 1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
      ]);

      return {
        items: docs.map((d) => toDomain(d as InventoryAssetDocument)),
        total,
        page,
        pageSize,
      };
    },

    async replace(
      organizationId: string,
      id: string,
      asset: InventoryAsset,
      actorId: string
    ): Promise<InventoryAsset | null> {
      const now = new Date();
      const disposal: InventoryDisposal | null = asset.disposal;
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        {
          $set: {
            tag: asset.tag.trim().toUpperCase(),
            name: asset.name.trim(),
            category: asset.category,
            location: asset.location,
            custodian: asset.custodian,
            stage: asset.stage,
            criticality: asset.criticality,
            makeModel: asset.makeModel,
            serial: asset.serial,
            purchaseDate: asset.purchaseDate,
            cost: asset.cost,
            supplier: asset.supplier,
            warrantyEnds: asset.warrantyEnds,
            informationAsset: asset.informationAsset,
            safetyNotes: asset.safetyNotes,
            labelPrinted: asset.labelPrinted,
            checks: asset.checks,
            history: asset.history,
            disposal,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as InventoryAssetDocument) : null;
    },

    async updateFields(
      organizationId: string,
      id: string,
      input: UpdateInventoryAssetInput,
      actorId: string
    ): Promise<InventoryAsset | null> {
      const $set: Record<string, unknown> = {
        updatedBy: actorId,
        updatedOn: new Date(),
      };
      if (input.tag !== undefined) $set.tag = input.tag.trim().toUpperCase();
      if (input.name !== undefined) $set.name = input.name.trim();
      if (input.category !== undefined) $set.category = input.category.trim();
      if (input.location !== undefined) $set.location = input.location.trim();
      if (input.custodian !== undefined) $set.custodian = input.custodian.trim();
      if (input.stage !== undefined) $set.stage = input.stage;
      if (input.criticality !== undefined) $set.criticality = input.criticality;
      if (input.makeModel !== undefined) $set.makeModel = input.makeModel.trim();
      if (input.serial !== undefined) $set.serial = input.serial.trim();
      if (input.purchaseDate !== undefined) {
        $set.purchaseDate = input.purchaseDate || null;
      }
      if (input.cost !== undefined) $set.cost = input.cost;
      if (input.supplier !== undefined) $set.supplier = input.supplier.trim();
      if (input.warrantyEnds !== undefined) {
        $set.warrantyEnds = input.warrantyEnds || null;
      }
      if (input.informationAsset !== undefined) {
        $set.informationAsset = input.informationAsset;
      }
      if (input.safetyNotes !== undefined) {
        $set.safetyNotes = input.safetyNotes.trim();
      }
      if (input.labelPrinted !== undefined) {
        $set.labelPrinted = input.labelPrinted;
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $set },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as InventoryAssetDocument) : null;
    },

    async markLabelled(
      organizationId: string,
      ids: string[],
      actorId: string
    ): Promise<number> {
      if (!ids.length) return 0;
      const result = await Model.updateMany(
        { _id: { $in: ids }, organizationId, deletedAt: null },
        {
          $set: {
            labelPrinted: true,
            updatedBy: actorId,
            updatedOn: new Date(),
          },
        }
      );
      return result.modifiedCount ?? 0;
    },
  };
}
