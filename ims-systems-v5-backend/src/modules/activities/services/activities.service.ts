/**
 * Activity application service.
 * Spec: docs/module-specifications/activity.md
 *
 * Manual comments via HTTP; automated entries via ActivitiesApplicationPort.
 * Edit/delete restricted to creator of non-automated entries (V5 hardening
 * vs V4 API gap noted in the spec).
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  ActivityListScopePort,
  ActivityOfiFollowUpPort,
} from "../ports";
import type { ActivityRepository } from "../repositories/activity.repository";
import {
  ACTIVITIES_RESOURCE,
  MAX_ACTIVITY_VALUE_LENGTH,
  type Activity,
  type CreateActivityInput,
  type ListActivitiesQuery,
  type PaginatedActivities,
  type RecordAutomatedActivityInput,
  type UpdateActivityInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

function assertManualOwner(activity: Activity, subjectId: string): void {
  if (activity.isAutomated) {
    throw new ForbiddenError("Automated activities cannot be modified");
  }
  if (activity.createdBy !== subjectId) {
    throw new ForbiddenError("Only the comment author can modify this activity");
  }
}

export type ActivitiesServiceDeps = {
  repository: ActivityRepository;
  authorizer: Authorizer;
  ofiFollowUp: ActivityOfiFollowUpPort;
  listScope: ActivityListScopePort;
};

export type ActivitiesService = ReturnType<typeof createActivitiesService>;

/**
 * Narrow public surface for parent modules that record automated timeline
 * entries (incidents, tasks, risks, documents, …).
 */
export type ActivitiesApplicationPort = {
  recordAutomated(
    organizationId: string,
    input: RecordAutomatedActivityInput
  ): Promise<Activity>;
  listForParent(
    organizationId: string,
    query: ListActivitiesQuery
  ): Promise<PaginatedActivities>;
  getById(organizationId: string, id: string): Promise<Activity | null>;
};

export function createActivitiesService(deps: ActivitiesServiceDeps) {
  const { repository, authorizer, ofiFollowUp, listScope } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update" | "delete"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: ACTIVITIES_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Activities"
      );
    }
  }

  async function afterCreate(
    organizationId: string,
    activity: Activity,
    actorId: string
  ): Promise<void> {
    if (activity.moduleType !== "cips") return;
    try {
      await ofiFollowUp.onCipActivityCreated({
        organizationId,
        ofiId: activity.moduleId,
        actorId,
      });
    } catch {
      // Spec follow-up must not fail the activity create response.
    }
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateActivityInput
    ): Promise<Activity> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const value = input.value?.trim() ?? "";
      if (!value) throw new ValidationAppError("Comment text is required");
      if (value.length > MAX_ACTIVITY_VALUE_LENGTH) {
        throw new ValidationAppError("Comment text is too long");
      }
      if (!input.moduleId?.trim()) {
        throw new ValidationAppError("Parent record id is required");
      }

      const created = await repository.create(organizationId, {
        moduleType: input.moduleType,
        moduleId: input.moduleId.trim(),
        value,
        isAutomated: false,
        iconSrc: null,
        extraLogs: [],
        metaInfo: input.metaInfo ?? {},
        groupId: input.groupId ?? null,
        assignedTo: null,
        assignedOn: null,
        createdBy: subjectId,
        createdOn: new Date(),
      });

      await afterCreate(organizationId, created, subjectId);
      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListActivitiesQuery
    ): Promise<PaginatedActivities> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");

      if (!query.moduleType || !query.moduleId?.trim()) {
        throw new ValidationAppError(
          "moduleType and moduleId are required to list activities"
        );
      }

      const scope = await listScope.resolveScope({
        organizationId,
        subjectId,
      });

      return repository.list(
        organizationId,
        {
          ...query,
          moduleId: query.moduleId.trim(),
        },
        scope
      );
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Activity> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const activity = await repository.findById(organizationId, id);
      if (!activity) throw new NotFoundError("Activity not found");
      return activity;
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateActivityInput
    ): Promise<Activity> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");

      const existing = await repository.findById(organizationId, id);
      if (!existing) throw new NotFoundError("Activity not found");
      assertManualOwner(existing, subjectId);

      const value = input.value?.trim() ?? "";
      if (!value) throw new ValidationAppError("Comment text is required");
      if (value.length > MAX_ACTIVITY_VALUE_LENGTH) {
        throw new ValidationAppError("Comment text is too long");
      }

      const updated = await repository.update(organizationId, id, {
        value,
        updatedBy: subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("Activity not found");
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Activity> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");

      const existing = await repository.findById(organizationId, id);
      if (!existing) throw new NotFoundError("Activity not found");
      assertManualOwner(existing, subjectId);

      const deleted = await repository.hardDelete(organizationId, id);
      if (!deleted) throw new NotFoundError("Activity not found");
      return existing;
    },

    /** Org-scoped helpers for application port / adapters. */
    async getByIdForOrganization(
      organizationId: string,
      id: string
    ): Promise<Activity | null> {
      return repository.findById(organizationId, id);
    },

    async listForOrganization(
      organizationId: string,
      query: ListActivitiesQuery
    ): Promise<PaginatedActivities> {
      return repository.list(organizationId, query, { mode: "all" });
    },

    async recordAutomatedForOrganization(
      organizationId: string,
      input: RecordAutomatedActivityInput
    ): Promise<Activity> {
      const value = input.value?.trim() ?? "";
      if (!value) throw new ValidationAppError("Activity message is required");
      if (!input.moduleId?.trim()) {
        throw new ValidationAppError("Parent record id is required");
      }
      if (!input.createdBy?.trim()) {
        throw new ValidationAppError("createdBy is required");
      }

      const created = await repository.create(organizationId, {
        moduleType: input.moduleType,
        moduleId: input.moduleId.trim(),
        value,
        isAutomated: true,
        iconSrc: input.iconSrc ?? null,
        extraLogs: input.extraLogs ?? [],
        metaInfo: input.metaInfo ?? {},
        groupId: input.groupId ?? null,
        assignedTo: null,
        assignedOn: null,
        createdBy: input.createdBy.trim(),
        createdOn: new Date(),
      });

      await afterCreate(organizationId, created, input.createdBy.trim());
      return created;
    },
  };
}
