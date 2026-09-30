/**
 * Cross-module ports for OFI.
 * Spec: docs/module-specifications/ofi.md §5
 */

import type { Ofi } from "./types";

export type OfiNotificationPort = {
  notifyOwnerAssigned(input: {
    organizationId: string;
    ofiId: string;
    title: string;
    reference: string;
    ownerId: string;
  }): Promise<void>;
  notifyImplemented(input: {
    organizationId: string;
    ofiId: string;
    title: string;
    reference: string;
    businessUnitId: string;
  }): Promise<void>;
  notifyNudge(input: {
    organizationId: string;
    ofiId: string;
    title: string;
    reference: string;
    ownerId: string;
  }): Promise<void>;
};

export class NoOpOfiNotificationAdapter implements OfiNotificationPort {
  async notifyOwnerAssigned(): Promise<void> {
    return;
  }
  async notifyImplemented(): Promise<void> {
    return;
  }
  async notifyNudge(): Promise<void> {
    return;
  }
}

export type OfiTaskPort = {
  removeTasksSourcedFromOfi(input: {
    organizationId: string;
    ofiId: string;
  }): Promise<void>;
};

export class NoOpOfiTaskAdapter implements OfiTaskPort {
  async removeTasksSourcedFromOfi(): Promise<void> {
    return;
  }
}

/**
 * Role-based list visibility — IAM roles not yet on SecurityIdentity.
 * Development returns org-wide access.
 */
export type OfiListScope =
  | { mode: "all" }
  | {
      mode: "businessUnits";
      businessUnitIds: string[];
    };

export type OfiListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<OfiListScope>;
};

export class DevAllOfisListScopeAdapter implements OfiListScopePort {
  async resolveScope(): Promise<OfiListScope> {
    return { mode: "all" };
  }
}

export type { Ofi };
