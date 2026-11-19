import {
  addDays,
  daysUntil,
  expiredDocs,
  missingDocs,
  soonDocs,
  startOfToday,
  toIsoDate,
} from "./asl-rules";
import type { AslSettings, AslSupplier } from "../types";

export type AslMailContent = {
  subject: string;
  text: string;
  html: string;
  items: string[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSupplierMail(input: {
  supplier: AslSupplier;
  settings: Pick<AslSettings, "lead" | "follow" | "from">;
  orgName: string;
  actorName: string;
  uploadUrl: string;
  today?: Date;
}): AslMailContent {
  const today = input.today ?? startOfToday();
  const s = input.supplier;
  const items: string[] = [];

  for (const d of expiredDocs(s, input.settings.lead, today)) {
    items.push(
      `• ${d.type} (${d.ref || "on file"}) – expired ${d.exp}. Please send the renewed document.`
    );
  }
  for (const d of soonDocs(s, input.settings.lead, today)) {
    items.push(
      `• ${d.type} (${d.ref || "on file"}) – expires ${d.exp}. Please send the renewal before that date.`
    );
  }
  for (const r of missingDocs(s, input.settings.lead, today)) {
    items.push(`• ${r.replace(/\|/g, " or ")} – not yet received.`);
  }
  if (!items.length) {
    items.push(
      "• No documents outstanding. This is a courtesy note confirming your approved status and our requirements."
    );
  }

  const due = toIsoDate(addDays(today, input.settings.follow + 7));
  const subject = `${input.orgName}: supplier documents required by ${due}`;
  const holdNote =
    s.crit === "Critical" || s.cat === "Contractor on site"
      ? "As a critical supplier/contractor, orders or site access may be held until the documents are received.\n\n"
      : "";
  const reqsNote = s.reqs
    ? `As a reminder, our requirements for your supply are: ${s.reqs}.\n\n`
    : "";

  const text = `Dear ${s.contact || s.name},

${input.orgName} keeps an approved supplier list as part of our ISO management system, and we need the following from ${s.name}:

${items.join("\n")}

Please reply with the documents, or upload them here (no account needed): ${input.uploadUrl}

We need them by ${due}. ${holdNote}${reqsNote}Thank you,
${input.actorName}
${input.orgName} · ${input.settings.from}`;

  const html = `<p>Dear ${escapeHtml(s.contact || s.name)},</p>
<p>${escapeHtml(input.orgName)} keeps an approved supplier list as part of our ISO management system, and we need the following from <strong>${escapeHtml(s.name)}</strong>:</p>
<ul>${items.map((i) => `<li>${escapeHtml(i.replace(/^•\s*/, ""))}</li>`).join("")}</ul>
<p>Please reply with the documents, or <a href="${escapeHtml(input.uploadUrl)}">upload them here</a> (no account needed).</p>
<p>We need them by <strong>${escapeHtml(due)}</strong>.</p>
${holdNote ? `<p>${escapeHtml(holdNote.trim())}</p>` : ""}
${reqsNote ? `<p>${escapeHtml(reqsNote.trim())}</p>` : ""}
<p>Thank you,<br/>${escapeHtml(input.actorName)}<br/>${escapeHtml(input.orgName)} · ${escapeHtml(input.settings.from)}</p>`;

  return { subject, text, html, items };
}

export function recentChaseType(
  supplier: AslSupplier,
  escDays: number,
  today = startOfToday()
): "Follow-up" | "Notification" {
  const recent = supplier.comms.some(
    (c) =>
      /chase|request|notif|follow/i.test(c.type) &&
      daysUntil(c.date, today) > -escDays
  );
  return recent ? "Follow-up" : "Notification";
}
