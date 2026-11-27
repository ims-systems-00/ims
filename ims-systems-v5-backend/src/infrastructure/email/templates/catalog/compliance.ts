import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

/** Immediate alert: a clause lapsed or a high-severity action appeared. */
export type ComplianceAlertEmailData = {
  orgName: string;
  recipientName: string;
  /** e.g. "ISO 7.2 Competence is now Lapsed" */
  headline: string;
  detail: string;
  clause: string;
  standards: string;
  status: string;
  due?: string;
  actionLabel?: string;
  url: string;
};

export type ComplianceDigestItem = {
  title: string;
  clause: string;
  severity: "High" | "Medium" | "Low";
  due?: string;
};

/** Daily digest of open "Do next" items. */
export type ComplianceDigestEmailData = {
  orgName: string;
  recipientName: string;
  items: ComplianceDigestItem[];
  /** Total open items (items may be truncated). */
  total: number;
  url: string;
};

export function renderComplianceAlert(data: ComplianceAlertEmailData): RenderedEmail {
  return renderEmailLayout(`${data.orgName}: ${data.headline}`, {
    mode: "alert",
    eyebrow: "Live compliance",
    title: data.headline,
    greeting: `Hello ${data.recipientName},`,
    paragraphs: [data.detail],
    meta: [
      { label: "Clause", value: data.clause },
      { label: "Standards", value: data.standards },
      { label: "Status", value: data.status },
      ...(data.due ? [{ label: "Due", value: data.due }] : []),
    ],
    cta: { label: data.actionLabel ?? "Open live compliance", href: data.url },
    footerNote: `${data.orgName} · Live ISO compliance`,
  });
}

export function renderComplianceDigest(data: ComplianceDigestEmailData): RenderedEmail {
  const count = data.total;
  const title = count === 1 ? "1 compliance action to do" : `${count} compliance actions to do`;
  const more = count > data.items.length ? count - data.items.length : 0;
  return renderEmailLayout(`${data.orgName}: ${title}`, {
    mode: "action",
    eyebrow: "Live compliance · daily digest",
    title,
    greeting: `Hello ${data.recipientName},`,
    paragraphs: [
      "These items will keep your ISO clauses sustained. Nothing here is overdue yet.",
      ...data.items.map(
        (item, index) =>
          `${index + 1}. ${item.title} (${item.clause ? `ISO ${item.clause} · ` : ""}${item.severity}${
            item.due ? ` · due ${item.due}` : ""
          })`
      ),
      ...(more ? [`And ${more} more in iMS.`] : []),
    ],
    cta: { label: "Open live compliance", href: data.url },
    footerNote: `${data.orgName} · Live ISO compliance`,
  });
}
