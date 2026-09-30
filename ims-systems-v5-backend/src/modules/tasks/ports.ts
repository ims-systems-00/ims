/**
 * Cross-module ports for Task Management.
 */

export type TaskNotificationPort = {
  notifyAssigneesAssigned(input: {
    organizationId: string;
    taskId: string;
    reference: string;
    name: string;
    assigneeIds: string[];
  }): Promise<void>;
  notifyCreatorAccepted(input: {
    organizationId: string;
    taskId: string;
    reference: string;
    name: string;
    creatorId: string;
    acceptorId: string;
  }): Promise<void>;
  notifyCreatorDeclined(input: {
    organizationId: string;
    taskId: string;
    reference: string;
    name: string;
    creatorId: string;
    declinerId: string;
  }): Promise<void>;
  notifyCreatorCompleted(input: {
    organizationId: string;
    taskId: string;
    reference: string;
    name: string;
    creatorId: string;
    completedBy: string;
  }): Promise<void>;
  notifyNudge(input: {
    organizationId: string;
    taskId: string;
    reference: string;
    name: string;
    assigneeIds: string[];
  }): Promise<void>;
};

export class NoOpTaskNotificationAdapter implements TaskNotificationPort {
  async notifyAssigneesAssigned(): Promise<void> {
    return;
  }
  async notifyCreatorAccepted(): Promise<void> {
    return;
  }
  async notifyCreatorDeclined(): Promise<void> {
    return;
  }
  async notifyCreatorCompleted(): Promise<void> {
    return;
  }
  async notifyNudge(): Promise<void> {
    return;
  }
}

/**
 * Calendar events for task due dates — Calendar module not implemented.
 */
export type TaskCalendarPort = {
  upsertDueDateEvent(input: {
    organizationId: string;
    taskId: string;
    reference: string;
    name: string;
    dueDate: Date;
    assigneeIds: string[];
  }): Promise<void>;
  removeDueDateEvent(input: {
    organizationId: string;
    taskId: string;
  }): Promise<void>;
};

export class NoOpTaskCalendarAdapter implements TaskCalendarPort {
  async upsertDueDateEvent(): Promise<void> {
    return;
  }
  async removeDueDateEvent(): Promise<void> {
    return;
  }
}

/**
 * Resolve Functional Unit members for team-task auto-assignment.
 * Implemented via Users FunctionalUnitUsersPort.
 */
export type TaskUnitMembersPort = {
  listMemberIds(
    organizationId: string,
    businessUnitId: string
  ): Promise<string[]>;
};

export class EmptyTaskUnitMembersAdapter implements TaskUnitMembersPort {
  async listMemberIds(): Promise<string[]> {
    return [];
  }
}
