/**
 * Go Live emails (V4 parity):
 * - Monthly invoice: internal "new customer signup" notify to support/accounts.
 * - Every Go Live: onboard-success email to the activating user, with the
 *   adoption pack + service charter attachments (V4 `onboard-success`).
 * Spec: docs/module-specifications/organisation-onboarding.md,
 * docs/module-specifications/stripe-payments.md §3.2
 *
 * Failures are logged and swallowed — email never blocks activation.
 * Attachments ship in `assets/onboarding/`; if missing, the email is
 * still sent without them.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { EmailAttachment } from "../../../infrastructure/email";
import {
  DEFAULT_IMS_EMAIL_BRANDING,
  renderEmail,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import type { Logger } from "../../../infrastructure/logging/logger";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { OrganisationGoLiveSideEffectsPort } from "../ports";

const ONBOARDING_ASSETS: Array<{ filename: string; type: string }> = [
  {
    filename: "ims-systems-adoption-pack.pptx",
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  { filename: "service-charter.pdf", type: "application/pdf" },
];

let cachedAttachments: EmailAttachment[] | undefined;

function loadOnboardingAttachments(logger?: Logger): EmailAttachment[] {
  if (cachedAttachments) return cachedAttachments;
  // Adapters live at <root>/{src|dist}/modules/organisation/adapters.
  const assetsDir = path.resolve(__dirname, "../../../../assets/onboarding");
  const attachments: EmailAttachment[] = [];
  for (const asset of ONBOARDING_ASSETS) {
    try {
      const content = readFileSync(path.join(assetsDir, asset.filename));
      attachments.push({
        filename: asset.filename,
        contentBase64: content.toString("base64"),
        type: asset.type,
      });
    } catch {
      logger?.warn(
        { filename: asset.filename, assetsDir },
        "Onboard-success attachment missing; sending without it"
      );
    }
  }
  cachedAttachments = attachments;
  return attachments;
}

export function createGoLiveNotifySideEffectsAdapter(deps: {
  email: EmailSystem;
  supportEmails: string[];
  logger?: Logger;
  resolveEmailBranding?: (organizationId: string) => Promise<EmailBranding>;
}): OrganisationGoLiveSideEffectsPort {
  const { email, supportEmails, logger } = deps;

  async function brandingFor(organizationId: string): Promise<EmailBranding> {
    if (!deps.resolveEmailBranding) return DEFAULT_IMS_EMAIL_BRANDING;
    try {
      return await deps.resolveEmailBranding(organizationId);
    } catch {
      return DEFAULT_IMS_EMAIL_BRANDING;
    }
  }

  async function notifyInvoiceSignupInternal(
    input: Parameters<
      OrganisationGoLiveSideEffectsPort["notifyGoLive"]
    >[0]
  ): Promise<void> {
    const recipients = supportEmails.map((row) => row.trim()).filter(Boolean);
    if (recipients.length === 0) {
      logger?.warn(
        { organizationId: input.organizationId },
        "Go Live invoice notify skipped: no support emails configured"
      );
      return;
    }

    const rendered = renderEmail(
      "go-live-invoice-internal",
      {
        organizationId: input.organizationId,
        actorId: input.actorId,
        ...(input.actorEmail ? { actorEmail: input.actorEmail } : {}),
        superUser: input.licences.superUser,
        users: input.licences.users,
        groups: input.licences.groups,
        complianceTools: input.licences.complianceTools,
      },
      { branding: await brandingFor(input.organizationId) }
    );

    try {
      await email.sendTransactional({
        to: recipients,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "system",
        organizationId: input.organizationId,
      });
      logger?.info(
        { organizationId: input.organizationId, recipients },
        "Go Live invoice notify email sent"
      );
    } catch (error) {
      logger?.warn(
        {
          organizationId: input.organizationId,
          err: error instanceof Error ? error.message : String(error),
        },
        "Go Live invoice notify email failed"
      );
    }
  }

  async function sendOnboardSuccessToCustomer(
    input: Parameters<
      OrganisationGoLiveSideEffectsPort["notifyGoLive"]
    >[0]
  ): Promise<void> {
    if (!input.actorEmail) {
      logger?.warn(
        { organizationId: input.organizationId },
        "Onboard-success email skipped: no actor email on identity"
      );
      return;
    }

    const rendered = renderEmail(
      "go-live-onboard-success",
      {
        paymentType: input.paymentType,
        superUser: input.licences.superUser,
        users: input.licences.users,
        groups: input.licences.groups,
        complianceTools: input.licences.complianceTools,
      },
      { branding: await brandingFor(input.organizationId) }
    );

    try {
      await email.sendTransactional({
        to: input.actorEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "customer-communication",
        organizationId: input.organizationId,
        attachments: loadOnboardingAttachments(logger),
      });
      logger?.info(
        { organizationId: input.organizationId, to: input.actorEmail },
        "Onboard-success email sent"
      );
    } catch (error) {
      logger?.warn(
        {
          organizationId: input.organizationId,
          err: error instanceof Error ? error.message : String(error),
        },
        "Onboard-success email failed"
      );
    }
  }

  return {
    async provisionComplianceToolkits(): Promise<void> {
      return;
    },

    async createCardCheckoutSession(): Promise<null> {
      return null;
    },

    async notifyGoLive(input): Promise<void> {
      await sendOnboardSuccessToCustomer(input);
      if (input.paymentType === "Monthly invoice") {
        await notifyInvoiceSignupInternal(input);
      }
    },
  };
}
