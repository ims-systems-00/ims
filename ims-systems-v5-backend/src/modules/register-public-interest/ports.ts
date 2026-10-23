import type {
  EnqueueEmailInput,
  EnqueueEmailResult,
} from "../../infrastructure/queue";

/**
 * Narrow mail port for Register Public Interest.
 */
export type RegisterPublicInterestEmailPort = {
  sendTransactional: (input: EnqueueEmailInput) => Promise<EnqueueEmailResult>;
};

export class NoOpRegisterPublicInterestEmailAdapter
  implements RegisterPublicInterestEmailPort
{
  async sendTransactional(): Promise<EnqueueEmailResult> {
    return { mode: "disabled" };
  }
}
