/**
 * Cross-module ports for Leaves.
 * Spec: docs/module-specifications/leaves.md
 */

import type { LeaveCountry, LeaveDecision, LeaveType } from "./types";

export type LeavesNotificationPort = {
  notifySubmitted(input: {
    organizationId: string;
    leaveId: string;
    reference: string;
    requesterId: string;
    lineManagerIds: string[];
  }): Promise<void>;
  notifyDecision(input: {
    organizationId: string;
    leaveId: string;
    reference: string;
    requesterId: string;
    decisionMakerId: string;
    status: LeaveDecision;
  }): Promise<void>;
};

export class NoOpLeavesNotificationAdapter implements LeavesNotificationPort {
  async notifySubmitted(): Promise<void> {
    return;
  }
  async notifyDecision(): Promise<void> {
    return;
  }
}

export type LeavesCalendarPort = {
  upsertLeaveEvent(input: {
    organizationId: string;
    leaveId: string;
    reference: string;
    type: LeaveType;
    requesterId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<void>;
};

export class NoOpLeavesCalendarAdapter implements LeavesCalendarPort {
  async upsertLeaveEvent(): Promise<void> {
    return;
  }
}

export type LeavesMemberProfile = {
  lineManagerIds: string[];
  country: LeaveCountry;
};

export type LeavesMembershipPort = {
  getProfile(input: {
    organizationId: string;
    userId: string;
  }): Promise<LeavesMemberProfile>;
  /** Users whose membership lists `managerId` as a line manager. */
  listManagedUserIds(input: {
    organizationId: string;
    managerId: string;
  }): Promise<string[]>;
};

export class NoOpLeavesMembershipAdapter implements LeavesMembershipPort {
  async getProfile(): Promise<LeavesMemberProfile> {
    return {
      lineManagerIds: [],
      country: { name: "United Kingdom", code: "GB" },
    };
  }
  async listManagedUserIds(): Promise<string[]> {
    return [];
  }
}
