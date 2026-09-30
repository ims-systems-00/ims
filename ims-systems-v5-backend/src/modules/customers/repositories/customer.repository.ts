/**
 * Customer persistence.
 */

import { randomUUID } from "node:crypto";
import type { CustomerListScope } from "../ports";
import {
  DEFAULT_CUSTOMER_LOGO_SRC,
  type Customer,
  type CustomerAttachment,
  type CustomerLogo,
  type CustomerStage,
  type CustomerStageAnalysis,
  type CustomerStatus,
  type CustomerValueHighlight,
  type ListCustomersQuery,
  type PaginatedCustomers,
} from "../types";
import { getCustomerModel, type CustomerDocument } from "./customer.model";

function toAttachments(value: unknown): CustomerAttachment[] {
  if (!Array.isArray(value)) return [];
  return (value as CustomerAttachment[]).map((file) => ({
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

function toLogo(value: unknown): CustomerLogo {
  const logo = (value ?? {}) as Partial<CustomerLogo>;
  return {
    fileName: logo.fileName,
    storageKey: logo.storageKey,
    url: logo.url,
    src: logo.src?.trim() || DEFAULT_CUSTOMER_LOGO_SRC,
  };
}

function toDomain(doc: CustomerDocument): Customer {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    companyNumber: doc.companyNumber ?? undefined,
    businessUnitId: doc.businessUnitId ?? undefined,
    categoryId: doc.categoryId ?? undefined,
    stage: doc.stage as CustomerStage,
    status: doc.status as CustomerStatus,
    probability: doc.probability ?? 10,
    source: doc.source ?? undefined,
    phoneNumber: doc.phoneNumber ?? undefined,
    buildingName: doc.buildingName ?? undefined,
    streetName: doc.streetName ?? undefined,
    town: doc.town ?? undefined,
    postCode: doc.postCode ?? undefined,
    primaryContact: doc.primaryContact ?? undefined,
    primaryEmail: doc.primaryEmail,
    secondaryContact: doc.secondaryContact ?? undefined,
    secondaryEmail: doc.secondaryEmail ?? undefined,
    serviceProvision: doc.serviceProvision ?? undefined,
    contractValue: doc.contractValue ?? 0,
    accountManager: doc.accountManager ?? undefined,
    accountNumber: doc.accountNumber ?? undefined,
    contractStartDate: doc.contractStartDate ?? null,
    contractEndDate: doc.contractEndDate ?? null,
    reviewDate: doc.reviewDate ?? null,
    notes: doc.notes ?? undefined,
    reasonForLoss: doc.reasonForLoss ?? undefined,
    isChampion: Boolean(doc.isChampion),
    logo: toLogo(doc.logo),
    attachments: toAttachments(doc.attachments),
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
  scope: CustomerListScope
): void {
  if (scope.mode === "all") return;
  if (scope.includeUnassigned) {
    filter.$and = [
      ...(Array.isArray(filter.$and) ? filter.$and : []),
      {
        $or: [
          { businessUnitId: { $in: scope.businessUnitIds } },
          { businessUnitId: { $exists: false } },
          { businessUnitId: null },
          { businessUnitId: "" },
        ],
      },
    ];
    return;
  }
  filter.businessUnitId = { $in: scope.businessUnitIds };
}

function monthBounds(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { start, end };
}

function highlightFromDoc(
  doc: CustomerDocument | null | undefined
): CustomerValueHighlight {
  if (!doc) {
    return { name: "Not available", value: 0, stage: "" };
  }
  return {
    name: doc.name,
    value: doc.contractValue ?? 0,
    stage: doc.stage ?? "",
  };
}

export type PersistCustomerCreate = {
  reference: string;
  name: string;
  companyNumber?: string;
  businessUnitId?: string;
  categoryId?: string;
  stage: CustomerStage;
  status: CustomerStatus;
  probability: number;
  source?: string;
  phoneNumber?: string;
  buildingName?: string;
  streetName?: string;
  town?: string;
  postCode?: string;
  primaryContact?: string;
  primaryEmail: string;
  secondaryContact?: string;
  secondaryEmail?: string;
  serviceProvision?: string;
  contractValue: number;
  accountManager?: string;
  accountNumber?: string;
  contractStartDate?: Date | null;
  contractEndDate?: Date | null;
  reviewDate?: Date | null;
  notes?: string;
  reasonForLoss?: string;
  isChampion: boolean;
  logo: CustomerLogo;
  attachments: CustomerAttachment[];
  createdBy: string;
  createdOn: Date;
};

export type PersistCustomerPatch = {
  name?: string;
  companyNumber?: string | null;
  businessUnitId?: string | null;
  categoryId?: string | null;
  stage?: CustomerStage;
  status?: CustomerStatus;
  probability?: number;
  source?: string | null;
  phoneNumber?: string | null;
  buildingName?: string | null;
  streetName?: string | null;
  town?: string | null;
  postCode?: string | null;
  primaryContact?: string | null;
  primaryEmail?: string;
  secondaryContact?: string | null;
  secondaryEmail?: string | null;
  serviceProvision?: string | null;
  contractValue?: number;
  accountManager?: string | null;
  accountNumber?: string | null;
  contractStartDate?: Date | null;
  contractEndDate?: Date | null;
  reviewDate?: Date | null;
  notes?: string | null;
  reasonForLoss?: string | null;
  isChampion?: boolean;
  logo?: CustomerLogo | null;
  attachments?: CustomerAttachment[];
  updatedBy: string;
  updatedOn: Date;
};

export type ManagerCustomerAnalytics = {
  customerAnalysis: CustomerStageAnalysis[];
  contractStartedThisMonth: number;
  contractEndingThisMonth: number;
  contractReviewThisMonth: number;
  highestValueCustomer: CustomerValueHighlight;
  mostValuedLiveCustomer: CustomerValueHighlight;
  lessValuedLiveCustomer: CustomerValueHighlight;
};

export type CustomerRepository = {
  create: (
    organizationId: string,
    input: PersistCustomerCreate
  ) => Promise<Customer>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<Customer | null>;
  list: (
    organizationId: string,
    query: ListCustomersQuery,
    scope: CustomerListScope
  ) => Promise<PaginatedCustomers>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistCustomerPatch
  ) => Promise<Customer | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  managerAnalytics: (
    organizationId: string,
    managerId: string
  ) => Promise<ManagerCustomerAnalytics>;
};

export function createCustomerRepository(): CustomerRepository {
  const model = getCustomerModel();

  return {
    async create(organizationId, input) {
      const docs = await model.create([
        {
          organizationId,
          reference: input.reference,
          name: input.name,
          companyNumber: input.companyNumber,
          businessUnitId: input.businessUnitId,
          categoryId: input.categoryId,
          stage: input.stage,
          status: input.status,
          probability: input.probability,
          source: input.source,
          phoneNumber: input.phoneNumber,
          buildingName: input.buildingName,
          streetName: input.streetName,
          town: input.town,
          postCode: input.postCode,
          primaryContact: input.primaryContact,
          primaryEmail: input.primaryEmail,
          secondaryContact: input.secondaryContact,
          secondaryEmail: input.secondaryEmail,
          serviceProvision: input.serviceProvision,
          contractValue: input.contractValue,
          accountManager: input.accountManager,
          accountNumber: input.accountNumber ?? "",
          contractStartDate: input.contractStartDate ?? null,
          contractEndDate: input.contractEndDate ?? null,
          reviewDate: input.reviewDate ?? null,
          notes: input.notes ?? "",
          reasonForLoss: input.reasonForLoss,
          isChampion: input.isChampion,
          logo: input.logo,
          attachments: input.attachments,
          createdBy: input.createdBy,
          createdOn: input.createdOn,
          deletedAt: null,
        },
      ]);
      return toDomain(docs[0]! as unknown as CustomerDocument);
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
      if (query.accountManagerIds?.length) {
        filter.accountManager = { $in: query.accountManagerIds };
      }
      if (query.categoryIds?.length) {
        filter.categoryId = { $in: query.categoryIds };
      }
      if (query.stages?.length) {
        filter.stage = { $in: query.stages };
      }
      if (query.statuses?.length) {
        filter.status = { $in: query.statuses };
      }

      if (query.search && query.search.length > 0) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
          { reference: regex },
          { name: regex },
          { primaryEmail: regex },
          { serviceProvision: regex },
        ];
      }

      const sortField =
        query.sort === "name"
          ? "name"
          : query.sort === "updatedAt"
            ? "updatedAt"
            : query.sort === "reference"
              ? "reference"
              : query.sort === "stage"
                ? "stage"
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

      const assign = <K extends keyof PersistCustomerPatch>(
        key: K,
        transform?: (value: NonNullable<PersistCustomerPatch[K]>) => unknown
      ) => {
        const value = patch[key];
        if (value === undefined) return;
        if (value === null) {
          set[key as string] = null;
          return;
        }
        set[key as string] = transform
          ? transform(value as NonNullable<PersistCustomerPatch[K]>)
          : value;
      };

      assign("name");
      assign("companyNumber");
      assign("businessUnitId");
      assign("categoryId");
      assign("stage");
      assign("status");
      assign("probability");
      assign("source");
      assign("phoneNumber");
      assign("buildingName");
      assign("streetName");
      assign("town");
      assign("postCode");
      assign("primaryContact");
      assign("primaryEmail");
      assign("secondaryContact");
      assign("secondaryEmail");
      assign("serviceProvision");
      assign("contractValue");
      assign("accountManager");
      assign("accountNumber");
      assign("contractStartDate");
      assign("contractEndDate");
      assign("reviewDate");
      assign("notes");
      assign("reasonForLoss");
      assign("isChampion");
      if (patch.logo !== undefined) {
        set.logo =
          patch.logo === null
            ? { src: DEFAULT_CUSTOMER_LOGO_SRC }
            : patch.logo;
      }
      if (patch.attachments !== undefined) {
        set.attachments = patch.attachments;
      }

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

    async managerAnalytics(organizationId, managerId) {
      const base = {
        organizationId,
        deletedAt: null,
        accountManager: managerId,
      };
      const { start, end } = monthBounds();

      const [
        grouped,
        contractStartedThisMonth,
        contractEndingThisMonth,
        contractReviewThisMonth,
        highest,
        mostLive,
        leastLive,
      ] = await Promise.all([
        model
          .aggregate<{
            _id: { stage: string };
            contractValue: number;
            count: number;
          }>([
            { $match: base },
            {
              $group: {
                _id: { stage: "$stage" },
                contractValue: { $sum: "$contractValue" },
                count: { $sum: 1 },
              },
            },
          ])
          .exec(),
        model
          .countDocuments({
            ...base,
            contractStartDate: { $gte: start, $lte: end },
          })
          .exec(),
        model
          .countDocuments({
            ...base,
            contractEndDate: { $gte: start, $lte: end },
          })
          .exec(),
        model
          .countDocuments({
            ...base,
            reviewDate: { $gte: start, $lte: end },
          })
          .exec(),
        model.find(base).sort({ contractValue: -1 }).limit(1).exec(),
        model
          .find({ ...base, stage: "Live" })
          .sort({ contractValue: -1 })
          .limit(1)
          .exec(),
        model
          .find({ ...base, stage: "Live" })
          .sort({ contractValue: 1 })
          .limit(1)
          .exec(),
      ]);

      return {
        customerAnalysis: grouped.map((row) => ({
          stage: row._id.stage,
          count: row.count,
          contractValue: row.contractValue,
        })),
        contractStartedThisMonth,
        contractEndingThisMonth,
        contractReviewThisMonth,
        highestValueCustomer: highlightFromDoc(highest[0]),
        mostValuedLiveCustomer: highlightFromDoc(mostLive[0]),
        lessValuedLiveCustomer: highlightFromDoc(leastLive[0]),
      };
    },
  };
}

export function newAttachmentId(): string {
  return randomUUID();
}
