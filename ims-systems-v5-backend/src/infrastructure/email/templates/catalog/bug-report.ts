import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export type BugReportSupportData = {
  category: string;
  title: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  organizationId: string;
};

export type BugReportConfirmationData = {
  reporterName: string;
  title: string;
};

export function renderBugReportSupport(
  data: BugReportSupportData
): RenderedEmail {
  return renderEmailLayout(`[${data.category}] ${data.title}`, {
    eyebrow: "Bug report",
    title: "New bug report from customer",
    paragraphs: ["A customer submitted a bug report through iMS Systems."],
    meta: [
      { label: "Category", value: data.category },
      { label: "Title", value: data.title },
      {
        label: "Reporter",
        value: `${data.reporterName} <${data.reporterEmail}>`,
      },
      { label: "Organisation id", value: data.organizationId },
      { label: "Description", value: data.description },
    ],
  });
}

export function renderBugReportConfirmation(
  data: BugReportConfirmationData
): RenderedEmail {
  return renderEmailLayout(
    "Confirmation — your bug report has been recorded",
    {
      title: "We received your bug report",
      greeting: `Hi ${data.reporterName},`,
      paragraphs: [
        "Thanks for reporting an issue. Your response has been recorded.",
        "One of the iMS Systems administrators will contact you soon if follow-up is needed.",
      ],
      meta: [{ label: "Title", value: data.title }],
    }
  );
}
