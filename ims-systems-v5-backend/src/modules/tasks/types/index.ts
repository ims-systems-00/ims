/**
 * Task Management domain types.
 * Spec: docs/module-specifications/task.md
 */

export const TASK_PRIORITIES = ["High", "Medium", "Low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["Pending", "In progress", "Complete"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ASSIGNEE_ACCEPTANCES = [
  "Pending",
  "Accepted",
  "Declined",
] as const;
export type AssigneeAcceptance = (typeof ASSIGNEE_ACCEPTANCES)[number];

export const LIST_STATUS_PRESETS = [
  "my_tasks",
  "complete",
  "incomplete",
  "in_progress",
  "pending",
  "assigned_to_me",
] as const;
export type ListStatusPreset = (typeof LIST_STATUS_PRESETS)[number];

export type TaskAssignee = {
  userId: string;
  acceptance: AssigneeAcceptance;
};

export type TaskAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: Date;
};

export type TaskSource = {
  moduleType: string;
  moduleId: string;
};

export type TaskActivityEntry = {
  id: string;
  type: string;
  message: string;
  actorId: string | null;
  at: Date;
};

export type Task = {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  description: string;
  dueDate: Date;
  priority: TaskPriority;
  teamPriority: boolean;
  businessUnitId?: string;
  assignees: TaskAssignee[];
  status: TaskStatus;
  completedBy: string | null;
  completedOn: Date | null;
  attachments: TaskAttachment[];
  source?: TaskSource;
  activity: TaskActivityEntry[];
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  nextNudgeAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTaskInput = {
  name: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  teamPriority: boolean;
  businessUnitId?: string;
  assigneeIds?: string[];
  attachments?: Array<{
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
    url?: string;
  }>;
  source?: TaskSource;
};

export type UpdateTaskInput = {
  name?: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  teamPriority?: boolean;
  businessUnitId?: string | null;
  assigneeIds?: string[];
  attachments?: Array<{
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
    url?: string;
  }>;
};

export type ListTasksQuery = {
  page: number;
  pageSize: number;
  search?: string;
  statusPreset?: ListStatusPreset;
  priority?: TaskPriority;
  assigneeId?: string;
  dueBefore?: Date;
  sourceModuleType?: string;
  sourceModuleId?: string;
  sort?: "dueDate" | "createdOn" | "priority" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedTasks = {
  items: Task[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TopTaskAnalytics = {
  teamTasks: Task[];
  individualTasks: Task[];
};

export const TASKS_RESOURCE = "tasks";

export const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
