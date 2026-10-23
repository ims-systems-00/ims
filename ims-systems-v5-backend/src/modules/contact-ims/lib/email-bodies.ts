import type {
  BookDateInput,
  GetStartedInput,
} from "../types";
import { CONTACT_IMS_ISO_STANDARDS } from "../types";

type Rendered = { subject: string; html: string; text: string };

const ISO_LABELS: Record<(typeof CONTACT_IMS_ISO_STANDARDS)[number], string> = {
  iso27001: "ISO 27001",
  iso27002: "ISO 27002",
  iso20000: "ISO 20000",
  iso45001: "ISO 45001",
  iso9001: "ISO 9001",
  iso14001: "ISO 14001",
  iso22301: "ISO 22301",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function nl2br(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function wrap(body: string): string {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">${body}</div>`;
}

function contactRows(
  input: BookDateInput | GetStartedInput
): Array<[string, string]> {
  return [
    ["Organisation", input.organisationName],
    ["Name", input.name],
    ["Email", input.email],
    ["Job title", input.jobTitle],
    ["Phone", input.phone],
  ];
}

function renderRows(rows: Array<[string, string]>): {
  text: string[];
  html: string;
} {
  return {
    text: rows.map(([label, value]) => `${label}: ${value}`),
    html: rows
      .map(
        ([label, value]) =>
          `<p><strong>${escapeHtml(label)}:</strong> ${nl2br(value)}</p>`
      )
      .join("\n"),
  };
}

/** Internal team: new demo booking request. */
export function buildSupportBookDateEmail(input: BookDateInput): Rendered {
  const subject = "iMS great news (New demo booked)";
  const rows: Array<[string, string]> = [
    ...contactRows(input),
    ["Requested date", input.bookedDate],
    ["Additional information", input.additionalInformation?.trim() || "-"],
  ];
  const rendered = renderRows(rows);
  const text = ["New demo booking request", "", ...rendered.text].join("\n");
  const html = wrap(
    `<h2 style="margin:0 0 12px">New demo booking request</h2>\n${rendered.html}`
  );
  return { subject, html, text };
}

/** Submitter confirmation for demo booking. */
export function buildBookDateConfirmationEmail(ctx: {
  name: string;
  bookedDate: string;
}): Rendered {
  const subject = "Thank You for Requesting a Demo";
  const text = [
    `Hi ${ctx.name},`,
    "",
    "Thank you for requesting a demo of iMS Systems.",
    `Your preferred date: ${ctx.bookedDate}`,
    "",
    "One of our representatives will contact you to schedule the demo at a time that best suits you.",
  ].join("\n");
  const html = wrap(
    [
      `<p>Hi ${escapeHtml(ctx.name)},</p>`,
      "<p>Thank you for requesting a demo of iMS Systems.</p>",
      `<p><strong>Your preferred date:</strong> ${escapeHtml(ctx.bookedDate)}</p>`,
      "<p>One of our representatives will contact you to schedule the demo at a time that best suits you.</p>",
    ].join("\n")
  );
  return { subject, html, text };
}

/** Internal team: new Get Started / config request. */
export function buildSupportGetStartedEmail(input: GetStartedInput): Rendered {
  const subject = "iMS great news (New config request)";
  const rows: Array<[string, string]> = [
    ...contactRows(input),
    ["Service", input.service],
    ...CONTACT_IMS_ISO_STANDARDS.map(
      (key): [string, string] => [ISO_LABELS[key], String(input[key])]
    ),
  ];
  const rendered = renderRows(rows);
  const text = ["New config request", "", ...rendered.text].join("\n");
  const html = wrap(
    `<h2 style="margin:0 0 12px">New config request</h2>\n${rendered.html}`
  );
  return { subject, html, text };
}
