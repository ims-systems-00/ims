import type {
  EnqueueEmailInput,
  EnqueueEmailResult,
} from "../../infrastructure/queue";

/**
 * Narrow mail port for Report Bug — keeps the module free of BullMQ details.
 */
export type ReportBugEmailPort = {
  sendTransactional: (input: EnqueueEmailInput) => Promise<EnqueueEmailResult>;
};

export class NoOpReportBugEmailAdapter implements ReportBugEmailPort {
  async sendTransactional(): Promise<EnqueueEmailResult> {
    return { mode: "disabled" };
  }
}
