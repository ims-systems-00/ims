/**
 * Public surface for the Task Management module.
 * Other modules may import only from this entry.
 */

export { createTaskRouter, createTaskModule } from "./routes/task.routes";
export type { TaskRouterDeps } from "./routes/task.routes";
export { createTaskService } from "./services/task.service";
export type { TaskService } from "./services/task.service";
import type { TaskService } from "./services/task.service";
export { createTaskRepository } from "./repositories/task.repository";
export type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
  PaginatedTasks,
  TaskPriority,
  TaskStatus,
  TopTaskAnalytics,
  TaskSource,
} from "./types";
export {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASKS_RESOURCE,
  ASSIGNEE_ACCEPTANCES,
} from "./types";
export {
  NoOpTaskNotificationAdapter,
  NoOpTaskCalendarAdapter,
  EmptyTaskUnitMembersAdapter,
} from "./ports";
export type {
  TaskNotificationPort,
  TaskCalendarPort,
  TaskUnitMembersPort,
} from "./ports";

/**
 * Narrow public capability for cascade cleanup when a source record is deleted.
 */
export type TasksSourceCleanupPort = {
  removeTasksSourcedFrom(input: {
    organizationId: string;
    moduleType: string;
    moduleId: string;
  }): Promise<number>;
};

export function createTasksSourceCleanupAdapter(
  service: TaskService
): TasksSourceCleanupPort {
  return {
    async removeTasksSourcedFrom(input) {
      return service.removeTasksSourcedFrom(input.organizationId, {
        moduleType: input.moduleType,
        moduleId: input.moduleId,
      });
    },
  };
}
