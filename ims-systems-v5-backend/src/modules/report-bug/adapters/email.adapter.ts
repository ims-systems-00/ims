import type { EmailSystem } from "../../../infrastructure/queue";
import type { ReportBugEmailPort } from "../ports";
import { NoOpReportBugEmailAdapter } from "../ports";

/**
 * Live ReportBugEmailPort — delegates transactional mail to EmailSystem.
 */
export function createReportBugEmailAdapter(
  email?: EmailSystem
): ReportBugEmailPort {
  if (!email) return new NoOpReportBugEmailAdapter();
  return {
    sendTransactional: (input) => email.sendTransactional(input),
  };
}
