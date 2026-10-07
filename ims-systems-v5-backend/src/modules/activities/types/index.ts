/**
 * Activity domain types.
 * Spec: docs/module-specifications/activity.md
 *
 * Timeline entries (manual comments or automated system messages) linked to a
 * parent business record. Not a standalone navigable module.
 */

export const ACTIVITIES_RESOURCE = "activities";

/**
 * Parent module type codes. Confirmed from the Activity specification linked
 * modules / attributes. Document UI sometimes sends `documents` /
 * `docversiondetails` — those are intentionally excluded (spec discrepancy).
 */
export const ACTIVITY_MODULE_TYPES = [
  "incidents",
  "tasks",
  "risks",
  "cips",
  "customers",
  "controlstatuses",
  "documenttrees",
  "leaverequests",
  "expensereports",
  "cqcsignificantevents",
  "cqctoolcontrols",
  "imsprojects",
  "imsprojectworkpackages",
  "aianalyses",
  "carbocalccalculations",
  "carbocalcreductioninitiatives",
] as const;
export type ActivityModuleType = (typeof ACTIVITY_MODULE_TYPES)[number];

/** Supplementary detail card on automated activities. */
export type ActivityExtraLog = {
  title: string;
  description?: string;
  icon?: string;
  image?: string;
};

/** Optional scoping bag (document audit trail uses threadId). */
export type ActivityMetaInfo = {
  threadId?: string;
  [key: string]: unknown;
};

export type Activity = {
  id: string;
  organizationId: string;
  moduleType: ActivityModuleType;
  moduleId: string;
  value: string;
  isAutomated: boolean;
  iconSrc: string | null;
  extraLogs: ActivityExtraLog[];
  metaInfo: ActivityMetaInfo;
  /** Business unit / group; creation defaults to null (spec). */
  groupId: string | null;
  /** Model field exists but create always sets null (spec). */
  assignedTo: string | null;
  assignedOn: Date | null;
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateActivityInput = {
  moduleType: ActivityModuleType;
  moduleId: string;
  value: string;
  metaInfo?: ActivityMetaInfo;
  groupId?: string | null;
};

/**
 * Internal / cross-module create for system-generated timeline entries.
 * Not exposed as a public HTTP body field for isAutomated — HTTP create is
 * always manual.
 */
export type RecordAutomatedActivityInput = {
  moduleType: ActivityModuleType;
  moduleId: string;
  value: string;
  createdBy: string;
  iconSrc?: string | null;
  extraLogs?: ActivityExtraLog[];
  metaInfo?: ActivityMetaInfo;
  groupId?: string | null;
};

/** Spec: update persists comment text only. */
export type UpdateActivityInput = {
  value: string;
};

export type ListActivitiesQuery = {
  page: number;
  pageSize: number;
  /** Required for timeline loads. */
  moduleType: ActivityModuleType;
  /** Required for timeline loads. */
  moduleId: string;
  /** Optional filter: manual vs automated. */
  isAutomated?: boolean;
  /** Document audit trail: filter by metaInfo.threadId. */
  threadId?: string;
  sort?: "createdOn" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedActivities = {
  items: Activity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const MAX_ACTIVITY_VALUE_LENGTH = 20_000;
export const MAX_EXTRA_LOGS = 20;
export const MAX_EXTRA_LOG_TITLE_LENGTH = 200;
export const MAX_EXTRA_LOG_DESCRIPTION_LENGTH = 4000;
