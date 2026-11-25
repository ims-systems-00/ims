import { escapeHtml, nl2br } from "../primitives";
import { renderEmailLayout } from "../layout";
import type { RenderedEmail } from "../types";

export type TrainingSessionInviteEmailData = {
  orgName: string;
  personName: string;
  course: string;
  dateLabel: string;
  location: string;
  bodyText: string;
  acceptUrl: string;
  declineUrl: string;
  selfUrl: string;
};

export type TrainingSessionReminderEmailData = {
  orgName: string;
  personName: string;
  course: string;
  sessionDate: string;
  days: number;
  manager?: string;
  selfUrl?: string;
};

export type TrainingExpiringEmailData = {
  orgName: string;
  personName: string;
  course: string;
  sessionDate?: string;
  days: number;
  manager?: string;
  selfUrl?: string;
};

export type TrainingExpiredEmailData = {
  orgName: string;
  personName: string;
  course: string;
  sessionDate?: string;
  days?: number;
  manager?: string;
  selfUrl?: string;
};

export function renderTrainingSessionInvite(
  data: TrainingSessionInviteEmailData
): RenderedEmail {
  return renderEmailLayout(
    `${data.orgName}: ${data.course} · ${data.dateLabel}`,
    {
      mode: "invite",
      eyebrow: "Training invitation",
      title: data.course,
      greeting: `Hello ${data.personName},`,
      paragraphs: [
        `You are invited to ${data.course} on ${data.dateLabel}${
          data.location ? ` (${data.location})` : ""
        }.`,
        "Please let us know whether you can attend.",
      ],
      meta: [
        { label: "Course", value: data.course },
        { label: "When", value: data.dateLabel },
        ...(data.location
          ? [{ label: "Where", value: data.location }]
          : []),
      ],
      cta: { label: "Accept invitation", href: data.acceptUrl },
      safeHtmlBlock: `<p style="margin:16px 0 0;font-size:14px;">Or <a href="${escapeHtml(data.declineUrl)}">decline</a>${
        data.selfUrl
          ? ` · <a href="${escapeHtml(data.selfUrl)}">your training record</a>`
          : ""
      }</p><div style="margin-top:16px;font-size:13px;color:#555;">${nl2br(data.bodyText)}</div>`,
      footerNote: `${data.orgName} · Training & competency`,
    }
  );
}

export function renderTrainingSessionReminder(
  data: TrainingSessionReminderEmailData
): RenderedEmail {
  const dayLabel =
    data.days === 0
      ? "today"
      : data.days === 1
        ? "tomorrow"
        : `in ${data.days} days`;
  return renderEmailLayout(
    `${data.orgName}: reminder — ${data.course} ${dayLabel}`,
    {
      mode: "action",
      eyebrow: "Training reminder",
      title: data.course,
      greeting: `Hello ${data.personName},`,
      paragraphs: [
        `This is a reminder that ${data.course} is scheduled for ${data.sessionDate} (${dayLabel}).`,
      ],
      cta: data.selfUrl
        ? { label: "Open my training", href: data.selfUrl }
        : undefined,
      footerNote: `${data.orgName} · Training & competency`,
    }
  );
}

export function renderTrainingExpiring(
  data: TrainingExpiringEmailData
): RenderedEmail {
  return renderEmailLayout(
    `${data.orgName}: ${data.course} expires in ${data.days} days`,
    {
      mode: "alert",
      statusChip: { label: "Expiring soon", tone: "warning" },
      eyebrow: "Competency renewal",
      title: data.course,
      greeting: `Hello ${data.personName},`,
      paragraphs: [
        `Your ${data.course} competence expires in ${data.days} days. Please arrange renewal or upload a new certificate.`,
        data.manager ? `Your manager (${data.manager}) has also been noted.` : "",
      ].filter(Boolean),
      cta: data.selfUrl
        ? { label: "Open my training", href: data.selfUrl }
        : undefined,
      footerNote: `${data.orgName} · Training & competency`,
    }
  );
}

export function renderTrainingExpired(
  data: TrainingExpiredEmailData
): RenderedEmail {
  return renderEmailLayout(
    `${data.orgName}: ${data.course} has expired`,
    {
      mode: "alert",
      statusChip: { label: "Expired", tone: "danger" },
      eyebrow: "Competency expired",
      title: data.course,
      greeting: `Hello ${data.personName},`,
      paragraphs: [
        `Your ${data.course} competence has expired. You should not carry out related controlled work until it is renewed.`,
        data.manager ? `Your manager (${data.manager}) has also been noted.` : "",
      ].filter(Boolean),
      cta: data.selfUrl
        ? { label: "Open my training", href: data.selfUrl }
        : undefined,
      footerNote: `${data.orgName} · Training & competency`,
    }
  );
}
