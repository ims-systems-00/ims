import type {
  EnqueueEmailInput,
  EnqueueEmailResult,
} from "../../infrastructure/queue";

/**
 * Narrow mail port for Contact IMS — keeps the module free of BullMQ details.
 */
export type ContactImsEmailPort = {
  sendTransactional: (input: EnqueueEmailInput) => Promise<EnqueueEmailResult>;
};

export class NoOpContactImsEmailAdapter implements ContactImsEmailPort {
  async sendTransactional(): Promise<EnqueueEmailResult> {
    return { mode: "disabled" };
  }
}
