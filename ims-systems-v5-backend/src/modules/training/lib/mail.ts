import {
  renderEmail,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import { fmtDateLong, renderTemplate } from "./training-rules";
import type {
  TrainingCompetency,
  TrainingModel,
  TrainingPerson,
  TrainingSession,
  TrainingSettings,
} from "../types";

export type TrainingMailContent = {
  subject: string;
  text: string;
  html: string;
};

function nl2br(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

export function buildInviteMail(input: {
  model: Pick<TrainingModel, "org" | "settings">;
  session: TrainingSession;
  competency: TrainingCompetency | undefined;
  person: TrainingPerson;
  selfUrl: string;
  acceptUrl: string;
  declineUrl: string;
  branding?: EmailBranding;
}): TrainingMailContent {
  const S = input.model.settings;
  const c = input.competency;
  const materials = (input.session.materials || []).filter((a) => a.shared);
  const vars: Record<string, string> = {
    name: input.person.name,
    course: c?.name || "",
    date: fmtDateLong(input.session.date),
    time: input.session.time ? " at " + input.session.time : "",
    location: input.session.location
      ? " (" + input.session.location + ")"
      : "",
    org: input.model.org || "",
    provider: input.session.provider || "",
    trainer: input.session.trainer || "",
    materials: materials.length
      ? "\nMaterials to read before the session:\n" +
        materials.map((a) => `• ${a.name}`).join("\n") +
        "\n"
      : "",
    accept: input.acceptUrl,
    decline: input.declineUrl,
    link: input.selfUrl,
  };
  const subject = renderTemplate(S.inviteSubject, vars);
  let body = renderTemplate(S.inviteBody, vars);
  if (vars.link) body += `\n\nYour training record: ${vars.link}`;

  try {
    const rendered = renderEmail(
      "training-session-invite",
      {
        orgName: vars.org || "",
        personName: vars.name || "",
        course: vars.course || "",
        dateLabel: (vars.date || "") + (vars.time || ""),
        location: input.session.location || "",
        bodyText: body,
        acceptUrl: input.acceptUrl,
        declineUrl: input.declineUrl,
        selfUrl: input.selfUrl,
      },
      { branding: input.branding }
    );
    return {
      subject: rendered.subject || subject,
      text: rendered.text || body,
      html: rendered.html,
    };
  } catch {
    return {
      subject,
      text: body,
      html: `<p>${nl2br(body)}</p>`,
    };
  }
}

export function buildReminderMail(input: {
  kind: "session" | "expiring" | "expired";
  orgName: string;
  personName: string;
  course?: string;
  sessionDate?: string;
  days?: number;
  manager?: string;
  selfUrl?: string;
  branding?: EmailBranding;
}): TrainingMailContent {
  const templateId =
    input.kind === "session"
      ? "training-session-reminder"
      : input.kind === "expiring"
        ? "training-expiring"
        : "training-expired";

  try {
    const rendered = renderEmail(
      templateId,
      {
        orgName: input.orgName,
        personName: input.personName,
        course: input.course || "",
        sessionDate: input.sessionDate || "",
        days: input.days ?? 0,
        manager: input.manager || "",
        selfUrl: input.selfUrl || "",
      },
      { branding: input.branding }
    );
    return {
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    };
  } catch {
    const subject =
      input.kind === "session"
        ? `${input.orgName}: training reminder — ${input.course}`
        : input.kind === "expiring"
          ? `${input.orgName}: ${input.course} expires in ${input.days} days`
          : `${input.orgName}: ${input.course} has expired`;
    const text =
      input.kind === "session"
        ? `Hello ${input.personName},\n\nReminder: ${input.course} on ${input.sessionDate}.\n${input.selfUrl || ""}`
        : `Hello ${input.personName},\n\n${input.course} ${input.kind === "expiring" ? `expires in ${input.days} days` : "has expired"}.\n${input.selfUrl || ""}`;
    return { subject, text, html: `<p>${nl2br(text)}</p>` };
  }
}

export type { TrainingSettings };
