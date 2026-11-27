/**
 * Cross-module ports for Live Compliance.
 */

import type { SecurityIdentity } from "../../security";
import type {
  ComplianceToolkitName,
  ControlHealth,
  ControlHealthRow,
} from "../compliance";
import type {
  ComplianceAlertEmailData,
  ComplianceDigestEmailData,
} from "../../infrastructure/email/templates/catalog/compliance";
import type { ComplianceSnapshot } from "./types";

/** Module data for one slice of the snapshot. */
export type SnapshotCollectorPort = {
  collect(
    organizationId: string,
    today: string
  ): Promise<Partial<Omit<ComplianceSnapshot, "today" | "standards">>>;
};

/** Read/write clause rows (backed by Compliance ControlStatus). */
export type LiveClauseStorePort = {
  /** Toolkit names provisioned for the organisation. */
  provisionedToolkits(organizationId: string): Promise<string[]>;
  listRows(
    organizationId: string,
    toolkits: ComplianceToolkitName[],
    clauses: string[]
  ): Promise<ControlHealthRow[]>;
  applyHealth(
    organizationId: string,
    updates: Array<{ id: string; health: ControlHealth }>
  ): Promise<void>;
};

/**
 * One-click advice commands (e.g. "risk.review"). Handlers re-check the
 * owning module's permissions through its own service.
 */
export type AdviceCommandHandler = (input: {
  identity: SecurityIdentity;
  organizationId: string;
  ref: string | null;
}) => Promise<{ message: string; source: string }>;

export type AdviceCommandRegistry = Record<string, AdviceCommandHandler>;

/** A person who can receive live-compliance notifications. */
export type LiveComplianceContact = {
  userId: string;
  name: string;
  email: string | null;
};

/** Resolve recipients outside an HTTP request (scheduler / events). */
export type LiveComplianceRecipientsPort = {
  /** Active members with the given ids (blocked / departed users dropped). */
  contacts(organizationId: string, userIds: string[]): Promise<LiveComplianceContact[]>;
  /** Fallback when a clause has no RACI owner: active Super Admins / Heads of Service. */
  admins(organizationId: string): Promise<LiveComplianceContact[]>;
  organisationName(organizationId: string): Promise<string | null>;
};

export type LiveComplianceInAppNotification = {
  recipientUserId: string;
  title: string;
  message: string;
  /** Module page or overview, resolved by the frontend link resolver. */
  module: string | null;
  clause: string;
  channels: Array<"in_app" | "email">;
};

export type LiveComplianceNotificationsPort = {
  createForRecipients(input: {
    organizationId: string;
    items: LiveComplianceInAppNotification[];
  }): Promise<void>;
};

export type LiveComplianceEmailPort = {
  sendAlert(input: {
    organizationId: string;
    to: string;
    dedupeKey: string;
    data: ComplianceAlertEmailData;
  }): Promise<void>;
  sendDigest(input: {
    organizationId: string;
    to: string;
    dedupeKey: string;
    data: ComplianceDigestEmailData;
  }): Promise<void>;
};
