/**
 * Go Live side effect: provision the compliance toolkits the organisation
 * just licensed, instead of waiting for first visit (V4 becomeACustomer
 * parity). Best-effort per toolkit — failures are logged, never fail
 * Go Live; the toolkit page still auto-provisions on first visit.
 */

import type { Logger } from "../../../infrastructure/logging/logger";
import type { SecurityIdentity } from "../../../security";
import type { OrganisationGoLiveSideEffectsPort } from "../../organisation/ports";
import {
  isComplianceToolkitName,
  type ComplianceToolkitName,
  type ProvisionToolkitInput,
} from "../types";

type ComplianceProvisioner = {
  provisionToolkit(
    identity: SecurityIdentity | null | undefined,
    input: ProvisionToolkitInput
  ): Promise<{ name: ComplianceToolkitName; controlCount: number }>;
};

export function createComplianceGoLiveProvisionAdapter(deps: {
  compliance: ComplianceProvisioner;
  logger?: Logger;
}): OrganisationGoLiveSideEffectsPort {
  const { compliance, logger } = deps;

  return {
    async provisionComplianceToolkits(input) {
      for (const rawName of input.toolkitNames) {
        const name = rawName.trim();
        if (!isComplianceToolkitName(name)) {
          logger?.warn(
            { organizationId: input.organizationId, toolkit: rawName },
            "Go Live compliance provision skipped: unknown toolkit"
          );
          continue;
        }
        try {
          const result = await compliance.provisionToolkit(input.identity, {
            name,
          });
          logger?.info(
            {
              organizationId: input.organizationId,
              toolkit: result.name,
              controlCount: result.controlCount,
            },
            "Compliance toolkit provisioned at Go Live"
          );
        } catch (error) {
          // Already provisioned (Conflict) and other failures are non-fatal:
          // the org is already a customer and the page can provision later.
          logger?.warn(
            {
              organizationId: input.organizationId,
              toolkit: name,
              err: error instanceof Error ? error.message : String(error),
            },
            "Compliance toolkit provision at Go Live failed (will retry on first visit)"
          );
        }
      }
    },

    async createCardCheckoutSession(): Promise<null> {
      return null;
    },

    async notifyGoLive(): Promise<void> {
      return;
    },
  };
}
