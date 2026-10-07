import type { SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  buildReporterConfirmationEmail,
  buildSupportBugReportEmail,
} from "../lib/email-bodies";
import type { ReportBugEmailPort } from "../ports";
import type {
  SubmitReportBugInput,
  SubmitReportBugResult,
} from "../types";

export type ReportBugService = {
  submit: (
    identity: SecurityIdentity | null | undefined,
    input: SubmitReportBugInput
  ) => Promise<SubmitReportBugResult>;
};

export type ReportBugServiceDeps = {
  email: ReportBugEmailPort;
  supportEmails: string[];
  /**
   * Pause between support + confirmation sends.
   * Mailtrap free testing plans often allow only ~1 message/second.
   */
  confirmationDelayMs?: number;
};

function requireIdentity(identity: SecurityIdentity | null | undefined): {
  email: string;
  organizationId: string;
  name: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  if (!identity.email?.trim()) {
    throw new ValidationAppError("Reporter email is required on the session");
  }
  const email = identity.email.trim();
  const local = email.split("@")[0] ?? "User";
  return {
    email,
    organizationId: identity.organizationId,
    name: local,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createReportBugService(
  deps: ReportBugServiceDeps
): ReportBugService {
  const { email, supportEmails, confirmationDelayMs = 1_200 } = deps;

  return {
    async submit(identity, input) {
      const reporter = requireIdentity(identity);
      if (supportEmails.length === 0) {
        throw new ValidationAppError(
          "REPORT_BUG_SUPPORT_EMAILS is not configured"
        );
      }

      const mailCtx = {
        category: input.category,
        title: input.title,
        description: input.description,
        reporterEmail: reporter.email,
        reporterName: reporter.name,
        organizationId: reporter.organizationId,
      };

      const support = buildSupportBugReportEmail(mailCtx);
      const confirmation = buildReporterConfirmationEmail({
        reporterName: reporter.name,
        title: input.title,
      });

      const supportResult = await email.sendTransactional({
        to: supportEmails,
        subject: support.subject,
        html: support.html,
        text: support.text,
        category: "system",
        organizationId: reporter.organizationId,
        correlationId: `report-bug-support-${Date.now()}`,
      });

      // Avoid Mailtrap free-plan "too many emails per second" on the 2nd send.
      if (confirmationDelayMs > 0) {
        await sleep(confirmationDelayMs);
      }

      let confirmEmailed = false;
      try {
        const confirmResult = await email.sendTransactional({
          to: reporter.email,
          subject: confirmation.subject,
          html: confirmation.html,
          text: confirmation.text,
          category: "transactional",
          organizationId: reporter.organizationId,
          correlationId: `report-bug-confirm-${Date.now()}`,
        });
        confirmEmailed = confirmResult.mode !== "disabled";
      } catch {
        // Support mail already accepted the report — do not fail the request
        // if confirmation is rate-limited or otherwise undeliverable.
        confirmEmailed = false;
      }

      const emailed =
        supportResult.mode !== "disabled" || confirmEmailed;

      return {
        accepted: true,
        category: input.category,
        title: input.title,
        emailed,
      };
    },
  };
}
