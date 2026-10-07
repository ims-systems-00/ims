import type { ReportBugCategory } from "../types";

export type BugReportMailContext = {
  category: ReportBugCategory;
  title: string;
  description: string;
  reporterEmail: string;
  reporterName: string;
  organizationId: string;
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

/** Support inbox: new customer bug report. */
export function buildSupportBugReportEmail(ctx: BugReportMailContext): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[${ctx.category}] ${ctx.title}`;
  const text = [
    "New bug report from customer",
    "",
    `Category: ${ctx.category}`,
    `Title: ${ctx.title}`,
    `Reporter: ${ctx.reporterName} <${ctx.reporterEmail}>`,
    `Organisation id: ${ctx.organizationId}`,
    "",
    "Description:",
    ctx.description,
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">New bug report from customer</h2>
      <p><strong>Category:</strong> ${escapeHtml(ctx.category)}</p>
      <p><strong>Title:</strong> ${escapeHtml(ctx.title)}</p>
      <p><strong>Reporter:</strong> ${escapeHtml(ctx.reporterName)} &lt;${escapeHtml(ctx.reporterEmail)}&gt;</p>
      <p><strong>Organisation id:</strong> <code>${escapeHtml(ctx.organizationId)}</code></p>
      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0" />
      <p><strong>Description</strong></p>
      <p>${nl2br(ctx.description)}</p>
    </div>
  `.trim();

  return { subject, html, text };
}

/** Reporter confirmation. */
export function buildReporterConfirmationEmail(ctx: {
  reporterName: string;
  title: string;
}): { subject: string; html: string; text: string } {
  const subject = "Confirmation — your bug report has been recorded";
  const text = [
    `Hi ${ctx.reporterName},`,
    "",
    "Thanks for reporting an issue. Your response has been recorded.",
    `Title: ${ctx.title}`,
    "",
    "One of the iMS Systems administrators will contact you soon if follow-up is needed.",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
      <p>Hi ${escapeHtml(ctx.reporterName)},</p>
      <p>Thanks for reporting an issue. Your response has been recorded.</p>
      <p><strong>Title:</strong> ${escapeHtml(ctx.title)}</p>
      <p>One of the iMS Systems administrators will contact you soon if follow-up is needed.</p>
    </div>
  `.trim();

  return { subject, html, text };
}
