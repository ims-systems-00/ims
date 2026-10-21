/**
 * Merge optional Go Live side-effect adapters (Stripe, email notify, …).
 */

import type {
  GoLivePaymentSession,
  OrganisationGoLiveSideEffectsPort,
} from "../ports";

export function composeGoLiveSideEffects(
  parts: Array<OrganisationGoLiveSideEffectsPort | undefined>
): OrganisationGoLiveSideEffectsPort | undefined {
  const adapters = parts.filter(
    (part): part is OrganisationGoLiveSideEffectsPort => part != null
  );
  if (adapters.length === 0) return undefined;
  if (adapters.length === 1) return adapters[0];

  return {
    async provisionComplianceToolkits(input) {
      for (const adapter of adapters) {
        await adapter.provisionComplianceToolkits(input);
      }
    },

    async createCardCheckoutSession(input): Promise<GoLivePaymentSession | null> {
      for (const adapter of adapters) {
        const session = await adapter.createCardCheckoutSession(input);
        if (session) return session;
      }
      return null;
    },

    async notifyGoLive(input) {
      for (const adapter of adapters) {
        await adapter.notifyGoLive(input);
      }
    },
  };
}
