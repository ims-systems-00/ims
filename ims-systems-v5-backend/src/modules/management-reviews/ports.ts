/**
 * Cross-module ports for Management Review.
 * Spec: docs/module-specifications/management-review.md §5
 */

import type { ManagementReview } from "./types";

export type ManagementReviewNotificationPort = {
  notifyScheduled(input: {
    organizationId: string;
    reviewId: string;
    title: string;
    reference: string;
    attendeeIds: string[];
    privacy: string;
    businessUnitId?: string;
  }): Promise<void>;
};

export class NoOpManagementReviewNotificationAdapter
  implements ManagementReviewNotificationPort
{
  async notifyScheduled(): Promise<void> {
    return;
  }
}

/**
 * Calendar module not implemented — development no-op.
 */
export type ManagementReviewCalendarPort = {
  upsertReviewEvent(input: {
    organizationId: string;
    reviewId: string;
    reference: string;
    title: string;
    date: Date;
    time?: string;
    attendeeIds: string[];
    businessUnitId?: string;
  }): Promise<void>;
  removeReviewEvent(input: {
    organizationId: string;
    reviewId: string;
  }): Promise<void>;
};

export class NoOpManagementReviewCalendarAdapter
  implements ManagementReviewCalendarPort
{
  async upsertReviewEvent(): Promise<void> {
    return;
  }
  async removeReviewEvent(): Promise<void> {
    return;
  }
}

/**
 * Tasks sourced from a management review are removed when the review is deleted.
 */
export type ManagementReviewTaskPort = {
  removeTasksSourcedFromReview(input: {
    organizationId: string;
    reviewId: string;
  }): Promise<void>;
};

export class NoOpManagementReviewTaskAdapter
  implements ManagementReviewTaskPort
{
  async removeTasksSourcedFromReview(): Promise<void> {
    return;
  }
}

/**
 * Role-based list visibility (Super Admin / Auditor → all;
 * HoS / Basic → BU scoped). IAM roles not yet on SecurityIdentity —
 * development returns org-wide access.
 */
export type ManagementReviewListScope =
  | { mode: "all" }
  | {
      mode: "businessUnits";
      businessUnitIds: string[];
      includeOrganisational: boolean;
    };

export type ManagementReviewListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<ManagementReviewListScope>;
};

export class DevAllManagementReviewsListScopeAdapter
  implements ManagementReviewListScopePort
{
  async resolveScope(): Promise<ManagementReviewListScope> {
    return { mode: "all" };
  }
}

export type { ManagementReview };
