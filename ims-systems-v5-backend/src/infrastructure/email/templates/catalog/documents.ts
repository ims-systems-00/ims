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

export function renderDocumentAuthorisationRequested(data: {
  documentName: string;
  reference?: string;
  viewUrl?: string;
}): RenderedEmail {
  return renderEmailLayout(
    `Authorisation requested: ${data.documentName}`,
    {
      mode: "action",
      eyebrow: "Documents",
      statusChip: { label: "Action required", tone: "warning" },
      title: "Please authorise a document",
      hero: data.documentName,
      paragraphs: [
        `You have been asked to authorise “${data.documentName}” before it can be published.`,
      ],
      meta: [
        { label: "Document", value: data.documentName },
        ...(data.reference
          ? [{ label: "Reference", value: data.reference }]
          : []),
      ],
      ...(data.viewUrl
        ? { cta: { label: "Review document", href: data.viewUrl } }
        : {}),
    }
  );
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

export function renderDocumentReviewReminder(data: {
  title: string;
  entityLabel: string;
  entityName: string;
  reviewDateLabel: string;
  body: string;
  viewUrl?: string;
}): RenderedEmail {
  return renderEmailLayout(data.title, {
    mode: "action",
    eyebrow: "Document Management",
    statusChip: { label: "Review reminder", tone: "warning" },
    title: data.title,
    hero: data.entityName,
    paragraphs: [data.body],
    meta: [
      { label: data.entityLabel, value: data.entityName },
      { label: "Review date", value: data.reviewDateLabel },
    ],
    ...(data.viewUrl
      ? { cta: { label: "Open in iMS", href: data.viewUrl } }
      : {}),
  });
}

export type DocumentReviewReminderDigestItem = {
  entityLabel: string;
  entityName: string;
  reviewDateLabel: string;
  body: string;
};

/** One email listing every document/folder/repository due for a recipient. */
export function renderDocumentReviewReminderDigest(data: {
  items: DocumentReviewReminderDigestItem[];
  viewUrl?: string;
}): RenderedEmail {
  const count = data.items.length;
  const title =
    count === 1
      ? "Review reminder"
      : `${count} review reminders`;
  const paragraphs =
    count === 1
      ? [data.items[0]!.body]
      : [
          `${count} items need review attention today. Details are listed below.`,
          ...data.items.map(
            (item, index) =>
              `${index + 1}. ${item.entityLabel} “${item.entityName}” — review ${item.reviewDateLabel}. ${item.body}`
          ),
        ];
  const meta =
    count === 1
      ? [
          {
            label: data.items[0]!.entityLabel,
            value: data.items[0]!.entityName,
          },
          {
            label: "Review date",
            value: data.items[0]!.reviewDateLabel,
          },
        ]
      : [
          { label: "Items", value: String(count) },
          {
            label: "First due",
            value: data.items[0]!.reviewDateLabel,
          },
        ];

  return renderEmailLayout(title, {
    mode: "action",
    eyebrow: "Document Management",
    statusChip: { label: "Review reminder", tone: "warning" },
    title,
    paragraphs,
    meta,
    ...(data.viewUrl
      ? { cta: { label: "Open in iMS", href: data.viewUrl } }
      : {}),
  });
}
