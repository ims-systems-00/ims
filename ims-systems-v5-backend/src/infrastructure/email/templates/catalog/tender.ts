import { escapeHtml, nl2br } from "../primitives";
import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export type TenderSubmissionEmailData = {
  orgName: string;
  buyer: string;
  title: string;
  reference?: string;
  body: string;
  actorName: string;
  attachmentNames?: string[];
};

export function renderTenderSubmission(
  data: TenderSubmissionEmailData
): RenderedEmail {
  const attachments = (data.attachmentNames || []).filter(Boolean);
  const attachmentNote = attachments.length
    ? `Attachments: ${attachments.join(", ")}`
    : undefined;

  return renderEmailLayout(
    `${data.orgName}: tender submission — ${data.buyer}`,
    {
      mode: "action",
      eyebrow: "Tender submission",
      title: data.title || "Tender response",
      hero: data.buyer,
      greeting: `Dear ${data.buyer},`,
      paragraphs: [
        `${data.orgName} is pleased to submit its response${
          data.reference ? ` (ref ${data.reference})` : ""
        }.`,
      ],
      meta: [
        { label: "Buyer", value: data.buyer },
        ...(data.reference
          ? [{ label: "Reference", value: data.reference }]
          : []),
        { label: "Submitted by", value: data.actorName },
      ],
      safeHtmlBlock: `<div style="margin-top:12px;font-size:14px;line-height:1.5;color:#333;">${nl2br(
        escapeHtml(data.body)
      )}</div>`,
      attachmentNote,
      closing: [`Kind regards,\n${data.actorName}\n${data.orgName}`],
      footerNote: `${data.orgName} · Tender Autopilot`,
    }
  );
}
