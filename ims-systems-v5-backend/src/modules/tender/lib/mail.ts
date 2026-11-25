import {
  renderEmail,
  type EmailBranding,
} from "../../../infrastructure/email/templates";

export type TenderSubmissionMailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildTenderSubmissionEmail(input: {
  orgName: string;
  buyer: string;
  title: string;
  reference?: string;
  body: string;
  actorName: string;
  attachmentNames?: string[];
  branding?: EmailBranding;
}): TenderSubmissionMailContent {
  const rendered = renderEmail(
    "tender-submission",
    {
      orgName: input.orgName,
      buyer: input.buyer,
      title: input.title,
      reference: input.reference || "",
      body: input.body,
      actorName: input.actorName,
      attachmentNames: input.attachmentNames || [],
    },
    { branding: input.branding }
  );
  return {
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  };
}
