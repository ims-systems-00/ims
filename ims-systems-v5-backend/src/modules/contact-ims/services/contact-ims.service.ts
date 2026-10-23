import type { SecurityIdentity } from "../../../security";
import { ValidationAppError } from "../../../shared";
import {
  buildBookDateConfirmationEmail,
  buildSupportBookDateEmail,
  buildSupportGetStartedEmail,
} from "../lib/email-bodies";
import type { ContactImsEmailPort } from "../ports";
import type {
  BookDateInput,
  BookedDates,
  ContactImsSubmitResult,
  GetStartedInput,
} from "../types";

/** Public (anonymous) submissions have no organisation context. */
export const CONTACT_IMS_PUBLIC_ORG_ID = "public";

export const CONTACT_IMS_SUCCESS_MESSAGE =
  "Your request has been recorded, we will reach out to you in due course";

type MaybeIdentity = SecurityIdentity | null | undefined;

export type ContactImsService = {
  /** Always empty — nothing is persisted. */
  getBookedDates: (identity?: MaybeIdentity) => Promise<BookedDates>;
  bookDate: (
    identity: MaybeIdentity,
    input: BookDateInput
  ) => Promise<ContactImsSubmitResult>;
  getStarted: (
    identity: MaybeIdentity,
    input: GetStartedInput
  ) => Promise<ContactImsSubmitResult>;
};

export type ContactImsServiceDeps = {
  email: ContactImsEmailPort;
  supportEmails: string[];
  /**
   * Pause between support + confirmation sends.
   * Mailtrap free testing plans often allow only ~1 message/second.
   */
  confirmationDelayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createContactImsService(
  deps: ContactImsServiceDeps
): ContactImsService {
  const { email, supportEmails, confirmationDelayMs = 1_200 } = deps;

  function requireSupportEmails(): void {
    if (supportEmails.length === 0) {
      throw new ValidationAppError(
        "CONTACT_IMS_SUPPORT_EMAILS is not configured"
      );
    }
  }

  return {
    async getBookedDates() {
      return [];
    },

    async bookDate(_identity, input) {
      requireSupportEmails();

      const support = buildSupportBookDateEmail(input);
      const confirmation = buildBookDateConfirmationEmail({
        name: input.name,
        bookedDate: input.bookedDate,
      });

      const supportResult = await email.sendTransactional({
        to: supportEmails,
        subject: support.subject,
        html: support.html,
        text: support.text,
        category: "system",
        organizationId: CONTACT_IMS_PUBLIC_ORG_ID,
        replyTo: input.email,
        correlationId: `contact-ims-book-date-${Date.now()}`,
      });

      if (confirmationDelayMs > 0) {
        await sleep(confirmationDelayMs);
      }

      let confirmEmailed = false;
      try {
        const confirmResult = await email.sendTransactional({
          to: input.email,
          subject: confirmation.subject,
          html: confirmation.html,
          text: confirmation.text,
          category: "transactional",
          organizationId: CONTACT_IMS_PUBLIC_ORG_ID,
          correlationId: `contact-ims-book-date-confirm-${Date.now()}`,
        });
        confirmEmailed = confirmResult.mode !== "disabled";
      } catch {
        // Support mail already accepted the request — do not fail the
        // submission if the confirmation is rate-limited or undeliverable.
        confirmEmailed = false;
      }

      return {
        accepted: true,
        message: CONTACT_IMS_SUCCESS_MESSAGE,
        emailed: supportResult.mode !== "disabled" || confirmEmailed,
      };
    },

    async getStarted(_identity, input) {
      requireSupportEmails();

      const support = buildSupportGetStartedEmail(input);
      const result = await email.sendTransactional({
        to: supportEmails,
        subject: support.subject,
        html: support.html,
        text: support.text,
        category: "system",
        organizationId: CONTACT_IMS_PUBLIC_ORG_ID,
        replyTo: input.email,
        correlationId: `contact-ims-get-started-${Date.now()}`,
      });

      return {
        accepted: true,
        message: CONTACT_IMS_SUCCESS_MESSAGE,
        emailed: result.mode !== "disabled",
      };
    },
  };
}
