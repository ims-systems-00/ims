import { randomUUID } from "node:crypto";
import type {
  AslComm,
  AslDocument,
  AslEvaluation,
  AslSupplier,
  AslTrailEntry,
  CreateAslSupplierInput,
  ListAslSuppliersQuery,
  PaginatedAslSuppliers,
  UpdateAslSupplierInput,
} from "../types";
import {
  getAslSupplierModel,
  type AslSupplierDocument,
} from "./asl-supplier.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: AslSupplierDocument): AslSupplier {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    cat: doc.cat,
    crit: doc.crit as AslSupplier["crit"],
    status: doc.status as AslSupplier["status"],
    contact: doc.contact ?? "",
    email: doc.email ?? "",
    stds: [...(doc.stds ?? [])],
    scope: doc.scope ?? "",
    reqs: doc.reqs ?? "",
    appby: doc.appby ?? "",
    appon: doc.appon ?? null,
    docs: (doc.docs ?? []).map((d) => ({
      id: d.id,
      type: d.type,
      exp: d.exp ?? null,
      ref: d.ref ?? "",
      req: Boolean(d.req),
      chased: d.chased ?? null,
      file: d.file
        ? {
            Name: d.file.Name,
            Key: d.file.Key,
            key: d.file.key ?? undefined,
            Bucket: d.file.Bucket,
            Size: d.file.Size ?? undefined,
          }
        : null,
    })),
    evals: (doc.evals ?? []).map((e) => ({
      id: e.id,
      date: e.date,
      by: e.by,
      scores: { ...(e.scores as Record<string, number>) },
      note: e.note ?? "",
      score: e.score,
    })),
    comms: (doc.comms ?? []).map((c) => ({
      id: c.id,
      date: c.date,
      type: c.type,
      subject: c.subject,
      by: c.by,
      outcome: c.outcome ?? "",
    })),
    trail: (doc.trail ?? []).map((t) => ({
      t: t.t,
      by: t.by,
      what: t.what,
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

export function newEmbeddedId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export type AslSupplierRepository = ReturnType<typeof createAslSupplierRepository>;

export function createAslSupplierRepository() {
  const Model = getAslSupplierModel();

  return {
    async create(
      organizationId: string,
      input: CreateAslSupplierInput & {
        reference: string;
        createdBy: string;
        trail: AslTrailEntry[];
      }
    ): Promise<AslSupplier> {
      const now = new Date();
      const doc = await Model.create({
        organizationId,
        reference: input.reference,
        name: input.name.trim(),
        cat: input.cat ?? "Raw materials",
        crit: input.crit ?? "Standard",
        status: "Prospective",
        contact: input.contact ?? "",
        email: input.email ?? "",
        stds: input.stds ?? ["ISO 9001"],
        scope: input.scope ?? "",
        reqs: input.reqs ?? "",
        appby: "",
        appon: null,
        docs: [],
        evals: [],
        comms: [],
        trail: input.trail,
        createdBy: input.createdBy,
        createdOn: now,
        updatedBy: null,
        updatedOn: null,
        deletedAt: null,
      });
      return toDomain(doc.toObject() as AslSupplierDocument);
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<AslSupplier | null> {
      const doc = await Model.findOne({
        _id: id,
        organizationId,
        deletedAt: null,
      }).lean();
      return doc ? toDomain(doc as AslSupplierDocument) : null;
    },

    async findByIdIncludingDeleted(
      organizationId: string,
      id: string
    ): Promise<AslSupplier | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as AslSupplierDocument) : null;
    },

    async listAllLive(organizationId: string): Promise<AslSupplier[]> {
      const docs = await Model.find({
        organizationId,
        deletedAt: null,
        status: { $ne: "Removed" },
      })
        .sort({ name: 1 })
        .lean();
      return docs.map((d) => toDomain(d as AslSupplierDocument));
    },

    async listAllInOrg(organizationId: string): Promise<AslSupplier[]> {
      const docs = await Model.find({
        organizationId,
        deletedAt: null,
      })
        .sort({ name: 1 })
        .lean();
      return docs.map((d) => toDomain(d as AslSupplierDocument));
    },

    async list(
      organizationId: string,
      query: ListAslSuppliersQuery
    ): Promise<PaginatedAslSuppliers> {
      const page = query.page ?? 1;
      const pageSize = Math.min(query.pageSize ?? 25, 100);
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      if (!query.includeRemoved && !query.status) {
        filter.status = { $ne: "Removed" };
      }
      if (query.status) filter.status = query.status;
      if (query.crit) filter.crit = query.crit;
      if (query.search?.trim()) {
        const q = query.search.trim();
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { cat: { $regex: q, $options: "i" } },
          { contact: { $regex: q, $options: "i" } },
        ];
      }

      // issue filter applied in service after rules (needs settings)
      const [total, docs] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
          .sort({ name: 1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
      ]);

      return {
        items: docs.map((d) => toDomain(d as AslSupplierDocument)),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    },

    async replace(
      organizationId: string,
      id: string,
      supplier: AslSupplier,
      actorId: string
    ): Promise<AslSupplier | null> {
      const now = new Date();
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        {
          $set: {
            name: supplier.name,
            cat: supplier.cat,
            crit: supplier.crit,
            status: supplier.status,
            contact: supplier.contact,
            email: supplier.email,
            stds: supplier.stds,
            scope: supplier.scope,
            reqs: supplier.reqs,
            appby: supplier.appby,
            appon: supplier.appon,
            docs: supplier.docs,
            evals: supplier.evals,
            comms: supplier.comms,
            trail: supplier.trail,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as AslSupplierDocument) : null;
    },

    async softDelete(
      organizationId: string,
      id: string,
      actorId: string
    ): Promise<boolean> {
      const now = new Date();
      const result = await Model.updateOne(
        { _id: id, organizationId, deletedAt: null },
        {
          $set: {
            deletedAt: now,
            updatedBy: actorId,
            updatedOn: now,
            status: "Removed",
          },
        }
      );
      return result.modifiedCount > 0;
    },

    async listOrganizationIds(): Promise<string[]> {
      return Model.distinct("organizationId");
    },
  };
}

export type PatchFields = UpdateAslSupplierInput;

export type { AslDocument, AslEvaluation, AslComm, AslTrailEntry };
