/**
 * Cross-module ports for Compliance.
 * Spec: docs/module-specifications/compliance.md §5
 */

import {
  COMPLIANCE_TOOLKIT_NAMES,
  type ComplianceToolkitName,
} from "./types";

/**
 * Organisation licence entitlements for compliance toolkits.
 * License Management owns the real source; development stubs all toolkits.
 */
export type ComplianceLicencePort = {
  listLicensedToolkits(organizationId: string): Promise<ComplianceToolkitName[]>;
  isToolkitLicensed(
    organizationId: string,
    name: ComplianceToolkitName
  ): Promise<boolean>;
};

export class DevAllComplianceLicencesAdapter implements ComplianceLicencePort {
  async listLicensedToolkits(): Promise<ComplianceToolkitName[]> {
    return [...COMPLIANCE_TOOLKIT_NAMES];
  }

  async isToolkitLicensed(): Promise<boolean> {
    return true;
  }
}

/**
 * Optional IAM grant after provisioning (Membership / Our IMS).
 * No-op until Membership toolkit assignment is available.
 */
export type ComplianceIamGrantPort = {
  grantToolkitAccess(input: {
    organizationId: string;
    toolkitName: ComplianceToolkitName;
    actorId: string;
  }): Promise<void>;
};

export class NoOpComplianceIamGrantAdapter implements ComplianceIamGrantPort {
  async grantToolkitAccess(): Promise<void> {
    return;
  }
}

/**
 * Notify organisation members when a control becomes Implemented.
 */
export type ComplianceNotificationPort = {
  notifyControlImplemented(input: {
    organizationId: string;
    actorId: string;
    actorName?: string;
    controlStatusId: string;
    toolkitName: ComplianceToolkitName;
    clause: string;
    title: string;
  }): Promise<void>;
};

export class NoOpComplianceNotificationAdapter
  implements ComplianceNotificationPort
{
  async notifyControlImplemented(): Promise<void> {
    return;
  }
}

/**
 * Automated activity timeline when a control becomes Implemented.
 */
export type ComplianceActivityPort = {
  recordControlImplemented(input: {
    organizationId: string;
    actorId: string;
    actorName?: string;
    controlStatusId: string;
    message: string;
  }): Promise<void>;
};

export class NoOpComplianceActivityAdapter implements ComplianceActivityPort {
  async recordControlImplemented(): Promise<void> {
    return;
  }
}

/**
 * Optional post-provision automation scan (no queues in V5 foundation).
 */
export type ComplianceAutomationPort = {
  onToolkitProvisioned(input: {
    organizationId: string;
    toolkitName: ComplianceToolkitName;
    actorId: string;
  }): Promise<void>;
};

export class NoOpComplianceAutomationAdapter
  implements ComplianceAutomationPort
{
  async onToolkitProvisioned(): Promise<void> {
    return;
  }
}

/** Validate linked operational records exist in the same organisation. */
export type ComplianceEvidenceLinkPort = {
  riskExists(organizationId: string, id: string): Promise<boolean>;
  incidentExists(organizationId: string, id: string): Promise<boolean>;
  cipExists(organizationId: string, id: string): Promise<boolean>;
  /**
   * Document Management is not yet implemented in V5.
   * Adapter may return false to reject links until Documents ships.
   */
  documentExists(organizationId: string, id: string): Promise<boolean>;
};

export class DevAllowEvidenceLinksAdapter
  implements ComplianceEvidenceLinkPort
{
  async riskExists(): Promise<boolean> {
    return true;
  }
  async incidentExists(): Promise<boolean> {
    return true;
  }
  async cipExists(): Promise<boolean> {
    return true;
  }
  async documentExists(): Promise<boolean> {
    return true;
  }
}

/**
 * Mirror Compliance risk-evidence onto the Risk.complianceLinks field.
 * Avoids calling Risk→Compliance sync (prevents loops).
 */
export type ComplianceRiskMirrorPort = {
  addClause(input: {
    organizationId: string;
    riskId: string;
    toolkitId: string;
    clause: string;
  }): Promise<void>;
  removeClause(input: {
    organizationId: string;
    riskId: string;
    toolkitId: string;
    clause: string;
  }): Promise<void>;
};

export class NoOpComplianceRiskMirrorAdapter
  implements ComplianceRiskMirrorPort
{
  async addClause(): Promise<void> {
    return;
  }
  async removeClause(): Promise<void> {
    return;
  }
}

/**
 * Mirror Compliance incident-evidence onto Incident.complianceLinks.
 */
export type ComplianceIncidentMirrorPort = {
  addClause(input: {
    organizationId: string;
    incidentId: string;
    toolkitId: string;
    clause: string;
  }): Promise<void>;
  removeClause(input: {
    organizationId: string;
    incidentId: string;
    toolkitId: string;
    clause: string;
  }): Promise<void>;
};

export class NoOpComplianceIncidentMirrorAdapter
  implements ComplianceIncidentMirrorPort
{
  async addClause(): Promise<void> {
    return;
  }
  async removeClause(): Promise<void> {
    return;
  }
}

/**
 * Mirror Compliance cip-evidence onto OFI.complianceLinks.
 */
export type ComplianceOfiMirrorPort = {
  addClause(input: {
    organizationId: string;
    ofiId: string;
    toolkitId: string;
    clause: string;
  }): Promise<void>;
  removeClause(input: {
    organizationId: string;
    ofiId: string;
    toolkitId: string;
    clause: string;
  }): Promise<void>;
};

export class NoOpComplianceOfiMirrorAdapter
  implements ComplianceOfiMirrorPort
{
  async addClause(): Promise<void> {
    return;
  }
  async removeClause(): Promise<void> {
    return;
  }
}
