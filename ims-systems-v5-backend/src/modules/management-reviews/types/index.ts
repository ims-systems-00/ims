/**
 * Management Review domain types.
 * Spec: docs/module-specifications/management-review.md
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

/**
 * Display status derived from completed.status.
 * Spec § Terminology: Scheduled | Completed.
 */
export type ReviewDisplayStatus = "Scheduled" | "Completed";

export function deriveDisplayStatus(review: {
  completed: { status: boolean };
}): ReviewDisplayStatus {
  return review.completed.status ? "Completed" : "Scheduled";
}

export type LifecycleFlag = {
  status: boolean;
  by: string | null;
  on: Date | null;
};

export type ReviewAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: Date;
};

export type ManagementReview = {
  id: string;
  organizationId: string;
  reference: string;
  title: string;
  date: Date;
  time?: string;
  interval: ReviewInterval;
  privacy: ReviewPrivacy;
  businessUnitId?: string;
  attendees: string[];
  agenda: ReviewAttachment[];
  minutes: ReviewAttachment[];
  completed: LifecycleFlag;
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Derived for API consumers; not stored. */
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
  date: Date;
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
  date?: Date;
  time?: string | null;
  privacy?: ReviewPrivacy;
  attendees?: string[];
  agenda?: AttachmentInput[];
  minutes?: AttachmentInput[];
};

export type ListManagementReviewsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: ReviewDisplayStatus;
  businessUnitIds?: string[];
  attendeeIds?: string[];
  privacy?: ReviewPrivacy;
  interval?: ReviewInterval;
  dateFrom?: Date;
  dateTo?: Date;
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

export type ManagementReviewStats = {
  total: number;
  scheduled: number;
  completed: number;
  upcoming: number;
};

export const MANAGEMENT_REVIEWS_RESOURCE = "management-reviews";

/** Task source module type (V4: managementreviews). */
export const MANAGEMENT_REVIEWS_SOURCE_MODULE = "managementreviews";

export const REVIEW_STATUS_OPTIONS: ReviewDisplayStatus[] = [
  "Scheduled",
  "Completed",
];

/** Occurrences created per interval (spec §2 / §9). */
export const INTERVAL_OCCURRENCES: Record<ReviewInterval, number> = {
  Monthly: 12,
  Quarterly: 4,
  "Half yearly": 2,
  Yearly: 1,
};
