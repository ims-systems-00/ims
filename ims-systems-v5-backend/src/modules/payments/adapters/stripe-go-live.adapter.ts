/**
 * Stripe-backed Go Live side effects (Card checkout).
 * Spec: docs/module-specifications/stripe-payments.md
 */

import type { Logger } from "../../../infrastructure/logging/logger";
import type {
  GoLivePaymentSession,
  OrganisationGoLiveSideEffectsPort,
} from "../../organisation/ports";
import type { OrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type { StripePaymentService } from "../services/stripe-payment.service";

export function createStripeGoLiveSideEffectsAdapter(deps: {
  payments: StripePaymentService;
  organisations: OrganisationRepository;
  logger?: Logger;
}): OrganisationGoLiveSideEffectsPort {
  const { payments, organisations, logger } = deps;

  return {
    async provisionComplianceToolkits(): Promise<void> {
      // Compliance toolkit Mongo records are provisioned elsewhere (C-01/C-02).
    },

    async createCardCheckoutSession(input: {
      organizationId: string;
      actorId: string;
    }): Promise<GoLivePaymentSession | null> {
      const org = await organisations.findById(input.organizationId);
      if (!org) return null;

      const session = await payments.createCheckoutSessionForOrg({
        organizationId: input.organizationId,
        licences: {
          groups: org.licences.groups.allocated,
          users: org.licences.users.allocated,
          superUser: org.licences.superUser.allocated,
          complianceTools: org.licences.complianceTools,
          additionalModules: org.licences.additionalModules,
          includeToolkitsAndModules: true,
        },
      });

      logger?.info(
        {
          organizationId: input.organizationId,
          actorId: input.actorId,
          sessionId: session.id,
        },
        "Stripe Go Live checkout session created"
      );
      return { url: session.url };
    },

    async notifyGoLive(): Promise<void> {
      // Invoice-path email notify is a separate N-07/N-09 concern.
    },
  };
}
