import type { EmailSystem } from "../../../infrastructure/queue";
import type { ContactImsEmailPort } from "../ports";
import { NoOpContactImsEmailAdapter } from "../ports";

/**
 * Live ContactImsEmailPort — delegates transactional mail to EmailSystem.
 */
export function createContactImsEmailAdapter(
  email?: EmailSystem
): ContactImsEmailPort {
  if (!email) return new NoOpContactImsEmailAdapter();
  return {
    sendTransactional: (input) => email.sendTransactional(input),
  };
}
