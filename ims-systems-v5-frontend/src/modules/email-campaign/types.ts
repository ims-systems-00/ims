/**
 * Email Campaign (CRM) frontend types.
 * Spec: docs/module-specifications/email-campaign.md
 */

import { CUSTOMER_STAGES, type CustomerStage } from "@/modules/customers/types";

export { CUSTOMER_STAGES };
export type { CustomerStage };

export const CAMPAIGN_STATUSES = ["Draft", "Queued", "Sent"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type CampaignAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type AttachmentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

export type CustomAudienceEntry = {
  customerId: string;
  name: string;
  reference: string;
};

export type SentFrom = {
  name: string;
  email: string;
};

export type EmailCampaign = {
  id: string;
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
  launchedAt: string | null;
  totalCustomers: number;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignRecipient = {
  name: string;
  email: string;
};

export type CampaignDelivery = {
  id: string;
  organizationId: string;
  campaignId: string;
  recipients: CampaignRecipient[];
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmailCampaignInput = {
  name: string;
  businessUnitId: string;
  target?: CustomerStage[];
  customAudience?: CustomAudienceEntry[];
  subject: string;
  message: string;
  attachments?: AttachmentInput[];
  bundleId?: string;
};

export type UpdateEmailCampaignInput = {
  businessUnitId?: string;
  target?: CustomerStage[];
  customAudience?: CustomAudienceEntry[];
  subject?: string;
  message?: string;
  attachments?: AttachmentInput[];
};

export type ListEmailCampaignsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  statuses?: CampaignStatus[];
  businessUnitIds?: string[];
  closed?: boolean;
  sort?: "createdOn" | "updatedAt" | "reference" | "status" | "launchedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedEmailCampaigns = {
  items: EmailCampaign[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CampaignOverview = {
  totalCustomers: number;
  totalRecipients: number;
};

export type PaginatedDeliveries = {
  items: CampaignDelivery[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
