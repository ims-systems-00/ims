import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export type ContactLeadData = {
  organisationName: string;
  name: string;
  email: string;
  jobTitle: string;
  phone: string;
  bookedDate?: string;
  additionalInformation?: string;
  service?: string;
  isoRows?: Array<{ label: string; value: string }>;
};

export function renderContactDemoSupport(data: ContactLeadData): RenderedEmail {
  return renderEmailLayout("iMS great news (New demo booked)", {
    eyebrow: "Demo booking",
    title: "New demo booking request",
    meta: [
      { label: "Organisation", value: data.organisationName },
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      { label: "Job title", value: data.jobTitle },
      { label: "Phone", value: data.phone },
      { label: "Requested date", value: data.bookedDate ?? "-" },
      {
        label: "Additional information",
        value: data.additionalInformation?.trim() || "-",
      },
    ],
  });
}

export function renderContactDemoConfirmation(data: {
  name: string;
  bookedDate: string;
}): RenderedEmail {
  return renderEmailLayout("Thank You for Requesting a Demo", {
    title: "Thank you for requesting a demo",
    greeting: `Hi ${data.name},`,
    paragraphs: [
      "Thank you for requesting a demo of iMS Systems.",
      "One of our representatives will contact you to schedule the demo at a time that best suits you.",
    ],
    meta: [{ label: "Preferred date", value: data.bookedDate }],
  });
}

export function renderContactGetStartedSupport(
  data: ContactLeadData
): RenderedEmail {
  return renderEmailLayout("iMS great news (New config request)", {
    eyebrow: "Get Started",
    title: "New config request",
    meta: [
      { label: "Organisation", value: data.organisationName },
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      { label: "Job title", value: data.jobTitle },
      { label: "Phone", value: data.phone },
      { label: "Service", value: data.service ?? "-" },
      ...(data.isoRows ?? []),
    ],
  });
}
