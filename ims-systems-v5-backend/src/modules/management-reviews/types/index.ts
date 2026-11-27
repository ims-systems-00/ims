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

/**
 * ISO 9001/14001/45001 9.3.2 — inputs management must consider.
 * Each review tracks whether each input is ready (live compliance 9.3).
 */
export const REVIEW_INPUTS = [
  { key: "previous-actions", label: "Status of actions from previous reviews" },
  { key: "context-changes", label: "Changes in external and internal issues" },
  { key: "performance", label: "Performance and effectiveness (incidents, monitoring, KPIs)" },
  { key: "audit-results", label: "Audit results" },
  { key: "objectives", label: "Extent to which objectives have been met" },
  { key: "compliance-obligations", label: "Compliance obligations" },
  { key: "interested-parties", label: "Interested parties feedback" },
  { key: "resources", label: "Adequacy of resources" },
  { key: "risks-opportunities", label: "Risks and opportunities" },
] as const;
export type ReviewInputKey = (typeof REVIEW_INPUTS)[number]["key"];
export const REVIEW_INPUT_KEYS = REVIEW_INPUTS.map((i) => i.key) as [
  ReviewInputKey,
  ...ReviewInputKey[],
];

export type ReviewInput = {
  key: ReviewInputKey;
  label: string;
  ready: boolean;
  note?: string;
};

/** Canonical 9-input list merged with stored readiness (legacy → all not ready). */
export function mergeReviewInputs(
  stored: Array<{ key: string; ready?: boolean | null; note?: string | null }> | null | undefined
): ReviewInput[] {
  const byKey = new Map((stored ?? []).map((i) => [i.key, i]));
  return REVIEW_INPUTS.map((def) => {
    const s = byKey.get(def.key);
    return {
      key: def.key,
      label: def.label,
      ready: Boolean(s?.ready),
      ...(s?.note ? { note: s.note } : {}),
    };
  });
}

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
  /** File Handler bucket for view/download URLs. */
  bucket?: string;
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
  /** ISO 9.3.2 inputs readiness. */
  inputs: ReviewInput[];
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
  bucket?: string;
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
  /** Partial updates merged by key. */
  inputs?: Array<{ key: ReviewInputKey; ready: boolean; note?: string | null }>;
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
