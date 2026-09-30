/**
 * Supplier persistence.
 */

import { randomUUID } from "node:crypto";
import type { SupplierListScope } from "../ports";
import {
  deriveIsCompliant,
  type ListSuppliersQuery,
  type PaginatedSuppliers,
  type Supplier,
  type SupplierAttachment,
  type SupplierKpiObjective,
  type SupplierStats,
} from "../types";
import { getSupplierModel, type SupplierDocument } from "./supplier.model";

function toAttachments(value: unknown): SupplierAttachment[] {
  if (!Array.isArray(value)) return [];
  return (value as SupplierAttachment[]).map((file) => ({
    id: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    url: file.url,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt,
  }));
}

function toKpis(value: unknown): SupplierKpiObjective[] {
  if (!Array.isArray(value)) return [];
  return (value as SupplierKpiObjective[]).map((entry) => ({
    id: entry.id,
    value: entry.value,
  }));
}

function toDomain(doc: SupplierDocument): Supplier {
  const slaFiles = toAttachments(doc.slaFiles);
  const contractFiles = toAttachments(doc.contractFiles);
  const onboardingFiles = toAttachments(doc.onboardingFiles);
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    businessUnitId: doc.businessUnitId ?? undefined,
    accountManager: doc.accountManager,
    accountNumber: doc.accountNumber,
    email: doc.email,
    buyerId: doc.buyerId ?? undefined,
    serviceProvision: doc.serviceProvision,
    contractValue: doc.contractValue ?? 0,
    contractStartDate: doc.contractStartDate,
    contractEndDate: doc.contractEndDate ?? null,
    reviewDate: doc.reviewDate ?? null,
    slaFiles,
    contractFiles,
    onboardingFiles,
    kpiObjectives: toKpis(doc.kpiObjectives),
    isCompliant:
      typeof doc.isCompliant === "boolean"
        ? doc.isCompliant
        : deriveIsCompliant({ slaFiles, contractFiles }),
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function applyListScope(
  filter: Record<string, unknown>,
  scope: SupplierListScope
): void {
  if (scope.mode === "all") return;
  filter.businessUnitId = { $in: scope.businessUnitIds };
}

export type PersistSupplierCreate = {
  reference: string;
  name: string;
  businessUnitId?: string;
  accountManager: string;
  accountNumber: string;
  email: string;
  buyerId?: string;
  serviceProvision: string;
  contractValue: number;
  contractStartDate: Date;
  contractEndDate?: Date | null;
  reviewDate?: Date | null;
  slaFiles: SupplierAttachment[];
  contractFiles: SupplierAttachment[];
  onboardingFiles: SupplierAttachment[];
  kpiObjectives: SupplierKpiObjective[];
  isCompliant: boolean;
  createdBy: string;
  createdOn: Date;
};

export type PersistSupplierPatch = {
  name?: string;
  accountManager?: string;
  accountNumber?: string;
  email?: string;
  buyerId?: string | null;
  serviceProvision?: string;
  contractValue?: number;
  contractStartDate?: Date;
  contractEndDate?: Date | null;
  reviewDate?: Date | null;
  slaFiles?: SupplierAttachment[];
  contractFiles?: SupplierAttachment[];
  onboardingFiles?: SupplierAttachment[];
  kpiObjectives?: SupplierKpiObjective[];
  isCompliant?: boolean;
  updatedBy: string;
  updatedOn: Date;
};

export type SupplierRepository = {
  create: (
    organizationId: string,
    input: PersistSupplierCreate
  ) => Promise<Supplier>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<Supplier | null>;
  list: (
    organizationId: string,
    query: ListSuppliersQuery,
    scope: SupplierListScope
  ) => Promise<PaginatedSuppliers>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistSupplierPatch
  ) => Promise<Supplier | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  statsAggregate: (
    organizationId: string,
    scope: SupplierListScope
  ) => Promise<{
    total: number;
    compliant: number;
    procurementValue: number;
  }>;
};

export function createSupplierRepository(): SupplierRepository {
  const model = getSupplierModel();

  return {
    async create(organizationId, input) {
      const docs = await model.create([
        {
          organizationId,
          reference: input.reference,
          name: input.name,
          businessUnitId: input.businessUnitId,
          accountManager: input.accountManager,
          accountNumber: input.accountNumber,
          email: input.email,
          buyerId: input.buyerId,
          serviceProvision: input.serviceProvision,
          contractValue: input.contractValue,
          contractStartDate: input.contractStartDate,
          contractEndDate: input.contractEndDate ?? null,
          reviewDate: input.reviewDate ?? null,
          slaFiles: input.slaFiles,
          contractFiles: input.contractFiles,
          onboardingFiles: input.onboardingFiles,
          kpiObjectives: input.kpiObjectives,
          isCompliant: input.isCompliant,
          createdBy: input.createdBy,
          createdOn: input.createdOn,
          deletedAt: null,
        },
      ]);
      return toDomain(docs[0]! as unknown as SupplierDocument);
    },

    async findById(organizationId, id, options = {}) {
      const filter: Record<string, unknown> = { _id: id, organizationId };
      if (!options.includeDeleted) filter.deletedAt = null;
      const doc = await model.findOne(filter).exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query, scope) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);

      if (query.businessUnitIds?.length) {
        filter.businessUnitId = { $in: query.businessUnitIds };
      }
      if (query.createdByIds?.length) {
        filter.createdBy = { $in: query.createdByIds };
      }
      if (query.buyerIds?.length) {
        filter.buyerId = { $in: query.buyerIds };
      }
      if (query.isCompliant !== undefined) {
        filter.isCompliant = query.isCompliant;
      }

      if (query.search && query.search.length > 0) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
          { reference: regex },
          { name: regex },
          { email: regex },
          { serviceProvision: regex },
          { accountManager: regex },
          { accountNumber: regex },
        ];
      }

      const sortField =
        query.sort === "name"
          ? "name"
          : query.sort === "updatedAt"
            ? "updatedAt"
            : query.sort === "reference"
              ? "reference"
              : query.sort === "contractValue"
                ? "contractValue"
                : query.sort === "contractEndDate"
                  ? "contractEndDate"
                  : query.sort === "reviewDate"
                    ? "reviewDate"
                    : "createdOn";
      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;

      const [items, total] = await Promise.all([
        model
          .find(filter)
          .sort({ [sortField]: sortDir })
          .skip(skip)
          .limit(query.pageSize)
          .exec(),
        model.countDocuments(filter).exec(),
      ]);

      return {
        items: items.map(toDomain),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    async update(organizationId, id, patch) {
      const set: Record<string, unknown> = {
        updatedBy: patch.updatedBy,
        updatedOn: patch.updatedOn,
      };
      if (patch.name !== undefined) set.name = patch.name;
      if (patch.accountManager !== undefined) {
        set.accountManager = patch.accountManager;
      }
      if (patch.accountNumber !== undefined) {
        set.accountNumber = patch.accountNumber;
      }
      if (patch.email !== undefined) set.email = patch.email;
      if (patch.buyerId !== undefined) {
        set.buyerId = patch.buyerId === null ? undefined : patch.buyerId;
      }
      if (patch.serviceProvision !== undefined) {
        set.serviceProvision = patch.serviceProvision;
      }
      if (patch.contractValue !== undefined) {
        set.contractValue = patch.contractValue;
      }
      if (patch.contractStartDate !== undefined) {
        set.contractStartDate = patch.contractStartDate;
      }
      if (patch.contractEndDate !== undefined) {
        set.contractEndDate = patch.contractEndDate;
      }
      if (patch.reviewDate !== undefined) set.reviewDate = patch.reviewDate;
      if (patch.slaFiles !== undefined) set.slaFiles = patch.slaFiles;
      if (patch.contractFiles !== undefined) {
        set.contractFiles = patch.contractFiles;
      }
      if (patch.onboardingFiles !== undefined) {
        set.onboardingFiles = patch.onboardingFiles;
      }
      if (patch.kpiObjectives !== undefined) {
        set.kpiObjectives = patch.kpiObjectives;
      }
      if (patch.isCompliant !== undefined) set.isCompliant = patch.isCompliant;

      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $set: set },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async softDelete(organizationId, id) {
      const result = await model
        .updateOne(
          { _id: id, organizationId, deletedAt: null },
          { $set: { deletedAt: new Date() } }
        )
        .exec();
      return result.modifiedCount === 1;
    },

    async statsAggregate(organizationId, scope) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);

      const docs = await model
        .find(filter)
        .select({ isCompliant: 1, contractValue: 1 })
        .lean()
        .exec();

      let compliant = 0;
      let procurementValue = 0;
      for (const doc of docs) {
        if (doc.isCompliant) compliant += 1;
        procurementValue += typeof doc.contractValue === "number"
          ? doc.contractValue
          : 0;
      }

      return {
        total: docs.length,
        compliant,
        procurementValue,
      };
    },
  };
}

export function newAttachmentId(): string {
  return randomUUID();
}

export function newKpiId(): string {
  return randomUUID();
}

export type { SupplierStats };
