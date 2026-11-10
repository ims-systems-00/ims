import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export function renderInvitation(data: {
  inviterName: string;
  organisationName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}): RenderedEmail {
  return renderEmailLayout(
    `You're invited to join ${data.organisationName}`,
    {
      mode: "invite",
      eyebrow: "Organisation invitation",
      statusChip: { label: "Action required", tone: "info" },
      title: `Join ${data.organisationName} on iMS`,
      hero: `${data.inviterName} has invited you to collaborate.`,
      paragraphs: [
        `${data.inviterName} invited you to join ${data.organisationName} as a ${data.role}.`,
        "If you do not have an iMS account yet, register with this email address first, then open the invitation link again.",
      ],
      meta: [
        { label: "Organisation", value: data.organisationName },
        { label: "Role", value: data.role },
        { label: "Expires", value: data.expiresAt.toUTCString() },
      ],
      cta: { label: "Accept invitation", href: data.acceptUrl },
      closing: [
        "This link expires for security. Ask your administrator to resend if you need a new one.",
      ],
    }
  );
}

export function renderWelcome(data: { name: string }): RenderedEmail {
  return renderEmailLayout("Welcome to iMS Systems", {
    mode: "success",
    eyebrow: "Welcome",
    statusChip: { label: "Account ready", tone: "success" },
    title: "Your workspace is ready",
    greeting: `Hi ${data.name},`,
    paragraphs: [
      "Your iMS Systems account is now active. Sign in to start working with your organisation’s records, documents, and compliance tools.",
      "If anything looks unexpected, contact your organisation administrator or our support team.",
    ],
    closing: ["We’re glad you’re here."],
  });
}

export function renderAccessRevoked(data: { name: string }): RenderedEmail {
  return renderEmailLayout("Your iMS Systems access has changed", {
    mode: "alert",
    eyebrow: "Access update",
    statusChip: { label: "Access revoked", tone: "danger" },
    title: "Your access has been updated",
    greeting: `Hi ${data.name},`,
    paragraphs: [
      "Your access to iMS Systems has been revoked or deactivated by your organisation.",
      "If you believe this is a mistake, please contact your organisation administrator.",
    ],
  });
}

export function renderEmailVerification(data: { name: string }): RenderedEmail {
  return renderEmailLayout("Verify your iMS Systems email", {
    mode: "action",
    eyebrow: "Verification",
    statusChip: { label: "Confirm email", tone: "info" },
    title: "Verify your email address",
    greeting: `Hi ${data.name},`,
    paragraphs: [
      "Please verify this email address for your iMS Systems account so we can keep your workspace secure.",
      "If you did not request this, you can ignore this message.",
    ],
  });
}

export function renderRegisterInterestConfirmation(): RenderedEmail {
  return renderEmailLayout("Interest registered — Carbon Calculator", {
    mode: "success",
    eyebrow: "Carbo-Calc",
    statusChip: { label: "Registered", tone: "success" },
    title: "Thanks for registering your interest",
    paragraphs: [
      "Thank you for registering your interest in the Carbon Calculator.",
      "We expect availability soon and will give you exclusive early access when it launches.",
      "Questions? Email support@imssystems.tech.",
    ],
  });
}

export function renderTxnEmailInvitation(data: {
  organisationName: string;
  acceptUrl: string;
  expiresAt?: Date;
}): RenderedEmail {
  return renderEmailLayout(
    `Notification access from ${data.organisationName}`,
    {
      mode: "invite",
      eyebrow: "Notification access",
      statusChip: { label: "Opt-in required", tone: "info" },
      title: "Allow notifications from this organisation?",
      hero: `${data.organisationName} would like to send you iMS notifications.`,
      paragraphs: [
        `${data.organisationName} invited this email address to receive notifications from their iMS workspace.`,
        "Accept only if you recognise the organisation and want to receive these messages.",
      ],
      meta: [
        { label: "Organisation", value: data.organisationName },
        ...(data.expiresAt
          ? [{ label: "Expires", value: data.expiresAt.toUTCString() }]
          : []),
      ],
      cta: { label: "Accept notification access", href: data.acceptUrl },
    }
  );
}
