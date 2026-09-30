import {
  getSoftwareAssetModel,
  type SoftwareAssetDocument,
} from "./software.model";
import { buildOrgActiveFilter, nextAssetReference, paginate } from "./shared";
import type {
  CreateSoftwareInput,
  ListAssetsQuery,
  Paginated,
  SoftwareAsset,
  SoftwareDocument,
  SoftwareKey,
  UpdateSoftwareInput,
} from "../types";
import { ASSET_REFERENCE_PREFIX } from "../types";

function mapKeys(
  keys: SoftwareAssetDocument["keys"] | undefined
): SoftwareKey[] {
  return (keys ?? []).map((key) => ({
    id: String(key._id),
    value: key.value,
    createdAt: key.createdAt ?? new Date(),
  }));
}

function mapDocuments(
  docs: SoftwareAssetDocument["documents"] | undefined
): SoftwareDocument[] {
  return (docs ?? []).map((doc) => ({
    id: String(doc._id),
    fileName: doc.fileName,
    mimeType: doc.mimeType ?? undefined,
    sizeBytes: doc.sizeBytes ?? undefined,
    storageKey: doc.storageKey ?? undefined,
    uploadedBy: doc.uploadedBy,
    uploadedAt: doc.uploadedAt ?? new Date(),
  }));
}

function toDomain(doc: SoftwareAssetDocument): SoftwareAsset {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    businessUnitId: doc.businessUnitId ?? undefined,
    categoryId: doc.categoryId ?? undefined,
    licenceCount: doc.licenceCount ?? 0,
    installCount: doc.installCount ?? 0,
    keys: mapKeys(doc.keys),
    documents: mapDocuments(doc.documents),
    cost: doc.cost ?? 0,
    createdBy: doc.createdBy,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type SoftwareDocumentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  uploadedBy: string;
};

export type SoftwareAssetRepository = {
  create: (
    organizationId: string,
    createdBy: string,
    input: CreateSoftwareInput
  ) => Promise<SoftwareAsset>;
  findById: (
    organizationId: string,
    id: string
  ) => Promise<SoftwareAsset | null>;
  list: (
    organizationId: string,
    query: ListAssetsQuery
  ) => Promise<Paginated<SoftwareAsset>>;
  update: (
    organizationId: string,
    id: string,
    input: UpdateSoftwareInput,
    uploadedBy: string
  ) => Promise<SoftwareAsset | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  addKey: (
    organizationId: string,
    id: string,
    value: string
  ) => Promise<SoftwareAsset | null>;
  removeKey: (
    organizationId: string,
    id: string,
    keyId: string
  ) => Promise<SoftwareAsset | null>;
  addDocument: (
    organizationId: string,
    id: string,
    document: SoftwareDocumentInput
  ) => Promise<SoftwareAsset | null>;
  removeDocument: (
    organizationId: string,
    id: string,
    documentId: string
  ) => Promise<SoftwareAsset | null>;
  aggregateStats: (
    organizationId: string
  ) => Promise<{ count: number; totalCost: number }>;
};

export function createSoftwareAssetRepository(): SoftwareAssetRepository {
  const model = getSoftwareAssetModel();

  return {
    async create(organizationId, createdBy, input) {
      const documents = (input.documents ?? []).map((doc) => ({
        ...doc,
        uploadedBy: createdBy,
        uploadedAt: new Date(),
      }));
      const created = await model.create({
        organizationId,
        createdBy,
        reference: nextAssetReference(ASSET_REFERENCE_PREFIX.software),
        name: input.name,
        businessUnitId: input.businessUnitId,
        categoryId: input.categoryId,
        licenceCount: input.licenceCount ?? 0,
        installCount: input.installCount ?? 0,
        keys: [],
        documents,
        cost: input.cost ?? 0,
        deletedAt: null,
      });
      return toDomain(created);
    },

    async findById(organizationId, id) {
      const doc = await model
        .findOne({ _id: id, organizationId, deletedAt: null })
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query) {
      const filter = buildOrgActiveFilter(organizationId, query, {
        searchFields: ["name", "reference"],
        supportsOwnerFilter: false,
      });
      return paginate(model, filter, query, toDomain);
    },

    async update(organizationId, id, input, uploadedBy) {
      const $set: Record<string, unknown> = {};
      const $unset: Record<string, 1> = {};
      const $push: Record<string, unknown> = {};

      if (input.name !== undefined) $set.name = input.name;
      if (input.categoryId !== undefined) {
        if (input.categoryId === null) $unset.categoryId = 1;
        else $set.categoryId = input.categoryId;
      }
      if (input.licenceCount !== undefined) $set.licenceCount = input.licenceCount;
      if (input.installCount !== undefined) $set.installCount = input.installCount;
      if (input.cost !== undefined) $set.cost = input.cost;
      if (input.documents && input.documents.length > 0) {
        $push.documents = {
          $each: input.documents.map((doc) => ({
            ...doc,
            uploadedBy,
            uploadedAt: new Date(),
          })),
        };
      }

      const update: Record<string, unknown> = {};
      if (Object.keys($set).length > 0) update.$set = $set;
      if (Object.keys($unset).length > 0) update.$unset = $unset;
      if (Object.keys($push).length > 0) update.$push = $push;

      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          update,
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

    async addKey(organizationId, id, value) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $push: { keys: { value, createdAt: new Date() } } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async removeKey(organizationId, id, keyId) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $pull: { keys: { _id: keyId } } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async addDocument(organizationId, id, document) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          {
            $push: {
              documents: {
                ...document,
                uploadedAt: new Date(),
              },
            },
          },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async removeDocument(organizationId, id, documentId) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $pull: { documents: { _id: documentId } } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async aggregateStats(organizationId) {
      const [row] = await model
        .aggregate<{ count: number; totalCost: number }>([
          { $match: { organizationId, deletedAt: null } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalCost: { $sum: "$cost" },
            },
          },
        ])
        .exec();
      return {
        count: row?.count ?? 0,
        totalCost: row?.totalCost ?? 0,
      };
    },
  };
}
