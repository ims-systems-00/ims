/**
 * Task Management application service.
 * Spec: docs/module-specifications/task.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  TaskCalendarPort,
  TaskNotificationPort,
  TaskUnitMembersPort,
} from "../ports";
import {
  newActivityEntry,
  newAttachmentId,
  type PersistTaskPatch,
  type TaskRepository,
} from "../repositories/task.repository";
import {
  NUDGE_COOLDOWN_MS,
  TASKS_RESOURCE,
  type CreateTaskInput,
  type ListTasksQuery,
  type PaginatedTasks,
  type Task,
  type TaskAssignee,
  type TaskAttachment,
  type TaskSource,
  type TopTaskAnalytics,
  type UpdateTaskInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TSK-${stamp}-${rand}`;
}

function isVisibleTo(task: Task, subjectId: string): boolean {
  if (task.createdBy === subjectId) return true;
  return task.assignees.some((a) => a.userId === subjectId);
}

function assertNotComplete(task: Task): void {
  if (task.status === "Complete") {
    throw new ConflictError("Completed tasks cannot be modified");
  }
}

function mapAttachments(
  input: CreateTaskInput["attachments"] | UpdateTaskInput["attachments"],
  actorId: string
): TaskAttachment[] {
  if (!input || input.length === 0) return [];
  const now = new Date();
  return input.map((file) => ({
    id: newAttachmentId(),
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    url: file.url || undefined,
    uploadedBy: actorId,
    uploadedAt: now,
  }));
}

function toPendingAssignees(userIds: string[]): TaskAssignee[] {
  const unique = [...new Set(userIds.filter(Boolean))];
  return unique.map((userId) => ({ userId, acceptance: "Pending" as const }));
}

export type TaskServiceDeps = {
  repository: TaskRepository;
  authorizer: Authorizer;
  notifications: TaskNotificationPort;
  calendar: TaskCalendarPort;
  unitMembers: TaskUnitMembersPort;
};

export type TaskService = ReturnType<typeof createTaskService>;

export function createTaskService(deps: TaskServiceDeps) {
  const { repository, authorizer, notifications, calendar, unitMembers } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: TASKS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access tasks"
      );
    }
  }

  async function requireVisibleTask(
    organizationId: string,
    id: string,
    subjectId: string
  ): Promise<Task> {
    const task = await repository.findById(organizationId, id, {
      includeDeleted: true,
    });
    if (!task || task.deletedAt) {
      throw new NotFoundError("This task has been deleted or removed");
    }
    if (!isVisibleTo(task, subjectId)) {
      throw new NotFoundError("Task not found");
    }
    return task;
  }

  async function resolveAssignees(
    organizationId: string,
    input: {
      teamPriority: boolean;
      businessUnitId?: string | null;
      assigneeIds?: string[];
      excludeCreatorId?: string;
    }
  ): Promise<TaskAssignee[]> {
    if (input.teamPriority) {
      if (!input.businessUnitId) {
        throw new ValidationAppError(
          "Business unit is required for team tasks"
        );
      }
      let memberIds = await unitMembers.listMemberIds(
        organizationId,
        input.businessUnitId
      );
      if (input.excludeCreatorId) {
        memberIds = memberIds.filter((id) => id !== input.excludeCreatorId);
      }
      return toPendingAssignees(memberIds);
    }
    return toPendingAssignees(input.assigneeIds ?? []);
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateTaskInput
    ): Promise<Task> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      if (!input.name?.trim()) {
        throw new ValidationAppError("Task name is required");
      }

      const teamPriority = Boolean(input.teamPriority);
      const assignees = await resolveAssignees(actor.organizationId, {
        teamPriority,
        businessUnitId: input.businessUnitId,
        assigneeIds: input.assigneeIds,
      });

      const dueDate = input.dueDate ?? new Date();
      const priority = input.priority ?? "Medium";
      const description = input.description ?? "";
      const attachments = mapAttachments(
        input.attachments,
        actor.identity.subjectId
      );
      const createdOn = new Date();

      const created = await repository.create(actor.organizationId, {
        name: input.name.trim(),
        description,
        dueDate,
        priority,
        teamPriority,
        businessUnitId: teamPriority ? input.businessUnitId : undefined,
        assigneeIds: input.assigneeIds,
        source: input.source,
        reference: nextReference(),
        assignees,
        status: "Pending",
        attachments,
        activity: [
          newActivityEntry("created", "Task created", actor.identity.subjectId),
        ],
        createdBy: actor.identity.subjectId,
        createdOn,
      });

      const assigneeIds = created.assignees.map((a) => a.userId);
      if (assigneeIds.length > 0) {
        await notifications.notifyAssigneesAssigned({
          organizationId: actor.organizationId,
          taskId: created.id,
          reference: created.reference,
          name: created.name,
          assigneeIds,
        });
      }

      await calendar.upsertDueDateEvent({
        organizationId: actor.organizationId,
        taskId: created.id,
        reference: created.reference,
        name: created.name,
        dueDate: created.dueDate,
        assigneeIds,
      });

      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListTasksQuery
    ): Promise<PaginatedTasks> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return repository.listForSubject(
        actor.organizationId,
        actor.identity.subjectId,
        query
      );
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Task> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireVisibleTask(
        actor.organizationId,
        id,
        actor.identity.subjectId
      );
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateTaskInput
    ): Promise<Task> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireVisibleTask(
        actor.organizationId,
        id,
        actor.identity.subjectId
      );
      assertNotComplete(existing);

      // Spec UI: creator has full edit; assignees limited. Enforce creator for
      // assignment/priority/due changes; allow any visible user for name/description/attachments.
      const changesAssignment =
        input.teamPriority !== undefined ||
        input.businessUnitId !== undefined ||
        input.assigneeIds !== undefined ||
        input.priority !== undefined ||
        input.dueDate !== undefined;
      if (
        changesAssignment &&
        existing.createdBy !== actor.identity.subjectId
      ) {
        throw new ForbiddenError(
          "Only the task creator can change assignment, priority, or due date"
        );
      }

      const teamPriority = input.teamPriority ?? existing.teamPriority;
      const businessUnitId =
        input.businessUnitId === undefined
          ? existing.businessUnitId
          : input.businessUnitId;

      let assignees = existing.assignees;
      if (
        input.teamPriority !== undefined ||
        input.businessUnitId !== undefined ||
        input.assigneeIds !== undefined
      ) {
        assignees = await resolveAssignees(actor.organizationId, {
          teamPriority,
          businessUnitId,
          assigneeIds: input.assigneeIds,
          excludeCreatorId: teamPriority
            ? actor.identity.subjectId
            : undefined,
        });
      }

      const patch: PersistTaskPatch = {
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntries: [
          newActivityEntry(
            "updated",
            "Task updated",
            actor.identity.subjectId
          ),
        ],
      };

      if (input.name !== undefined) patch.name = input.name;
      if (input.description !== undefined) patch.description = input.description;
      if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.teamPriority !== undefined) patch.teamPriority = teamPriority;
      if (input.businessUnitId !== undefined) {
        patch.businessUnitId = teamPriority ? businessUnitId ?? null : null;
      }
      if (
        input.teamPriority !== undefined ||
        input.businessUnitId !== undefined ||
        input.assigneeIds !== undefined
      ) {
        patch.assignees = assignees;
      }

      if (input.attachments && input.attachments.length > 0) {
        const added = mapAttachments(
          input.attachments,
          actor.identity.subjectId
        );
        patch.attachments = [...existing.attachments, ...added];
        patch.activityEntries!.push(
          newActivityEntry(
            "attachment_added",
            "Attachment(s) added",
            actor.identity.subjectId
          )
        );
      }

      const updated = await repository.update(
        actor.organizationId,
        id,
        patch
      );
      if (!updated) throw new NotFoundError("Task not found");

      const previousIds = new Set(existing.assignees.map((a) => a.userId));
      const newAssigneeIds = updated.assignees
        .map((a) => a.userId)
        .filter((userId) => !previousIds.has(userId));
      if (newAssigneeIds.length > 0) {
        await notifications.notifyAssigneesAssigned({
          organizationId: actor.organizationId,
          taskId: updated.id,
          reference: updated.reference,
          name: updated.name,
          assigneeIds: newAssigneeIds,
        });
      }

      await calendar.upsertDueDateEvent({
        organizationId: actor.organizationId,
        taskId: updated.id,
        reference: updated.reference,
        name: updated.name,
        dueDate: updated.dueDate,
        assigneeIds: updated.assignees.map((a) => a.userId),
      });

      return updated;
    },

    async accept(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Task> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireVisibleTask(
        actor.organizationId,
        id,
        actor.identity.subjectId
      );
      assertNotComplete(existing);

      const assignee = existing.assignees.find(
        (a) => a.userId === actor.identity.subjectId
      );
      if (!assignee) {
        throw new ForbiddenError("Only an assignee can accept this task");
      }
      if (assignee.acceptance !== "Pending") {
        throw new ConflictError("Assignment response already recorded");
      }

      const assignees = existing.assignees.map((a) =>
        a.userId === actor.identity.subjectId
          ? { ...a, acceptance: "Accepted" as const }
          : a
      );
      const wasFirstAccept =
        existing.status === "Pending" &&
        !existing.assignees.some((a) => a.acceptance === "Accepted");

      const updated = await repository.update(actor.organizationId, id, {
        assignees,
        status: wasFirstAccept ? "In progress" : existing.status,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "accepted",
          "Assignment accepted",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Task not found");

      await notifications.notifyCreatorAccepted({
        organizationId: actor.organizationId,
        taskId: updated.id,
        reference: updated.reference,
        name: updated.name,
        creatorId: updated.createdBy,
        acceptorId: actor.identity.subjectId,
      });

      return updated;
    },

    async decline(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Task> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireVisibleTask(
        actor.organizationId,
        id,
        actor.identity.subjectId
      );
      assertNotComplete(existing);

      const assignee = existing.assignees.find(
        (a) => a.userId === actor.identity.subjectId
      );
      if (!assignee) {
        throw new ForbiddenError("Only an assignee can decline this task");
      }
      if (assignee.acceptance !== "Pending") {
        throw new ConflictError("Assignment response already recorded");
      }

      const assignees = existing.assignees.map((a) =>
        a.userId === actor.identity.subjectId
          ? { ...a, acceptance: "Declined" as const }
          : a
      );

      const updated = await repository.update(actor.organizationId, id, {
        assignees,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "declined",
          "Assignment declined",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Task not found");

      await notifications.notifyCreatorDeclined({
        organizationId: actor.organizationId,
        taskId: updated.id,
        reference: updated.reference,
        name: updated.name,
        creatorId: updated.createdBy,
        declinerId: actor.identity.subjectId,
      });

      return updated;
    },

    async complete(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Task> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireVisibleTask(
        actor.organizationId,
        id,
        actor.identity.subjectId
      );
      if (existing.status === "Complete") {
        throw new ConflictError("Task is already complete");
      }

      const isCreator = existing.createdBy === actor.identity.subjectId;
      const isAssignee = existing.assignees.some(
        (a) => a.userId === actor.identity.subjectId
      );
      if (!isCreator && !isAssignee) {
        throw new ForbiddenError(
          "Only the creator or an assignee can complete this task"
        );
      }

      const updated = await repository.update(actor.organizationId, id, {
        status: "Complete",
        completedBy: actor.identity.subjectId,
        completedOn: new Date(),
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "completed",
          "Task completed",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Task not found");

      await notifications.notifyCreatorCompleted({
        organizationId: actor.organizationId,
        taskId: updated.id,
        reference: updated.reference,
        name: updated.name,
        creatorId: updated.createdBy,
        completedBy: actor.identity.subjectId,
      });

      return updated;
    },

    async nudge(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Task> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireVisibleTask(
        actor.organizationId,
        id,
        actor.identity.subjectId
      );
      assertNotComplete(existing);

      if (
        existing.nextNudgeAt &&
        existing.nextNudgeAt.getTime() > Date.now()
      ) {
        throw new ConflictError("Nudge cooldown is still active");
      }

      const assigneeIds = existing.assignees
        .filter((a) => a.acceptance !== "Declined")
        .map((a) => a.userId);
      if (assigneeIds.length === 0) {
        throw new ValidationAppError("Task has no assignees to nudge");
      }

      const updated = await repository.update(actor.organizationId, id, {
        nextNudgeAt: new Date(Date.now() + NUDGE_COOLDOWN_MS),
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "nudged",
          "Assignees nudged",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Task not found");

      await notifications.notifyNudge({
        organizationId: actor.organizationId,
        taskId: updated.id,
        reference: updated.reference,
        name: updated.name,
        assigneeIds,
      });

      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireVisibleTask(
        actor.organizationId,
        id,
        actor.identity.subjectId
      );
      if (existing.createdBy !== actor.identity.subjectId) {
        throw new ForbiddenError("Only the task creator can delete this task");
      }

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) throw new NotFoundError("Task not found");

      await calendar.removeDueDateEvent({
        organizationId: actor.organizationId,
        taskId: id,
      });
    },

    async removeAttachment(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<Task> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireVisibleTask(
        actor.organizationId,
        id,
        actor.identity.subjectId
      );
      assertNotComplete(existing);

      const next = existing.attachments.filter((a) => a.id !== attachmentId);
      if (next.length === existing.attachments.length) {
        throw new NotFoundError("Attachment not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        attachments: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
        activityEntry: newActivityEntry(
          "attachment_removed",
          "Attachment removed",
          actor.identity.subjectId
        ),
      });
      if (!updated) throw new NotFoundError("Task not found");
      return updated;
    },

    async topAnalytics(
      identity: SecurityIdentity | null | undefined
    ): Promise<TopTaskAnalytics> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");

      const [teamTasks, individualTasks] = await Promise.all([
        repository.listTopIncomplete(
          actor.organizationId,
          actor.identity.subjectId,
          { team: true, limit: 3 }
        ),
        repository.listTopIncomplete(
          actor.organizationId,
          actor.identity.subjectId,
          { team: false, limit: 3 }
        ),
      ]);

      return { teamTasks, individualTasks };
    },

    /**
     * Cascade soft-delete for linked source records (risks, audits, etc.).
     * Organisation must be supplied by the calling module service, not the client.
     */
    async removeTasksSourcedFrom(
      organizationId: string,
      source: TaskSource
    ): Promise<number> {
      return repository.softDeleteBySource(organizationId, source);
    },
  };
}
