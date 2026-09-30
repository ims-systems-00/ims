/**
 * Management Review frontend types — aligned with `/api/v1/management-reviews`.
 */

export const REVIEW_INTERVALS = [
  "Monthly",
  "Quarterly",
  "Half yearly",
  "Yearly",
] as const;
export type ReviewInterval = (typeof REVIEW_INTERVALS)[number];

export const REVIEW_PRIVACY = ["Organisational", "Business unit"] as const;
export type ReviewPrivacy = (typeof REVIEW_PRIVACY)[number];

export type ReviewDisplayStatus = "Scheduled" | "Completed";

export type LifecycleFlag = {
  status: boolean;
  by: string | null;
  on: string | null;
};

export type ReviewAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type ManagementReview = {
  id: string;
  organizationId: string;
  reference: string;
  title: string;
  date: string;
  time?: string;
  interval: ReviewInterval;
  privacy: ReviewPrivacy;
  businessUnitId?: string;
  attendees: string[];
  agenda: ReviewAttachment[];
  minutes: ReviewAttachment[];
  completed: LifecycleFlag;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  displayStatus: ReviewDisplayStatus;
};

export type AttachmentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

export type CreateManagementReviewInput = {
  title: string;
  date: string;
  interval: ReviewInterval;
  privacy?: ReviewPrivacy;
  businessUnitId?: string;
  time?: string;
  attendees?: string[];
  agenda?: AttachmentInput[];
  minutes?: AttachmentInput[];
};

export type UpdateManagementReviewInput = {
  title?: string;
  date?: string;
  time?: string | null;
  privacy?: ReviewPrivacy;
  attendees?: string[];
  agenda?: AttachmentInput[];
  minutes?: AttachmentInput[];
};

export type ListManagementReviewsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ReviewDisplayStatus;
  businessUnitIds?: string[];
  attendeeIds?: string[];
  privacy?: ReviewPrivacy;
  interval?: ReviewInterval;
  dateFrom?: string;
  dateTo?: string;
  sort?: "date" | "title" | "updatedAt" | "reference";
  sortDir?: "asc" | "desc";
};

export type PaginatedManagementReviews = {
  items: ManagementReview[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateManagementReviewsResult = {
  items: ManagementReview[];
};

export type ManagementReviewStats = {
  total: number;
  scheduled: number;
  completed: number;
  upcoming: number;
};

export const REVIEW_STATUS_OPTIONS: ReviewDisplayStatus[] = [
  "Scheduled",
  "Completed",
];

/** Task source module type (backend constant). */
export const MANAGEMENT_REVIEWS_SOURCE_MODULE = "managementreviews";

export const INTERVAL_OCCURRENCES: Record<ReviewInterval, number> = {
  Monthly: 12,
  Quarterly: 4,
  "Half yearly": 2,
  Yearly: 1,
};
