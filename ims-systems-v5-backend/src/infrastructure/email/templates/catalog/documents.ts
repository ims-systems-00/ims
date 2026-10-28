import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export function renderDocumentShared(data: {
  documentName: string;
  message?: string;
  viewUrl?: string;
}): RenderedEmail {
  return renderEmailLayout(`Document shared with you: ${data.documentName}`, {
    eyebrow: "Document management",
    title: "A document has been shared with you",
    paragraphs: [
      `A document has been shared with you: ${data.documentName}.`,
      ...(data.message?.trim() ? [data.message.trim()] : []),
    ],
    meta: [{ label: "Document", value: data.documentName }],
    ...(data.viewUrl
      ? { cta: { label: "Open document", href: data.viewUrl } }
      : {}),
  });
}

export function renderDocumentSignatureRequested(data: {
  documentName: string;
  message?: string;
  signUrl?: string;
  expiresAt?: Date;
}): RenderedEmail {
  return renderEmailLayout(`Signature requested: ${data.documentName}`, {
    eyebrow: "Signature request",
    title: "You have been invited to sign a document",
    paragraphs: [
      `You have been invited to sign ${data.documentName}.`,
      ...(data.message?.trim() ? [data.message.trim()] : []),
      ...(data.signUrl
        ? []
        : ["Sign in to iMS to review and sign it."]),
    ],
    meta: [
      { label: "Document", value: data.documentName },
      ...(data.expiresAt
        ? [{ label: "Link valid until", value: data.expiresAt.toISOString() }]
        : []),
    ],
    ...(data.signUrl
      ? { cta: { label: "Review and sign", href: data.signUrl } }
      : {}),
  });
}

export function renderDocumentSignedCopy(data: {
  documentName: string;
  viewUrl: string;
}): RenderedEmail {
  return renderEmailLayout(`Signed copy: ${data.documentName}`, {
    eyebrow: "Signed document",
    title: "Your signed copy is ready",
    paragraphs: [`You signed ${data.documentName}.`],
    meta: [{ label: "Document", value: data.documentName }],
    cta: { label: "Download signed copy", href: data.viewUrl },
  });
}
