import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export function renderInvitation(data: {
  inviterName: string;
  organisationName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}): RenderedEmail {
  return renderEmailLayout("iMS Invitation", {
    eyebrow: "Invitation",
    title: "You have been invited to iMS Systems",
    paragraphs: [
      `${data.inviterName} has invited you to join ${data.organisationName} as a ${data.role}.`,
      "If you do not yet have an iMS account, register with this email address first, then open the link again.",
    ],
    meta: [
      { label: "Organisation", value: data.organisationName },
      { label: "Role", value: data.role },
      { label: "Expires", value: data.expiresAt.toUTCString() },
    ],
    cta: { label: "Accept invitation", href: data.acceptUrl },
  });
}

export function renderWelcome(data: { name: string }): RenderedEmail {
  return renderEmailLayout("Welcome to iMS Systems", {
    title: "Welcome to iMS Systems",
    greeting: `Hi ${data.name},`,
    paragraphs: [
      "Your iMS Systems account is now active. You can sign in and start working with your organisation.",
    ],
  });
}

export function renderAccessRevoked(data: { name: string }): RenderedEmail {
  return renderEmailLayout("Your iMS Systems access has changed", {
    title: "Access updated",
    greeting: `Hi ${data.name},`,
    paragraphs: [
      "Your access to iMS Systems has been revoked or deactivated by your organisation.",
      "If you believe this is a mistake, please contact your organisation administrator.",
    ],
  });
}

export function renderEmailVerification(data: { name: string }): RenderedEmail {
  return renderEmailLayout("Verify your iMS Systems email", {
    title: "Verify your email address",
    greeting: `Hi ${data.name},`,
    paragraphs: [
      "Please verify this email address for your iMS Systems account.",
      "If you did not request this, you can ignore this message.",
    ],
  });
}

export function renderRegisterInterestConfirmation(): RenderedEmail {
  return renderEmailLayout("Carbo-Calc Interest Registered Successfully.", {
    title: "Interest registered",
    paragraphs: [
      "Thank you for registering your interest in the Carbon Calculator.",
      "We predict it will be available in July, and you will get exclusive early access when it launches.",
      "If you have any questions, contact support@imssystems.tech.",
    ],
  });
}
