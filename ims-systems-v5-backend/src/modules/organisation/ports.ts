/**
 * Optional side-effect ports for organisation onboarding (Go Live).
 * Spec: docs/module-specifications/organisation-onboarding.md
 *
 * Defaults are no-ops so create/go-live work without Stripe, email, or
 * compliance wiring. Wire real adapters from the app composer when ready.
 */

import type { SecurityIdentity } from "../../security";

export type GoLivePaymentSession = {
  url: string;
};

export type OrganisationGoLiveSideEffectsPort = {
  /**
   * Provision compliance toolkit records for the newly activated customer.
   * Best-effort: failures should be logged by the adapter, not fail Go Live.
   */
  provisionComplianceToolkits(input: {
    organizationId: string;
    actorId: string;
    /** Actor identity for downstream authorisation (compliance create). */
    identity: SecurityIdentity;
    toolkitNames: string[];
  }): Promise<void>;

  /**
   * Create card checkout session. Return null when payments are not configured.
   */
  createCardCheckoutSession(input: {
    organizationId: string;
    actorId: string;
  }): Promise<GoLivePaymentSession | null>;

  /**
   * Ensure the organisation's file-storage bucket exists (N-09).
   * Best-effort: failures must be logged by the adapter, not thrown.
   * Optional — adapters without file-storage concerns omit it.
   */
  ensureFileStorage?(input: { organizationId: string }): Promise<void>;

  /**
   * Create/link the organisation's Auth0 Organization (N-09 remainder).
   * Best-effort: failures must be logged by the adapter, not thrown.
   * Optional — omitted until the Management API M2M app is configured.
   */
  ensureAuth0Organisation?(input: { organizationId: string }): Promise<void>;

  /**
   * Notify internal teams (invoice Go Live) and/or the activating user.
   */
  notifyGoLive(input: {
    organizationId: string;
    actorId: string;
    actorEmail?: string;
    paymentType: "Card" | "Monthly invoice";
    licences: {
      superUser: number;
      users: number;
      groups: number;
      complianceTools: string[];
    };
  }): Promise<void>;
};

export class NoOpOrganisationGoLiveSideEffectsAdapter
  implements OrganisationGoLiveSideEffectsPort
{
  async ensureFileStorage(): Promise<void> {
    return;
  }

  async ensureAuth0Organisation(): Promise<void> {
    return;
  }

  async provisionComplianceToolkits(): Promise<void> {
    return;
  }

  async createCardCheckoutSession(): Promise<GoLivePaymentSession | null> {
    return null;
  }

  async notifyGoLive(): Promise<void> {
    return;
  }
}
