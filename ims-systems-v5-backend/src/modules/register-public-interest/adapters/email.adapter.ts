import type { EmailSystem } from "../../../infrastructure/queue";
import type { RegisterPublicInterestEmailPort } from "../ports";
import { NoOpRegisterPublicInterestEmailAdapter } from "../ports";

/**
 * Live RegisterPublicInterestEmailPort — delegates to EmailSystem.
 */
export function createRegisterPublicInterestEmailAdapter(
  email?: EmailSystem
): RegisterPublicInterestEmailPort {
  if (!email) return new NoOpRegisterPublicInterestEmailAdapter();
  return {
    sendTransactional: (input) => email.sendTransactional(input),
  };
}
