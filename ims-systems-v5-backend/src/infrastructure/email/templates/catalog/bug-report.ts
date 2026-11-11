import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export type BugReportSupportData = {
  category: string;
  title: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  organizationId?: string;
};

export type BugReportConfirmationData = {
  reporterName: string;
  title: string;
};

export function renderBugReportSupport(
  data: BugReportSupportData
): RenderedEmail {
  return renderEmailLayout(`[${data.category}] ${data.title}`, {
    mode: "internal",
    eyebrow: "Bug report",
    statusChip: { label: "Customer report", tone: "warning" },
    title: "New bug report from customer",
    paragraphs: [
      "A customer submitted a bug report through iMS. Details are below.",
    ],
    meta: [
      { label: "Category", value: data.category },
      { label: "Title", value: data.title },
      { label: "Reporter", value: data.reporterName },
      { label: "Email", value: data.reporterEmail },
      ...(data.organizationId
        ? [{ label: "Organisation ID", value: data.organizationId }]
        : []),
      { label: "Description", value: data.description },
    ],
  });
}

export function renderBugReportConfirmation(
  data: BugReportConfirmationData
): RenderedEmail {
  return renderEmailLayout("We received your bug report", {
    mode: "receipt",
    eyebrow: "Support",
    statusChip: { label: "Received", tone: "success" },
    title: "Thanks. We’re looking into it",
    greeting: `Hi ${data.reporterName},`,
    paragraphs: [
      `We received your report: “${data.title}”.`,
      "Our team will review it and follow up if we need more detail.",
    ],
    closing: ["Thank you for helping us improve iMS Systems."],
  });
}
