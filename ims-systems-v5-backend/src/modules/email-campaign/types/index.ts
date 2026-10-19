/**
 * Email Campaign (CRM) domain types.
 * Spec: docs/module-specifications/email-campaign.md
 */

import {
  CUSTOMER_STAGES,
  type CustomerStage,
} from "../../customers/types";

export { CUSTOMER_STAGES };
export type { CustomerStage };

export const CAMPAIGN_STATUSES = ["Draft", "Queued", "Sent"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Authz uses customers resource (V4 CRM → V5 customers). */
export const EMAIL_CAMPAIGNS_RESOURCE = "customers";

export type CampaignAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: Date;
};

export type AttachmentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

/** Snapshot of a hand-picked customer for additional audience. */
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
  launchedAt: Date | null;
  totalCustomers: number;
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
};

export type CreateEmailCampaignInput = {
  name: string;
  businessUnitId: string;
  target?: CustomerStage[];
  customAudience?: CustomAudienceEntry[];
  subject: string;
  message: string;
  attachments?: AttachmentInput[];
  /** When set, new instance shares this bundle (save-modified). */
  bundleId?: string;
};

export type UpdateEmailCampaignInput = {
  businessUnitId?: string;
  target?: CustomerStage[];
  customAudience?: CustomAudienceEntry[];
  subject?: string;
  message?: string;
  /** Appended on update. */
  attachments?: AttachmentInput[];
};

export type ListEmailCampaignsQuery = {
  page: number;
  pageSize: number;
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

export type ManagerCampaignStats = {
  activeCampaign: number;
  closedCampaign: number;
  monthlyCampaign: Array<{ month: string; count: number }>;
  latestCampaign: string;
};

export function isCampaignStatus(value: string): value is CampaignStatus {
  return (CAMPAIGN_STATUSES as readonly string[]).includes(value);
}
