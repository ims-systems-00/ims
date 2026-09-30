/**
 * Cross-module ports for Audit.
 * Spec: docs/module-specifications/audit.md §5 / §11
 */

import type { SecurityIdentity } from "../../security";
import type {
  Audit,
  AuditEmbeddedRisk,
  AuditIdentification,
  AuditOfi,
  ExtractReportInput,
} from "./types";

export type AuditNotificationPort = {
  notifyScheduled(input: {
    organizationId: string;
    auditId: string;
    title: string;
    reference: string;
    auditorId: string;
    businessUnitId: string;
  }): Promise<void>;
};

export class NoOpAuditNotificationAdapter implements AuditNotificationPort {
  async notifyScheduled(): Promise<void> {
    return;
  }
}

/**
 * Calendar module not implemented — development no-op.
 */
export type AuditCalendarPort = {
  upsertAuditEvent(input: {
    organizationId: string;
    auditId: string;
    reference: string;
    title: string;
    type: string;
    startDate: Date;
    time?: string;
    businessUnitId: string;
    complianceBodyId: string;
    auditorId: string;
  }): Promise<void>;
  removeAuditEvent(input: {
    organizationId: string;
    auditId: string;
  }): Promise<void>;
};

export class NoOpAuditCalendarAdapter implements AuditCalendarPort {
  async upsertAuditEvent(): Promise<void> {
    return;
  }
  async removeAuditEvent(): Promise<void> {
    return;
  }
}

/**
 * Tasks sourced from an audit are removed when the audit is deleted.
 */
export type AuditTaskPort = {
  removeTasksSourcedFromAudit(input: {
    organizationId: string;
    auditId: string;
  }): Promise<void>;
};

export class NoOpAuditTaskAdapter implements AuditTaskPort {
  async removeTasksSourcedFromAudit(): Promise<void> {
    return;
  }
}

/**
 * PDF + email report extraction is asynchronous in V4.
 * Report infrastructure is out of scope — development no-op records acceptance.
 */
export type AuditReportPort = {
  enqueueExtractReport(input: {
    organizationId: string;
    audit: Audit;
    recipientName: string;
    recipientEmail: string;
    senderSubjectId: string;
  }): Promise<void>;
};

export class NoOpAuditReportAdapter implements AuditReportPort {
  async enqueueExtractReport(_input: {
    organizationId: string;
    audit: Audit;
    recipientName: string;
    recipientEmail: string;
    senderSubjectId: string;
  }): Promise<void> {
    return;
  }
}

export type PromoteNonConformityInput = {
  identity: SecurityIdentity;
  organizationId: string;
  auditId: string;
  identification: AuditIdentification;
  businessUnitId: string;
  auditorId: string;
};

export type PromoteEmbeddedRiskInput = {
  identity: SecurityIdentity;
  organizationId: string;
  auditId: string;
  risk: AuditEmbeddedRisk;
  businessUnitId: string;
  auditorId: string;
};

export type PromoteOfiInput = {
  identity: SecurityIdentity;
  organizationId: string;
  auditId: string;
  ofi: AuditOfi;
  businessUnitId: string;
  auditorId: string;
};

/**
 * On completion, non-conformities → Incidents (same embedded id preferred).
 * Incident module create-with-id is not yet exposed — adapters create with source link.
 */
export type AuditIncidentPromotionPort = {
  promoteNonConformity(input: PromoteNonConformityInput): Promise<{ id: string }>;
};

export class NoOpAuditIncidentPromotionAdapter
  implements AuditIncidentPromotionPort
{
  async promoteNonConformity(
    input: PromoteNonConformityInput
  ): Promise<{ id: string }> {
    return { id: input.identification.id };
  }
}

/**
 * On completion, embedded risks → Organisational risks.
 */
export type AuditRiskPromotionPort = {
  promoteEmbeddedRisk(input: PromoteEmbeddedRiskInput): Promise<{ id: string }>;
};

export class NoOpAuditRiskPromotionAdapter implements AuditRiskPromotionPort {
  async promoteEmbeddedRisk(
    input: PromoteEmbeddedRiskInput
  ): Promise<{ id: string }> {
    return { id: input.risk.id };
  }
}

/**
 * On completion, embedded OFIs → standalone OFI (CIP) records.
 */
export type AuditCipPromotionPort = {
  promoteOfi(input: PromoteOfiInput): Promise<{ id: string }>;
};

export class NoOpAuditCipPromotionAdapter implements AuditCipPromotionPort {
  async promoteOfi(input: PromoteOfiInput): Promise<{ id: string }> {
    return { id: input.ofi.id };
  }
}

/**
 * Role-based list visibility (Super Admin / Auditor → all;
 * HoS / Basic → BU + unassigned; External → BU only).
 * IAM roles are not on SecurityIdentity yet — development returns org-wide access.
 */
export type AuditListScope =
  | { mode: "all" }
  | {
      mode: "businessUnits";
      businessUnitIds: string[];
      includeUnassigned: boolean;
    };

export type AuditListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<AuditListScope>;
};

export class DevAllAuditsListScopeAdapter implements AuditListScopePort {
  async resolveScope(): Promise<AuditListScope> {
    return { mode: "all" };
  }
}

export type { ExtractReportInput };
