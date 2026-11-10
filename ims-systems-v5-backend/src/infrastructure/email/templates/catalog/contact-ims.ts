import { renderEmailLayout } from "../layout";
import type { EmailMetaRow, RenderedEmail } from "../types";

export type ContactLeadData = {
  organisationName: string;
  name: string;
  email: string;
  jobTitle?: string;
  phone?: string;
  bookedDate?: string;
  service?: string;
  additionalInformation?: string;
  isoRows?: EmailMetaRow[];
};

export function renderContactDemoSupport(data: ContactLeadData): RenderedEmail {
  return renderEmailLayout("iMS great news (New demo booked)", {
    mode: "internal",
    eyebrow: "Demo booking",
    statusChip: { label: "New lead", tone: "info" },
    title: "A demo was booked",
    paragraphs: ["A prospective customer booked a product demo."],
    meta: [
      { label: "Organisation", value: data.organisationName },
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      ...(data.jobTitle ? [{ label: "Job title", value: data.jobTitle }] : []),
      ...(data.phone ? [{ label: "Phone", value: data.phone }] : []),
      ...(data.bookedDate
        ? [{ label: "Booked date", value: data.bookedDate }]
        : []),
      ...(data.additionalInformation
        ? [{ label: "Notes", value: data.additionalInformation }]
        : []),
    ],
  });
}

export function renderContactDemoConfirmation(data: {
  name: string;
  bookedDate: string;
}): RenderedEmail {
  return renderEmailLayout("Thank you for requesting a demo", {
    mode: "success",
    eyebrow: "Demo confirmed",
    statusChip: { label: "Booked", tone: "success" },
    title: "Your demo request is confirmed",
    greeting: `Hi ${data.name},`,
    paragraphs: [
      `Thanks for booking a demo with iMS Systems. Your preferred date is ${data.bookedDate}.`,
      "A member of our team will be in touch shortly to confirm the session details.",
    ],
    meta: [{ label: "Preferred date", value: data.bookedDate }],
  });
}

export function renderContactGetStartedSupport(
  data: ContactLeadData
): RenderedEmail {
  return renderEmailLayout("iMS great news (New config request)", {
    mode: "internal",
    eyebrow: "Get started",
    statusChip: { label: "New enquiry", tone: "info" },
    title: "New get-started enquiry",
    paragraphs: ["A prospective customer submitted a configuration enquiry."],
    meta: [
      { label: "Organisation", value: data.organisationName },
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      ...(data.jobTitle ? [{ label: "Job title", value: data.jobTitle }] : []),
      ...(data.phone ? [{ label: "Phone", value: data.phone }] : []),
      ...(data.service ? [{ label: "Service", value: data.service }] : []),
      ...(data.isoRows ?? []),
      ...(data.additionalInformation
        ? [{ label: "Notes", value: data.additionalInformation }]
        : []),
    ],
  });
}
