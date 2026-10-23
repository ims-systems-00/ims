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

export type LeaveDecision = "Approved" | "Rejected";

export const LEAVE_DAY_FRACTIONS = [1, 0.75, 0.5, 0.25] as const;

export type LeaveListScope = "mine" | "managed";

export type LeaveCountry = {
  name: string;
  code: string;
};

export type LeaveSubmission = {
  status: LeaveStatus;
  submissionDate?: string;
  decisionDate?: string;
  decisionMakerId?: string;
  lineManagerIds: string[];
};

export type Leave = {
  id: string;
  organizationId: string;
  reference: string;
  type: LeaveType;
  description: string;
  startDate: string;
  endDate: string;
  startDayFraction: number;
  endDayFraction: number;
  days: number;
  country: LeaveCountry;
  submission: LeaveSubmission;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedLeaves = {
  items: Leave[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListLeavesParams = {
  page?: number;
  pageSize?: number;
  scope?: LeaveListScope;
  status?: LeaveStatus;
  type?: LeaveType;
  search?: string;
  sortDir?: "asc" | "desc";
};

export type CreateLeaveInput = {
  type: LeaveType;
  description: string;
  startDate: string;
  endDate: string;
  startDayFraction: number;
  endDayFraction: number;
  ongoing?: boolean;
  submitImmediately?: boolean;
};

export type UpdateLeaveInput = Partial<
  Omit<CreateLeaveInput, "ongoing" | "submitImmediately">
>;

export type LeaveHoliday = {
  name: string;
  type: string;
  date: string;
};

export type LeaveHolidaysResult = {
  countryCode: string;
  year: number;
  items: LeaveHoliday[];
};
