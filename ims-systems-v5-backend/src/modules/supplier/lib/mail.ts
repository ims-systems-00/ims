import {
  renderEmail,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
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

function collectDocItems(
  supplier: AslSupplier,
  lead: number,
  today: Date
): string[] {
  const items: string[] = [];
  for (const d of expiredDocs(supplier, lead, today)) {
    items.push(
      `• ${d.type} (${d.ref || "on file"}) – expired ${d.exp}. Please send the renewed document.`
    );
  }
  for (const d of soonDocs(supplier, lead, today)) {
    items.push(
      `• ${d.type} (${d.ref || "on file"}) – expires ${d.exp}. Please send the renewal before that date.`
    );
  }
  for (const r of missingDocs(supplier, lead, today)) {
    items.push(`• ${r.replace(/\|/g, " or ")} – not yet received.`);
  }
  if (!items.length) {
    items.push(
      "• No documents outstanding. This is a courtesy note confirming your approved status and our requirements."
    );
  }
  return items;
}

export function buildSupplierMail(input: {
  supplier: AslSupplier;
  settings: Pick<AslSettings, "lead" | "follow" | "from">;
  orgName: string;
  actorName: string;
  uploadUrl: string;
  today?: Date;
  branding?: EmailBranding;
}): AslMailContent {
  const today = input.today ?? startOfToday();
  const s = input.supplier;
  const items = collectDocItems(s, input.settings.lead, today);
  const due = toIsoDate(addDays(today, input.settings.follow + 7));
  const holdNote =
    s.crit === "Critical" || s.cat === "Contractor on site"
      ? "As a critical supplier/contractor, orders or site access may be held until the documents are received."
      : undefined;
  const reqsNote = s.reqs
    ? `As a reminder, our requirements for your supply are: ${s.reqs}.`
    : undefined;

  const rendered = renderEmail(
    "asl-docs-chase",
    {
      orgName: input.orgName,
      supplierName: s.name,
      contactName: s.contact || s.name,
      actorName: input.actorName,
      fromAddress: input.settings.from,
      dueDate: due,
      uploadUrl: input.uploadUrl,
      items,
      ...(holdNote ? { holdNote } : {}),
      ...(reqsNote ? { reqsNote } : {}),
    },
    input.branding ? { branding: input.branding } : undefined
  );

  return { ...rendered, items };
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

/** Re-evaluation due reminder for the supplier contact. */
export function buildEvalDueMail(input: {
  supplier: AslSupplier;
  settings: Pick<AslSettings, "from">;
  orgName: string;
  actorName: string;
  evalDue: string;
  uploadUrl: string;
  branding?: EmailBranding;
}): AslMailContent {
  const s = input.supplier;
  const rendered = renderEmail(
    "asl-eval-due",
    {
      orgName: input.orgName,
      supplierName: s.name,
      contactName: s.contact || s.name,
      actorName: input.actorName,
      fromAddress: input.settings.from,
      evalDue: input.evalDue,
      uploadUrl: input.uploadUrl,
    },
    input.branding ? { branding: input.branding } : undefined
  );
  return {
    ...rendered,
    items: [`Re-evaluation due ${input.evalDue}`],
  };
}

/** Internal org reminder when a supplier evaluation is due. */
export function buildEvalDueInternalMail(input: {
  supplier: AslSupplier;
  settings: Pick<AslSettings, "from">;
  orgName: string;
  evalDue: string;
  branding?: EmailBranding;
}): AslMailContent {
  const s = input.supplier;
  const rendered = renderEmail(
    "asl-eval-due-internal",
    {
      orgName: input.orgName,
      supplierName: s.name,
      supplierReference: s.reference,
      criticality: s.crit,
      contactName: s.contact || "",
      contactEmail: s.email || "",
      fromAddress: input.settings.from,
      evalDue: input.evalDue,
    },
    input.branding ? { branding: input.branding } : undefined
  );
  return {
    ...rendered,
    items: [`Re-evaluation due ${input.evalDue}`],
  };
}
