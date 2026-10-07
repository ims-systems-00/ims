/**
 * Activities frontend types — `/api/v1/activities`.
 * Spec: docs/module-specifications/activity.md
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

export type ActivityExtraLog = {
  title: string;
  description?: string;
  icon?: string;
  image?: string;
};

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
  groupId: string | null;
  assignedTo: string | null;
  assignedOn: string | null;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateActivityInput = {
  moduleType: ActivityModuleType;
  moduleId: string;
  value: string;
  metaInfo?: ActivityMetaInfo;
  groupId?: string | null;
};

export type UpdateActivityInput = {
  value: string;
};

export type ListActivitiesParams = {
  page?: number;
  pageSize?: number;
  moduleType: ActivityModuleType;
  moduleId: string;
  isAutomated?: boolean;
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
