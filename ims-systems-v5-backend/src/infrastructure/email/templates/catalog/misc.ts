import { escapeHtml } from "../primitives";
import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export function renderPartnershipApplicationReceived(data: {
  organisationName: string;
}): RenderedEmail {
  return renderEmailLayout("Welcome to the iMS Partnership programme", {
    title: "Partnership application received",
    paragraphs: [
      `Thanks for applying to the iMS Partnership programme for ${data.organisationName}. Your application has been received.`,
    ],
  });
}

export function renderPartnershipCodeReady(data: {
  organisationName: string;
  partnerCode: string;
  htmlExtra?: string;
}): RenderedEmail {
  return renderEmailLayout("Your iMS partner code is ready", {
    title: "Your partner code is ready",
    paragraphs: [
      `Your partnership for ${data.organisationName} is ready.`,
    ],
    meta: [{ label: "Partner code", value: data.partnerCode }],
    safeHtmlBlock: data.htmlExtra,
  });
}

export function renderInvoice(data: {
  recipientName: string;
  reference: string;
  customerName: string;
  totalLabel: string;
  dueDateLabel: string;
}): RenderedEmail {
  return renderEmailLayout(`Invoice ${data.reference} from iMS Systems`, {
    eyebrow: "Invoice",
    title: `Invoice ${data.reference}`,
    greeting: `Hi ${data.recipientName},`,
    paragraphs: [
      "Please find your invoice attached to this email.",
    ],
    meta: [
      { label: "Reference", value: data.reference },
      { label: "Customer", value: data.customerName },
      { label: "Total", value: data.totalLabel },
      { label: "Due date", value: data.dueDateLabel },
    ],
  });
}

export function renderAuditReport(data: {
  recipientName: string;
  reference: string;
  title: string;
  summaryHtml: string;
}): RenderedEmail {
  return renderEmailLayout(
    `Audit report ${data.reference}: ${data.title}`,
    {
      eyebrow: "Audit report",
      title: "Audit extract report",
      greeting: `Hi ${data.recipientName},`,
      paragraphs: [
        `The extract report for audit ${data.reference}: ${data.title} is attached and summarised below.`,
      ],
      meta: [
        { label: "Reference", value: data.reference },
        { label: "Title", value: data.title },
      ],
      safeHtmlBlock: data.summaryHtml,
    }
  );
}

export function renderNotification(data: {
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}): RenderedEmail {
  return renderEmailLayout(data.title, {
    eyebrow: "Notification",
    title: data.title,
    paragraphs: [data.body],
    ...(data.actionUrl
      ? {
          cta: {
            label: data.actionLabel ?? "Open in iMS",
            href: data.actionUrl,
          },
        }
      : {}),
  });
}

/** Outer shell for CRM campaigns — user-authored body injected as safe HTML. */
export function renderCampaignWrap(data: {
  subject: string;
  bodyHtml: string;
}): RenderedEmail {
  const escapedSubject = data.subject;
  return renderEmailLayout(escapedSubject, {
    title: escapedSubject,
    safeHtmlBlock: `<div style="font-size:15px;line-height:1.55;">${data.bodyHtml}</div>`,
    footerNote:
      "You are receiving this message because you are a customer contact for an organisation using iMS Systems.",
  });
}

export function renderGoLiveOnboardSuccess(data: {
  paymentType: string;
  superUser: number;
  users: number;
  groups: number;
  complianceTools: string[];
}): RenderedEmail {
  return renderEmailLayout("Welcome to iMS — your workspace is live", {
    eyebrow: "Go Live",
    title: "Your workspace is live",
    greeting: "Hi,",
    paragraphs: [
      "Your organisation's iMS workspace is now live. Here's what was activated:",
      "We've attached the iMS adoption pack and service charter to help you get started.",
    ],
    meta: [
      { label: "Payment method", value: data.paymentType },
      { label: "Super Admin seats", value: String(data.superUser) },
      { label: "User seats", value: String(data.users) },
      { label: "Business units", value: String(data.groups) },
      {
        label: "Compliance toolkits",
        value: data.complianceTools.join(", ") || "—",
      },
    ],
  });
}

export function renderGoLiveInvoiceInternal(data: {
  organizationId: string;
  actorId: string;
  actorEmail?: string;
  superUser: number;
  users: number;
  groups: number;
  complianceTools: string[];
}): RenderedEmail {
  return renderEmailLayout(
    `[iMS] New customer signup (monthly invoice) — ${data.organizationId}`,
    {
      eyebrow: "Internal alert",
      title: "New customer signup (monthly invoice)",
      paragraphs: [
        "A new organisation completed Go Live with Monthly invoice.",
      ],
      meta: [
        { label: "Organisation id", value: data.organizationId },
        { label: "Actor id", value: data.actorId },
        ...(data.actorEmail
          ? [{ label: "Actor email", value: data.actorEmail }]
          : []),
        { label: "Super Admin seats", value: String(data.superUser) },
        { label: "User seats", value: String(data.users) },
        { label: "Business units", value: String(data.groups) },
        {
          label: "Compliance toolkits",
          value: data.complianceTools.join(", ") || "—",
        },
      ],
    }
  );
}

/** Escape helper re-export for modules that still compose small HTML fragments. */
export { escapeHtml };
