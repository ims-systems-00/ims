import { renderEmail } from "../../../infrastructure/email/templates";
import type { BookDateInput, GetStartedInput } from "../types";
import { CONTACT_IMS_ISO_STANDARDS } from "../types";

const ISO_LABELS: Record<(typeof CONTACT_IMS_ISO_STANDARDS)[number], string> = {
  iso27001: "ISO 27001",
  iso27002: "ISO 27002",
  iso20000: "ISO 20000",
  iso45001: "ISO 45001",
  iso9001: "ISO 9001",
  iso14001: "ISO 14001",
  iso22301: "ISO 22301",
};

/** Internal team: new demo booking request. */
export function buildSupportBookDateEmail(input: BookDateInput) {
  return renderEmail("contact-demo-support", {
    organisationName: input.organisationName,
    name: input.name,
    email: input.email,
    jobTitle: input.jobTitle,
    phone: input.phone,
    bookedDate: input.bookedDate,
    additionalInformation: input.additionalInformation,
  });
}

/** Submitter confirmation for demo booking. */
export function buildBookDateConfirmationEmail(ctx: {
  name: string;
  bookedDate: string;
}) {
  return renderEmail("contact-demo-confirmation", {
    name: ctx.name,
    bookedDate: ctx.bookedDate,
  });
}

/** Internal team: new Get Started / config request. */
export function buildSupportGetStartedEmail(input: GetStartedInput) {
  return renderEmail("contact-get-started-support", {
    organisationName: input.organisationName,
    name: input.name,
    email: input.email,
    jobTitle: input.jobTitle,
    phone: input.phone,
    service: input.service,
    isoRows: CONTACT_IMS_ISO_STANDARDS.map((key) => ({
      label: ISO_LABELS[key],
      value: String(input[key]),
    })),
  });
}
