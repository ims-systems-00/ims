/**
 * Email Campaign persistence.
 */

import { randomUUID } from "node:crypto";
import type {
  CampaignAttachment,
  CampaignStatus,
  CustomAudienceEntry,
  EmailCampaign,
  ListEmailCampaignsQuery,
  ManagerCampaignStats,
  PaginatedEmailCampaigns,
  SentFrom,
  CustomerStage,
} from "../types";
import {
  getEmailCampaignModel,
  type EmailCampaignDocument,
} from "./email-campaign.model";

export function newAttachmentId(): string {
  return randomUUID();
}

export function newBundleId(): string {
  return randomUUID();
}

function toAttachments(value: unknown): CampaignAttachment[] {
  if (!Array.isArray(value)) return [];
  return (value as CampaignAttachment[]).map((file) => ({
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

function toCustomAudience(value: unknown): CustomAudienceEntry[] {
  if (!Array.isArray(value)) return [];
  return (value as CustomAudienceEntry[]).map((entry) => ({
    customerId: entry.customerId,
    name: entry.name,
    reference: entry.reference,
  }));
}

function toDomain(doc: EmailCampaignDocument): EmailCampaign {
  const sentFrom = doc.sentFrom as SentFrom;
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    businessUnitId: doc.businessUnitId,
    target: (doc.target ?? []) as CustomerStage[],
    customAudience: toCustomAudience(doc.customAudience),
    subject: doc.subject,
    message: doc.message,
    attachments: toAttachments(doc.attachments),
    status: doc.status as CampaignStatus,
    closed: Boolean(doc.closed),
    rootCampaign: Boolean(doc.rootCampaign),
    bundleId: doc.bundleId,
    sentFrom: {
      name: sentFrom?.name ?? "",
      email: sentFrom?.email ?? "",
    },
    launchedAt: doc.launchedAt ?? null,
    totalCustomers: doc.totalCustomers ?? 0,
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type CreateCampaignRecord = {
  organizationId: string;
  reference: string;
  name: string;
  businessUnitId: string;
  target: CustomerStage[];
  customAudience: CustomAudienceEntry[];
  subject: string;
  message: string;
  attachments: CampaignAttachment[];
  status: CampaignStatus;
  closed: boolean;
  rootCampaign: boolean;
  bundleId: string;
  sentFrom: SentFrom;
  createdBy: string;
  createdOn: Date;
};

export type UpdateCampaignRecord = {
  businessUnitId?: string;
  target?: CustomerStage[];
  customAudience?: CustomAudienceEntry[];
  subject?: string;
  message?: string;
  attachments?: CampaignAttachment[];
  status?: CampaignStatus;
  closed?: boolean;
  launchedAt?: Date | null;
  totalCustomers?: number;
  updatedBy: string;
  updatedOn: Date;
};

export type EmailCampaignRepository = ReturnType<
  typeof createEmailCampaignRepository
>;

export function createEmailCampaignRepository() {
  return {
    async create(input: CreateCampaignRecord): Promise<EmailCampaign> {
      const Model = getEmailCampaignModel();
      const doc = await Model.create(input);
      return toDomain(doc.toObject() as EmailCampaignDocument);
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<EmailCampaign | null> {
      const Model = getEmailCampaignModel();
      const doc = await Model.findOne({
        _id: id,
        organizationId,
        deletedAt: null,
      }).lean();
      if (!doc) return null;
      return toDomain(doc as EmailCampaignDocument);
    },

    async list(
      organizationId: string,
      query: ListEmailCampaignsQuery
    ): Promise<PaginatedEmailCampaigns> {
      const Model = getEmailCampaignModel();
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };

      if (query.search?.trim()) {
        const term = query.search.trim();
        filter.$or = [
          { reference: { $regex: term, $options: "i" } },
          { name: { $regex: term, $options: "i" } },
          { subject: { $regex: term, $options: "i" } },
        ];
      }
      if (query.statuses?.length) {
        filter.status = { $in: query.statuses };
      }
      if (query.businessUnitIds?.length) {
        filter.businessUnitId = { $in: query.businessUnitIds };
      }
      if (query.closed !== undefined) {
        filter.closed = query.closed;
      }

      const sortField = query.sort ?? "createdOn";
      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;

      const [total, docs] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
          .sort({ [sortField]: sortDir })
          .skip(skip)
          .limit(query.pageSize)
          .lean(),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      return {
        items: docs.map((doc) => toDomain(doc as EmailCampaignDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      };
    },

    async update(
      organizationId: string,
      id: string,
      patch: UpdateCampaignRecord
    ): Promise<EmailCampaign | null> {
      const Model = getEmailCampaignModel();
      const { attachments, ...rest } = patch;
      const update: Record<string, unknown> = { ...rest };
      if (attachments?.length) {
        update.$push = { attachments: { $each: attachments } };
      }
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        update,
        { new: true }
      ).lean();
      if (!doc) return null;
      return toDomain(doc as EmailCampaignDocument);
    },

    async softDelete(
      organizationId: string,
      id: string
    ): Promise<boolean> {
      const Model = getEmailCampaignModel();
      const result = await Model.updateOne(
        { _id: id, organizationId, deletedAt: null },
        { deletedAt: new Date() }
      );
      return result.modifiedCount > 0;
    },

    async closeBundle(
      organizationId: string,
      bundleId: string
    ): Promise<number> {
      const Model = getEmailCampaignModel();
      const result = await Model.updateMany(
        { organizationId, bundleId, deletedAt: null },
        { closed: true, updatedOn: new Date() }
      );
      return result.modifiedCount;
    },

    async removeAttachment(
      organizationId: string,
      id: string,
      attachmentId: string
    ): Promise<EmailCampaign | null> {
      const Model = getEmailCampaignModel();
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $pull: { attachments: { id: attachmentId } } },
        { new: true }
      ).lean();
      if (!doc) return null;
      return toDomain(doc as EmailCampaignDocument);
    },

    async getManagerStats(
      organizationId: string,
      managerId: string
    ): Promise<ManagerCampaignStats> {
      const Model = getEmailCampaignModel();
      const base = {
        organizationId,
        deletedAt: null,
        createdBy: managerId,
      };

      const [activeCampaign, closedCampaign, latest, monthly] =
        await Promise.all([
          Model.countDocuments({ ...base, closed: false }),
          Model.countDocuments({ ...base, closed: true }),
          Model.findOne(base).sort({ createdOn: -1 }).lean(),
          Model.aggregate<{ _id: string; count: number }>([
            { $match: base },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m", date: "$createdOn" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 6 },
          ]),
        ]);

      const months: Array<{ month: string; count: number }> = [];
      const now = new Date();
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const found = monthly.find((m) => m._id === key);
        months.push({
          month: d.toLocaleString("en", { month: "short" }),
          count: found?.count ?? 0,
        });
      }

      return {
        activeCampaign,
        closedCampaign,
        monthlyCampaign: months,
        latestCampaign: latest
          ? (latest as EmailCampaignDocument).name
          : "No recent campaign",
      };
    },
  };
}
