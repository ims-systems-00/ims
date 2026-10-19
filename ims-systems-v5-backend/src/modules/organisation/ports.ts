/**
 * Optional side-effect ports for organisation onboarding (Go Live).
 * Spec: docs/module-specifications/organisation-onboarding.md
 *
 * Defaults are no-ops so create/go-live work without Stripe, email, or
 * compliance wiring. Wire real adapters from the app composer when ready.
 */

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
