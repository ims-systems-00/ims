/**
 * Leaves (Staff Wallet) domain types.
 * Spec: docs/module-specifications/leaves.md
 */

export const LEAVE_TYPES = ["Annual leave", "Sick leave"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = [
  "Draft",
  "Pending",
  "Ongoing",
  "Approved",
  "Rejected",
] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_DECISIONS = ["Approved", "Rejected"] as const;
export type LeaveDecision = (typeof LEAVE_DECISIONS)[number];

export const LEAVE_DAY_FRACTIONS = [1, 0.75, 0.5, 0.25] as const;

export const LEAVE_REFERENCE_PREFIX: Record<LeaveType, string> = {
  "Annual leave": "AL",
  "Sick leave": "SIC",
};

export const LEAVE_DEFAULT_COUNTRY = { name: "United Kingdom", code: "GB" };

export type LeaveCountry = {
  name: string;
  code: string;
};

export type LeaveSubmission = {
  status: LeaveStatus;
  submissionDate?: Date;
  decisionDate?: Date;
  decisionMakerId?: string;
  lineManagerIds: string[];
};

export type Leave = {
  id: string;
  organizationId: string;
  reference: string;
  type: LeaveType;
  description: string;
  startDate: Date;
  endDate: Date;
  startDayFraction: number;
  endDayFraction: number;
  days: number;
  country: LeaveCountry;
  submission: LeaveSubmission;
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateLeaveInput = {
  type: LeaveType;
  description: string;
  startDate: Date;
  endDate: Date;
  startDayFraction: number;
  endDayFraction: number;
  ongoing?: boolean;
  submitImmediately?: boolean;
};

export type UpdateLeaveInput = {
  type?: LeaveType;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  startDayFraction?: number;
  endDayFraction?: number;
};

export type EvaluateLeaveInput = {
  status: LeaveDecision;
};

export type LeaveListScope = "mine" | "managed";

export type ListLeavesQuery = {
  page: number;
  pageSize: number;
  scope: LeaveListScope;
  status?: LeaveStatus;
  type?: LeaveType;
  search?: string;
  sortDir?: "asc" | "desc";
};

export type PaginatedLeaves = {
  items: Leave[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type LeaveHoliday = {
  name: string;
  type: string;
  date: string;
};

export type LeaveHolidaysQuery = {
  year?: number;
  countryCode?: string;
};

export type LeaveHolidaysResult = {
  countryCode: string;
  year: number;
  items: LeaveHoliday[];
};

/** Authz resource type. */
export const LEAVES_RESOURCE = "leaves";
