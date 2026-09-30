/**
 * Management Review application service.
 * Spec: docs/module-specifications/management-review.md
 *
 * KPI/Objectives are out of scope (separate kpi-objective.md).
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
  ManagementReviewCalendarPort,
  ManagementReviewListScopePort,
  ManagementReviewNotificationPort,
  ManagementReviewTaskPort,
} from "../ports";
import {
  newAttachmentId,
  type PersistManagementReviewCreate,
  type ManagementReviewRepository,
} from "../repositories/management-review.repository";
import {
  INTERVAL_OCCURRENCES,
  MANAGEMENT_REVIEWS_RESOURCE,
  type AttachmentInput,
  type CreateManagementReviewInput,
  type ListManagementReviewsQuery,
  type ManagementReview,
  type ManagementReviewStats,
  type PaginatedManagementReviews,
  type ReviewAttachment,
  type ReviewInterval,
  type UpdateManagementReviewInput,
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

/**
 * Concurrency-safe reference (V5 pattern). Spec format is MR-{number};
 * sequential counters are not yet a shared platform capability.
 */
function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MR-${stamp}-${rand}`;
}

function assertNotCompleted(review: ManagementReview): void {
  if (review.completed.status) {
    throw new ConflictError("Completed management reviews cannot be modified");
  }
}

/**
 * Spread occurrences across the year; move weekend dates to Monday.
 * Spec §2 / §9: Monthly×12, Quarterly×4, Half yearly×2, Yearly×1.
 */
export function buildScheduleDates(
  startDate: Date,
  interval: ReviewInterval
): Date[] {
  const occurrences = INTERVAL_OCCURRENCES[interval];
  const monthsApart = 12 / occurrences;
  const dates: Date[] = [];

  for (let i = 0; i < occurrences; i += 1) {
    const scheduled = new Date(startDate);
    scheduled.setMonth(scheduled.getMonth() + Math.round(i * monthsApart));
    dates.push(adjustWeekend(scheduled));
  }
  return dates;
}

function adjustWeekend(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  if (day === 0) result.setDate(result.getDate() + 1);
  else if (day === 6) result.setDate(result.getDate() + 2);
  return result;
}

function mapAttachments(
  input: AttachmentInput[] | undefined,
  actorId: string
): ReviewAttachment[] {
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

export type ManagementReviewServiceDeps = {
  repository: ManagementReviewRepository;
  authorizer: Authorizer;
  notifications: ManagementReviewNotificationPort;
  calendar: ManagementReviewCalendarPort;
  tasks: ManagementReviewTaskPort;
  listScope: ManagementReviewListScopePort;
};

export type ManagementReviewService = ReturnType<
  typeof createManagementReviewService
>;

export function createManagementReviewService(
  deps: ManagementReviewServiceDeps
) {
  const { repository, authorizer, notifications, calendar, tasks, listScope } =
    deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: MANAGEMENT_REVIEWS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access management reviews"
      );
    }
  }

  async function requireReview(
    organizationId: string,
    id: string
  ): Promise<ManagementReview> {
    const review = await repository.findById(organizationId, id);
    if (!review) {
      throw new NotFoundError(
        "This management review has been deleted or removed"
      );
    }
    return review;
  }

  async function syncCalendar(review: ManagementReview): Promise<void> {
    await calendar.upsertReviewEvent({
      organizationId: review.organizationId,
      reviewId: review.id,
      reference: review.reference,
      title: review.title,
      date: review.date,
      time: review.time,
      attendeeIds: review.attendees,
      businessUnitId: review.businessUnitId,
    });
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateManagementReviewInput
    ): Promise<{ items: ManagementReview[] }> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      if (!input.title?.trim()) {
        throw new ValidationAppError("Title is required");
      }
      if (!(input.date instanceof Date) || Number.isNaN(input.date.getTime())) {
        throw new ValidationAppError("Date is required");
      }

      const privacy = input.privacy ?? "Organisational";
      if (privacy === "Business unit" && !input.businessUnitId?.trim()) {
        throw new ValidationAppError(
          "Business unit is required when privacy is Business unit"
        );
      }

      const createdOn = new Date();
      const scheduleDates = buildScheduleDates(input.date, input.interval);
      const firstAgenda = mapAttachments(
        input.agenda,
        actor.identity.subjectId
      );
      const firstMinutes = mapAttachments(
        input.minutes,
        actor.identity.subjectId
      );
      const attendees = [...new Set(input.attendees ?? [])];

      const payloads: PersistManagementReviewCreate[] = scheduleDates.map(
        (date, index) => ({
          reference: nextReference(),
          title: input.title.trim(),
          date,
          time: input.time?.trim() || undefined,
          interval: input.interval,
          privacy,
          businessUnitId:
            privacy === "Business unit"
              ? input.businessUnitId
              : input.businessUnitId || undefined,
          attendees,
          agenda: index === 0 ? firstAgenda : [],
          minutes: index === 0 ? firstMinutes : [],
          createdBy: actor.identity.subjectId,
          createdOn,
        })
      );

      const items = await repository.createMany(
        actor.organizationId,
        payloads
      );

      for (const review of items) {
        await notifications.notifyScheduled({
          organizationId: actor.organizationId,
          reviewId: review.id,
          title: review.title,
          reference: review.reference,
          attendeeIds: review.attendees,
          privacy: review.privacy,
          businessUnitId: review.businessUnitId,
        });
        await syncCalendar(review);
      }

      return { items };
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListManagementReviewsQuery
    ): Promise<PaginatedManagementReviews> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });
      return repository.list(actor.organizationId, query, scope);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireReview(actor.organizationId, id);
    },

    async stats(
      identity: SecurityIdentity | null | undefined
    ): Promise<ManagementReviewStats> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });
      return repository.stats(actor.organizationId, scope);
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateManagementReviewInput
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      // Spec: update uses create permission on backend.
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireReview(actor.organizationId, id);
      assertNotCompleted(existing);

      if (input.privacy === "Business unit" && !existing.businessUnitId) {
        throw new ValidationAppError(
          "Business unit is required when privacy is Business unit"
        );
      }

      const patch: Parameters<ManagementReviewRepository["update"]>[2] = {
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      };

      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.date !== undefined) patch.date = input.date;
      if (input.time !== undefined) patch.time = input.time;
      if (input.privacy !== undefined) patch.privacy = input.privacy;
      if (input.attendees !== undefined) {
        patch.attendees = [...new Set(input.attendees)];
      }

      if (input.agenda && input.agenda.length > 0) {
        const added = mapAttachments(input.agenda, actor.identity.subjectId);
        patch.agenda = [...existing.agenda, ...added];
      }
      if (input.minutes && input.minutes.length > 0) {
        const added = mapAttachments(input.minutes, actor.identity.subjectId);
        patch.minutes = [...existing.minutes, ...added];
      }

      const updated = await repository.update(
        actor.organizationId,
        id,
        patch
      );
      if (!updated) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
        );
      }

      await syncCalendar(updated);
      return updated;
    },

    async complete(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireReview(actor.organizationId, id);
      if (existing.completed.status) {
        throw new ConflictError("Management review is already completed");
      }

      // Spec intended rule using `date` (V4 incorrectly referenced scheduledDate).
      if (Date.now() < existing.date.getTime()) {
        throw new ConflictError(
          "Management review cannot be completed before the schedule date"
        );
      }

      const completedOn = new Date();
      const updated = await repository.update(actor.organizationId, id, {
        completed: {
          status: true,
          by: actor.identity.subjectId,
          on: completedOn,
        },
        updatedBy: actor.identity.subjectId,
        updatedOn: completedOn,
      });
      if (!updated) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
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

      const existing = await requireReview(actor.organizationId, id);
      if (existing.completed.status) {
        throw new ConflictError("Completed management reviews cannot be deleted");
      }

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
        );
      }

      await tasks.removeTasksSourcedFromReview({
        organizationId: actor.organizationId,
        reviewId: existing.id,
      });
      await calendar.removeReviewEvent({
        organizationId: actor.organizationId,
        reviewId: existing.id,
      });
    },

    async addAgenda(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachments: AttachmentInput[]
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireReview(actor.organizationId, id);
      assertNotCompleted(existing);

      const added = mapAttachments(attachments, actor.identity.subjectId);
      const updated = await repository.update(actor.organizationId, id, {
        agenda: [...existing.agenda, ...added],
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
        );
      }
      return updated;
    },

    async removeAgenda(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireReview(actor.organizationId, id);
      assertNotCompleted(existing);

      const next = existing.agenda.filter((a) => a.id !== attachmentId);
      if (next.length === existing.agenda.length) {
        throw new NotFoundError("Agenda attachment not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        agenda: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
        );
      }
      return updated;
    },

    async addMinutes(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachments: AttachmentInput[]
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireReview(actor.organizationId, id);
      assertNotCompleted(existing);

      const added = mapAttachments(attachments, actor.identity.subjectId);
      const updated = await repository.update(actor.organizationId, id, {
        minutes: [...existing.minutes, ...added],
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
        );
      }
      return updated;
    },

    async removeMinutes(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attachmentId: string
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireReview(actor.organizationId, id);
      assertNotCompleted(existing);

      const next = existing.minutes.filter((a) => a.id !== attachmentId);
      if (next.length === existing.minutes.length) {
        throw new NotFoundError("Minutes attachment not found");
      }

      const updated = await repository.update(actor.organizationId, id, {
        minutes: next,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
        );
      }
      return updated;
    },

    async addAttendee(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attendeeId: string
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireReview(actor.organizationId, id);
      assertNotCompleted(existing);

      if (existing.attendees.includes(attendeeId)) {
        return existing;
      }

      const updated = await repository.update(actor.organizationId, id, {
        attendees: [...existing.attendees, attendeeId],
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
        );
      }
      await syncCalendar(updated);
      return updated;
    },

    async removeAttendee(
      identity: SecurityIdentity | null | undefined,
      id: string,
      attendeeId: string
    ): Promise<ManagementReview> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireReview(actor.organizationId, id);
      assertNotCompleted(existing);

      if (!existing.attendees.includes(attendeeId)) {
        throw new NotFoundError("Attendee not found on this review");
      }

      const updated = await repository.update(actor.organizationId, id, {
        attendees: existing.attendees.filter((a) => a !== attendeeId),
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError(
          "This management review has been deleted or removed"
        );
      }
      await syncCalendar(updated);
      return updated;
    },
  };
}
