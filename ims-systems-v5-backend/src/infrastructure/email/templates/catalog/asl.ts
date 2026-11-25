import { escapeHtml } from "../primitives";
import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export type AslDocsChaseEmailData = {
  orgName: string;
  supplierName: string;
  contactName: string;
  actorName: string;
  fromAddress: string;
  dueDate: string;
  uploadUrl: string;
  items: string[];
  holdNote?: string;
  reqsNote?: string;
};

export type AslEvalDueEmailData = {
  orgName: string;
  supplierName: string;
  contactName: string;
  actorName: string;
  fromAddress: string;
  evalDue: string;
  uploadUrl: string;
};

export type AslEvalDueInternalEmailData = {
  orgName: string;
  supplierName: string;
  supplierReference: string;
  criticality: string;
  contactName: string;
  contactEmail: string;
  fromAddress: string;
  evalDue: string;
};

function itemsListHtml(items: string[]): string {
  return `<ul style="margin:0;padding-left:20px;">${items
    .map(
      (item) =>
        `<li style="margin:0 0 6px;">${escapeHtml(item.replace(/^•\s*/, ""))}</li>`
    )
    .join("")}</ul>`;
}

export function renderAslDocsChase(data: AslDocsChaseEmailData): RenderedEmail {
  const paragraphs = [
    `${data.orgName} keeps an approved supplier list as part of our ISO management system, and we need the following from ${data.supplierName}.`,
    `Please reply with the documents, or use the secure upload link below (no account needed). We need them by ${data.dueDate}.`,
  ];
  if (data.holdNote?.trim()) paragraphs.push(data.holdNote.trim());
  if (data.reqsNote?.trim()) paragraphs.push(data.reqsNote.trim());

  return renderEmailLayout(
    `${data.orgName}: supplier documents required by ${data.dueDate}`,
    {
      mode: "action",
      eyebrow: "Approved supplier list",
      statusChip: { label: "Documents required", tone: "warning" },
      title: "Supplier documents required",
      hero: data.supplierName,
      greeting: `Dear ${data.contactName},`,
      paragraphs,
      safeHtmlBlock: itemsListHtml(data.items),
      meta: [
        { label: "Supplier", value: data.supplierName },
        { label: "Due by", value: data.dueDate },
        { label: "From", value: data.fromAddress },
      ],
      cta: { label: "Upload documents", href: data.uploadUrl },
      closing: [`Thank you,\n${data.actorName}\n${data.orgName}`],
      footerNote: "This secure link does not require an iMS account.",
    }
  );
}

export function renderAslEvalDue(data: AslEvalDueEmailData): RenderedEmail {
  return renderEmailLayout(
    `${data.orgName}: supplier re-evaluation due ${data.evalDue}`,
    {
      mode: "action",
      eyebrow: "Approved supplier list",
      statusChip: { label: "Re-evaluation due", tone: "warning" },
      title: "Supplier re-evaluation due",
      hero: data.supplierName,
      greeting: `Dear ${data.contactName},`,
      paragraphs: [
        `${data.orgName} is due to re-evaluate ${data.supplierName} on ${data.evalDue} as part of our approved supplier list.`,
        "Please ensure any outstanding certificates or insurance documents are up to date. You can upload documents with the link below — no account needed.",
      ],
      meta: [
        { label: "Supplier", value: data.supplierName },
        { label: "Due", value: data.evalDue },
        { label: "From", value: data.fromAddress },
      ],
      cta: { label: "Upload documents", href: data.uploadUrl },
      closing: [`Thank you,\n${data.actorName}\n${data.orgName}`],
      footerNote: "This secure link does not require an iMS account.",
    }
  );
}

export function renderAslEvalDueInternal(
  data: AslEvalDueInternalEmailData
): RenderedEmail {
  return renderEmailLayout(
    `${data.orgName}: re-evaluation due today — ${data.supplierName}`,
    {
      mode: "alert",
      eyebrow: "ASL internal reminder",
      statusChip: { label: "Action required", tone: "warning" },
      title: "Supplier re-evaluation due today",
      hero: data.supplierName,
      paragraphs: [
        "A supplier on your approved supplier list is due for re-evaluation today. Please record the evaluation in the ASL module.",
      ],
      meta: [
        { label: "Supplier", value: `${data.supplierName} (${data.supplierReference})` },
        { label: "Criticality", value: data.criticality },
        { label: "Due", value: data.evalDue },
        {
          label: "Contact",
          value: `${data.contactName || "—"} · ${data.contactEmail || "—"}`,
        },
        { label: "From", value: data.fromAddress },
      ],
      closing: [data.orgName],
    }
  );
}
