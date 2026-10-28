import { renderEmailLayout } from "../layout";
import type { EmailMetaRow, RenderedEmail } from "../types";

export type LicenceRequestEmailData = {
  reference: string;
  organisationName: string;
  meta: EmailMetaRow[];
};

export function renderLicenceRequestSupport(
  data: LicenceRequestEmailData
): RenderedEmail {
  return renderEmailLayout(
    `[iMS] New licence request ${data.reference} — ${data.organisationName}`,
    {
      eyebrow: "Licence request",
      title: "New licence request submitted",
      paragraphs: ["A new licence request was submitted."],
      meta: [
        { label: "Reference", value: data.reference },
        { label: "Organisation", value: data.organisationName },
        ...data.meta,
      ],
    }
  );
}

export function renderLicenceRequestReceived(
  data: LicenceRequestEmailData
): RenderedEmail {
  return renderEmailLayout(`Licence request ${data.reference} received`, {
    title: "Licence request received",
    paragraphs: [
      `We received your licence request for ${data.organisationName}.`,
    ],
    meta: [
      { label: "Reference", value: data.reference },
      { label: "Organisation", value: data.organisationName },
      ...data.meta,
    ],
  });
}

export function renderLicenceRequestGranted(
  data: LicenceRequestEmailData
): RenderedEmail {
  return renderEmailLayout(`Licence request ${data.reference} granted`, {
    title: "Licence request granted",
    paragraphs: [
      `Your licence request for ${data.organisationName} has been granted and the licences are now active.`,
    ],
    meta: [
      { label: "Reference", value: data.reference },
      { label: "Organisation", value: data.organisationName },
      ...data.meta,
    ],
  });
}
