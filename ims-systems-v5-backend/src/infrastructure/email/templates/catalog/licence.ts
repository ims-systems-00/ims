import { renderEmailLayout } from "../layout";
import type { EmailMetaRow, RenderedEmail } from "../types";

export type LicenceRequestEmailData = {
  reference: string;
  organisationName: string;
  meta?: EmailMetaRow[];
};

export function renderLicenceRequestSupport(
  data: LicenceRequestEmailData
): RenderedEmail {
  return renderEmailLayout(
    `New licence request ${data.reference}: ${data.organisationName}`,
    {
      mode: "internal",
      eyebrow: "Licence request",
      statusChip: { label: "Support alert", tone: "info" },
      title: "New licence request received",
      paragraphs: [
        `${data.organisationName} submitted licence request ${data.reference}.`,
      ],
      meta: [
        { label: "Reference", value: data.reference },
        { label: "Organisation", value: data.organisationName },
        ...(data.meta ?? []),
      ],
    }
  );
}

export function renderLicenceRequestReceived(
  data: LicenceRequestEmailData
): RenderedEmail {
  return renderEmailLayout(`Licence request ${data.reference} received`, {
    mode: "receipt",
    eyebrow: "Licence request",
    statusChip: { label: "Received", tone: "info" },
    title: "We received your licence request",
    paragraphs: [
      `Thanks. Licence request ${data.reference} for ${data.organisationName} is now with our team.`,
      "You will receive another email when it has been processed.",
    ],
    meta: [
      { label: "Reference", value: data.reference },
      { label: "Organisation", value: data.organisationName },
      ...(data.meta ?? []),
    ],
  });
}

export function renderLicenceRequestGranted(
  data: LicenceRequestEmailData
): RenderedEmail {
  return renderEmailLayout(`Licence request ${data.reference} granted`, {
    mode: "success",
    eyebrow: "Licence request",
    statusChip: { label: "Granted", tone: "success" },
    title: "Your licences are ready",
    paragraphs: [
      `Licence request ${data.reference} for ${data.organisationName} has been approved and applied to your organisation.`,
    ],
    meta: [
      { label: "Reference", value: data.reference },
      { label: "Organisation", value: data.organisationName },
      ...(data.meta ?? []),
    ],
  });
}

export function renderLicenceRequestCancelled(
  data: LicenceRequestEmailData
): RenderedEmail {
  return renderEmailLayout(`Licence request ${data.reference} cancelled`, {
    mode: "alert",
    eyebrow: "Licence request",
    statusChip: { label: "Cancelled", tone: "warning" },
    title: "Licence request cancelled",
    paragraphs: [
      `Licence request ${data.reference} for ${data.organisationName} has been cancelled.`,
      "If you still need these licences, submit a new request from your organisation settings.",
    ],
    meta: [
      { label: "Reference", value: data.reference },
      { label: "Organisation", value: data.organisationName },
      ...(data.meta ?? []),
    ],
  });
}
