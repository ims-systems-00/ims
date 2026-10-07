/**
 * Adapters bridging Activities to OFI follow-up.
 */

import type { ActivityOfiFollowUpPort } from "../ports";

/**
 * Narrow OFI surface used when an Activity is created against a CIP/OFI record.
 */
export type OfiInProgressFollowUp = {
  markInProgressIfPending(
    organizationId: string,
    ofiId: string
  ): Promise<void>;
};

export function createActivityOfiFollowUpAdapter(
  ofi: OfiInProgressFollowUp
): ActivityOfiFollowUpPort {
  return {
    async onCipActivityCreated(input) {
      await ofi.markInProgressIfPending(input.organizationId, input.ofiId);
    },
  };
}
