/**
 * Leaves application service.
 * Spec: docs/module-specifications/leaves.md
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
  LeavesCalendarPort,
  LeavesMembershipPort,
  LeavesNotificationPort,
} from "../ports";
import type { LeaveRepository } from "../repositories/leave.repository";
import {
  LEAVES_RESOURCE,
  type CreateLeaveInput,
  type EvaluateLeaveInput,
  type Leave,
  type LeaveHolidaysQuery,
  type LeaveHolidaysResult,
  type ListLeavesQuery,
  type PaginatedLeaves,
  type UpdateLeaveInput,
} from "../types";
import { calculateWorkingDays, listPublicHolidays } from "./working-days";

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

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function assertDateRange(startDate: Date, endDate: Date): void {
  if (endDate < startDate) {
    throw new ValidationAppError("End date must be on or after start date");
  }
}

function assertEditable(leave: Leave): void {
  const { status } = leave.submission;
  if (status === "Approved" || status === "Rejected") {
    throw new ConflictError(`A ${status.toLowerCase()} leave cannot be changed`);
  }
}

export type LeavesServiceDeps = {
  repository: LeaveRepository;
  authorizer: Authorizer;
  notifications: LeavesNotificationPort;
  calendar: LeavesCalendarPort;
  memberships: LeavesMembershipPort;
};

export type LeavesService = ReturnType<typeof createLeavesService>;

export function createLeavesService(deps: LeavesServiceDeps) {
  const { repository, authorizer, notifications, calendar, memberships } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: LEAVES_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError("User does not have permission to access leaves");
    }
  }

  async function requireLeave(
    organizationId: string,
    id: string
  ): Promise<Leave> {
    const leave = await repository.findById(organizationId, id);
    if (!leave) {
      throw new NotFoundError("This leave request has been deleted or removed");
    }
    return leave;
  }

  async function hasWalletAccess(
    actorId: string,
    organizationId: string,
    leave: Leave
  ): Promise<boolean> {
    if (leave.createdBy === actorId) return true;
    if (leave.submission.lineManagerIds.includes(actorId)) return true;
    const managed = await memberships.listManagedUserIds({
      organizationId,
      managerId: actorId,
    });
    return managed.includes(leave.createdBy);
  }

  async function requireWalletAccess(
    actorId: string,
    organizationId: string,
    leave: Leave
  ): Promise<void> {
    if (!(await hasWalletAccess(actorId, organizationId, leave))) {
      throw new ForbiddenError("You do not have access to this leave request");
    }
  }

  async function submitLeave(
    actor: { identity: SecurityIdentity; organizationId: string },
    leave: Leave
  ): Promise<Leave> {
    const { status } = leave.submission;
    if (status !== "Draft" && status !== "Ongoing") {
      throw new ConflictError("Only draft or ongoing leave can be submitted");
    }

    const profile = await memberships.getProfile({
      organizationId: actor.organizationId,
      userId: leave.createdBy,
    });
    // Solo / local testing: if no managers are configured, the requester
    // can act as their own line manager so approve/reject can be exercised.
    const lineManagerIds =
      profile.lineManagerIds.length > 0
        ? profile.lineManagerIds
        : leave.submission.lineManagerIds.length > 0
          ? leave.submission.lineManagerIds
          : [leave.createdBy];

    const now = new Date();
    let endDate = leave.endDate;
    let days = leave.days;
    if (status === "Ongoing") {
      const today = startOfUtcDay(now);
      if (leave.startDate <= today && today <= leave.endDate) {
        endDate = today;
        days = calculateWorkingDays({
          startDate: leave.startDate,
          endDate,
          startDayFraction: leave.startDayFraction,
          endDayFraction: leave.endDayFraction,
          countryCode: leave.country.code,
        });
      }
    }

    const updated = await repository.update(actor.organizationId, leave.id, {
      endDate,
      days,
      submission: {
        ...leave.submission,
        status: "Pending",
        submissionDate: now,
        lineManagerIds,
      },
      updatedBy: actor.identity.subjectId,
      updatedOn: now,
    });
    if (!updated) {
      throw new NotFoundError("This leave request has been deleted or removed");
    }

    await notifications.notifySubmitted({
      organizationId: actor.organizationId,
      leaveId: updated.id,
      reference: updated.reference,
      requesterId: updated.createdBy,
      lineManagerIds,
    });

    return updated;
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateLeaveInput
    ): Promise<Leave> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      if (!input.description?.trim()) {
        throw new ValidationAppError("Description is required");
      }
      assertDateRange(input.startDate, input.endDate);
      if (input.ongoing && input.type !== "Sick leave") {
        throw new ValidationAppError(
          "Ongoing leave is only available for sick leave"
        );
      }

      const profile = await memberships.getProfile({
        organizationId: actor.organizationId,
        userId: actor.identity.subjectId,
      });
      const days = calculateWorkingDays({
        startDate: input.startDate,
        endDate: input.endDate,
        startDayFraction: input.startDayFraction,
        endDayFraction: input.endDayFraction,
        countryCode: profile.country.code,
      });

      const createdOn = new Date();
      const created = await repository.create(actor.organizationId, {
        reference: await repository.nextReference(
          actor.organizationId,
          input.type
        ),
        type: input.type,
        description: input.description.trim(),
        startDate: input.startDate,
        endDate: input.endDate,
        startDayFraction: input.startDayFraction,
        endDayFraction: input.endDayFraction,
        days,
        country: profile.country,
        submission: {
          status: input.ongoing ? "Ongoing" : "Draft",
          lineManagerIds:
            profile.lineManagerIds.length > 0
              ? profile.lineManagerIds
              : [actor.identity.subjectId],
        },
        createdBy: actor.identity.subjectId,
        createdOn,
      });

      if (input.submitImmediately) {
        return submitLeave(actor, created);
      }
      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListLeavesQuery
    ): Promise<PaginatedLeaves> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");

      const managedUserIds =
        query.scope === "managed"
          ? await memberships.listManagedUserIds({
              organizationId: actor.organizationId,
              managerId: actor.identity.subjectId,
            })
          : [];

      return repository.list(actor.organizationId, {
        ...query,
        actorId: actor.identity.subjectId,
        managedUserIds,
      });
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Leave> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      const leave = await requireLeave(actor.organizationId, id);
      await requireWalletAccess(
        actor.identity.subjectId,
        actor.organizationId,
        leave
      );
      return leave;
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateLeaveInput
    ): Promise<Leave> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireLeave(actor.organizationId, id);
      await requireWalletAccess(
        actor.identity.subjectId,
        actor.organizationId,
        existing
      );
      assertEditable(existing);

      if (input.description !== undefined && !input.description.trim()) {
        throw new ValidationAppError("Description is required");
      }

      const type = input.type ?? existing.type;
      const startDate = input.startDate ?? existing.startDate;
      const endDate = input.endDate ?? existing.endDate;
      const startDayFraction =
        input.startDayFraction ?? existing.startDayFraction;
      const endDayFraction = input.endDayFraction ?? existing.endDayFraction;
      assertDateRange(startDate, endDate);

      if (existing.submission.status === "Ongoing" && type !== "Sick leave") {
        throw new ValidationAppError(
          "Ongoing leave is only available for sick leave"
        );
      }

      const now = new Date();
      const updated = await repository.update(actor.organizationId, id, {
        ...(type !== existing.type
          ? {
              type,
              reference: await repository.nextReference(
                actor.organizationId,
                type
              ),
            }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        startDate,
        endDate,
        startDayFraction,
        endDayFraction,
        days: calculateWorkingDays({
          startDate,
          endDate,
          startDayFraction,
          endDayFraction,
          countryCode: existing.country.code,
        }),
        updatedBy: actor.identity.subjectId,
        updatedOn: now,
      });
      if (!updated) {
        throw new NotFoundError(
          "This leave request has been deleted or removed"
        );
      }
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireLeave(actor.organizationId, id);
      await requireWalletAccess(
        actor.identity.subjectId,
        actor.organizationId,
        existing
      );
      if (existing.submission.status !== "Draft") {
        throw new ConflictError("Only draft leave requests can be deleted");
      }

      const deleted = await repository.delete(actor.organizationId, id);
      if (!deleted) {
        throw new NotFoundError(
          "This leave request has been deleted or removed"
        );
      }
    },

    async submit(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Leave> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireLeave(actor.organizationId, id);
      await requireWalletAccess(
        actor.identity.subjectId,
        actor.organizationId,
        existing
      );
      return submitLeave(actor, existing);
    },

    async evaluate(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: EvaluateLeaveInput
    ): Promise<Leave> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);

      const existing = await requireLeave(actor.organizationId, id);
      const actorId = actor.identity.subjectId;
      if (!existing.submission.lineManagerIds.includes(actorId)) {
        throw new ForbiddenError(
          "Only a line manager can evaluate this leave request"
        );
      }
      const { status } = existing.submission;
      if (status !== "Pending" && status !== "Ongoing") {
        throw new ConflictError("This leave request is not awaiting a decision");
      }

      const now = new Date();
      const updated = await repository.update(actor.organizationId, id, {
        submission: {
          ...existing.submission,
          status: input.status,
          decisionDate: now,
          decisionMakerId: actorId,
        },
        updatedBy: actorId,
        updatedOn: now,
      });
      if (!updated) {
        throw new NotFoundError(
          "This leave request has been deleted or removed"
        );
      }

      if (input.status === "Approved") {
        await calendar.upsertLeaveEvent({
          organizationId: actor.organizationId,
          leaveId: updated.id,
          reference: updated.reference,
          type: updated.type,
          requesterId: updated.createdBy,
          startDate: updated.startDate,
          endDate: updated.endDate,
        });
      }

      await notifications.notifyDecision({
        organizationId: actor.organizationId,
        leaveId: updated.id,
        reference: updated.reference,
        requesterId: updated.createdBy,
        decisionMakerId: actorId,
        status: input.status,
      });

      return updated;
    },

    async listHolidays(
      identity: SecurityIdentity | null | undefined,
      query: LeaveHolidaysQuery
    ): Promise<LeaveHolidaysResult> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");

      const countryCode =
        query.countryCode ??
        (
          await memberships.getProfile({
            organizationId: actor.organizationId,
            userId: actor.identity.subjectId,
          })
        ).country.code;
      const year = query.year ?? new Date().getUTCFullYear();

      return {
        countryCode,
        year,
        items: listPublicHolidays(countryCode, year),
      };
    },
  };
}
