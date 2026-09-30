/**
 * Adapters implementing other modules' Calendar ports.
 * Spec: docs/module-specifications/calendar.md §5
 */

import type { AuditCalendarPort } from "../../audits/ports";
import type { IncidentCalendarPort } from "../../incidents/ports";
import type { ManagementReviewCalendarPort } from "../../management-reviews/ports";
import type { SupplierCalendarPort } from "../../suppliers/ports";
import type { TaskCalendarPort } from "../../tasks/ports";
import {
  applyTimeOfDay,
  type CalendarService,
} from "../services/calendar.service";

export function createTaskCalendarAdapter(
  calendar: CalendarService
): TaskCalendarPort {
  return {
    async upsertDueDateEvent(input) {
      await calendar.upsertSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.taskId,
        eventReference: "task",
        title: `${input.name} (Task manager)`,
        description: `Task ${input.reference} due`,
        start: input.dueDate,
        end: input.dueDate,
        color: "default",
        attendeeIds: input.assigneeIds,
        groupIds: [],
        actorId: "system:tasks",
      });
    },
    async removeDueDateEvent(input) {
      await calendar.removeSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.taskId,
        eventReference: "task",
      });
    },
  };
}

export function createAuditCalendarAdapter(
  calendar: CalendarService
): AuditCalendarPort {
  return {
    async upsertAuditEvent(input) {
      const start = applyTimeOfDay(input.startDate, input.time);
      await calendar.upsertSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.auditId,
        eventReference: "audit",
        title: input.title,
        description: `${input.type} audit ${input.reference}`,
        start,
        end: start,
        color: "green",
        attendeeIds: [input.auditorId],
        groupIds: [input.businessUnitId, input.complianceBodyId].filter(
          Boolean
        ),
        actorId: "system:audits",
      });
    },
    async removeAuditEvent(input) {
      await calendar.removeSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.auditId,
        eventReference: "audit",
      });
    },
  };
}

export function createIncidentCalendarAdapter(
  calendar: CalendarService
): IncidentCalendarPort {
  return {
    async upsertPriorityEvent(input) {
      const now = new Date();
      await calendar.upsertSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.incidentId,
        eventReference: "incident",
        title: input.title,
        description: `P1 incident ${input.reference}`,
        start: now,
        end: now,
        color: "red",
        attendeeIds: [],
        groupIds: input.businessUnitId ? [input.businessUnitId] : [],
        actorId: "system:incidents",
      });
    },
    async removePriorityEvent(input) {
      await calendar.removeSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.incidentId,
        eventReference: "incident",
      });
    },
  };
}

export function createSupplierCalendarAdapter(
  calendar: CalendarService
): SupplierCalendarPort {
  return {
    async upsertReviewEvent(input) {
      if (!input.reviewDate) {
        await calendar.removeSystemEvent({
          organizationId: input.organizationId,
          systemEventId: input.supplierId,
          eventReference: "supplier",
        });
        return;
      }
      await calendar.upsertSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.supplierId,
        eventReference: "supplier",
        title: `${input.name} (Supplier review)`,
        description: `Supplier ${input.reference} review`,
        start: input.reviewDate,
        end: input.reviewDate,
        color: "orange",
        attendeeIds: [],
        groupIds: input.businessUnitId ? [input.businessUnitId] : [],
        actorId: "system:suppliers",
      });
    },
    async removeReviewEvent(input) {
      await calendar.removeSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.supplierId,
        eventReference: "supplier",
      });
    },
  };
}

export function createManagementReviewCalendarAdapter(
  calendar: CalendarService
): ManagementReviewCalendarPort {
  return {
    async upsertReviewEvent(input) {
      const start = applyTimeOfDay(input.date, input.time);
      const attendeeLine =
        input.attendeeIds.length > 0
          ? `Attendees: ${input.attendeeIds.join(", ")}`
          : "No attendees listed";
      await calendar.upsertSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.reviewId,
        eventReference: "managementreview",
        title: input.title,
        description: `Management review ${input.reference}. ${attendeeLine}`,
        start,
        end: start,
        color: "azure",
        attendeeIds: input.attendeeIds,
        groupIds: input.businessUnitId ? [input.businessUnitId] : [],
        actorId: "system:management-reviews",
      });
    },
    async removeReviewEvent(input) {
      await calendar.removeSystemEvent({
        organizationId: input.organizationId,
        systemEventId: input.reviewId,
        eventReference: "managementreview",
      });
    },
  };
}
