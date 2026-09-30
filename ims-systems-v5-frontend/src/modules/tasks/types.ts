/**
 * Task Management frontend types — aligned with backend `/api/v1/tasks`.
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

export const LIST_STATUS_PRESET_LABELS: Record<ListStatusPreset, string> = {
  my_tasks: "My tasks",
  complete: "Complete",
  incomplete: "Incomplete",
  in_progress: "In progress",
  pending: "Pending",
  assigned_to_me: "Assigned to me",
};

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
  uploadedAt: string;
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
  at: string;
};

export type Task = {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  teamPriority: boolean;
  businessUnitId?: string;
  assignees: TaskAssignee[];
  status: TaskStatus;
  completedBy: string | null;
  completedOn: string | null;
  attachments: TaskAttachment[];
  source?: TaskSource;
  activity: TaskActivityEntry[];
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  nextNudgeAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttachmentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

export type CreateTaskInput = {
  name: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  teamPriority: boolean;
  businessUnitId?: string;
  assigneeIds?: string[];
  attachments?: AttachmentInput[];
  source?: TaskSource;
};

export type UpdateTaskInput = {
  name?: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  teamPriority?: boolean;
  businessUnitId?: string | null;
  assigneeIds?: string[];
  attachments?: AttachmentInput[];
};

export type ListTasksParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  statusPreset?: ListStatusPreset;
  priority?: TaskPriority;
  assigneeId?: string;
  dueBefore?: string;
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
