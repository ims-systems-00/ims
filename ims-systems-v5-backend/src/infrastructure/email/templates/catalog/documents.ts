import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export function renderDocumentShared(data: {
  documentName: string;
  message?: string;
  viewUrl?: string;
}): RenderedEmail {
  return renderEmailLayout(`Document shared: ${data.documentName}`, {
    mode: "action",
    eyebrow: "Documents",
    statusChip: { label: "Shared with you", tone: "info" },
    title: "A document was shared with you",
    hero: data.documentName,
    paragraphs: [
      `“${data.documentName}” has been shared with you on iMS.`,
      ...(data.message ? [`Message from the sender: ${data.message}`] : []),
    ],
    meta: [{ label: "Document", value: data.documentName }],
    ...(data.viewUrl
      ? { cta: { label: "Open document", href: data.viewUrl } }
      : {}),
    closing: ["Use the secure link above. Do not forward it to others."],
  });
}

export function renderDocumentSignatureRequested(data: {
  documentName: string;
  message?: string;
  signUrl?: string;
  expiresAt?: Date;
}): RenderedEmail {
  return renderEmailLayout(`Signature requested: ${data.documentName}`, {
    mode: "action",
    eyebrow: "Signature request",
    statusChip: { label: "Action required", tone: "warning" },
    title: "Please review and sign",
    hero: data.documentName,
    paragraphs: [
      `You have been asked to sign “${data.documentName}”.`,
      ...(data.message ? [`Message: ${data.message}`] : []),
    ],
    meta: [
      { label: "Document", value: data.documentName },
      ...(data.expiresAt
        ? [{ label: "Expires", value: data.expiresAt.toUTCString() }]
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
    mode: "success",
    eyebrow: "Signature complete",
    statusChip: { label: "Signed", tone: "success" },
    title: "Your signed copy is ready",
    paragraphs: [
      `The signed copy of “${data.documentName}” is ready for you to download.`,
    ],
    meta: [{ label: "Document", value: data.documentName }],
    cta: { label: "Download signed copy", href: data.viewUrl },
  });
}
