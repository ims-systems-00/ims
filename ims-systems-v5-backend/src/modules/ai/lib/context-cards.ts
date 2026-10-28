/**
 * Compact prompt cards for grounded Alice chat.
 */

import type { AiContextCard } from "../types/chat";

/** Detail cards (pins / tell-me-about). */
export const DETAIL_SUMMARY_MAX = 350;
/** List / search cards — key fields only. */
export const LIST_SUMMARY_MAX = 160;
/** Hard cap for the whole records block in the prompt. */
export const RECORD_CONTEXT_CHAR_BUDGET = 2800;

const MAX_SUMMARY = DETAIL_SUMMARY_MAX;

export function truncate(text: string | null | undefined, max = MAX_SUMMARY): string {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function toListCard(card: AiContextCard): AiContextCard {
  return {
    ...card,
    summary: truncate(card.summary, LIST_SUMMARY_MAX),
  };
}

export function toDetailCard(card: AiContextCard): AiContextCard {
  return {
    ...card,
    summary: truncate(card.summary, DETAIL_SUMMARY_MAX),
  };
}

export function riskCard(doc: Record<string, unknown>): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const reference = doc.reference ? String(doc.reference) : null;
  const title = String(doc.title ?? reference ?? "Risk");
  const status = doc.status ? String(doc.status) : null;
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      doc.likelihood != null ? `Likelihood: ${doc.likelihood}` : null,
      doc.consequence != null ? `Consequence: ${doc.consequence}` : null,
      doc.description ? String(doc.description) : null,
    ]
      .filter(Boolean)
      .join(" · ")
  );
  return {
    module: "risks",
    id,
    reference,
    title,
    status,
    summary,
    href: `/risks?risk=${encodeURIComponent(id)}`,
  };
}

export function incidentCard(doc: Record<string, unknown>): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const reference = doc.reference ? String(doc.reference) : null;
  const title = String(doc.title ?? reference ?? "Incident");
  const status = doc.status ? String(doc.status) : null;
  const priority = doc.priority ? String(doc.priority) : null;
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      priority ? `Priority: ${priority}` : null,
      doc.description ? String(doc.description) : null,
    ]
      .filter(Boolean)
      .join(" · ")
  );
  return {
    module: "incidents",
    id,
    reference,
    title,
    status,
    summary,
    href: `/incidents?incident=${encodeURIComponent(id)}`,
  };
}

export function auditCard(doc: Record<string, unknown>): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const reference = doc.reference ? String(doc.reference) : null;
  const title = String(doc.title ?? reference ?? "Audit");
  const status = doc.status ? String(doc.status) : null;
  const auditType =
    String(doc.type ?? "").toLowerCase() === "external" ? "external" : "internal";
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      doc.focusArea ? `Focus: ${doc.focusArea}` : null,
    ]
      .filter(Boolean)
      .join(" · ")
  );
  return {
    module: "audits",
    id,
    reference,
    title,
    status,
    summary,
    href: `/audits/${auditType}?audit=${encodeURIComponent(id)}`,
  };
}

export function documentCard(doc: Record<string, unknown>): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const reference = doc.reference ? String(doc.reference) : null;
  const title = String(doc.name ?? reference ?? "Document");
  const status = doc.status ? String(doc.status) : null;
  const repositoryId = doc.repositoryId ? String(doc.repositoryId) : null;
  const purpose = (doc.documentData as { purpose?: string } | undefined)?.purpose;
  const links = (
    doc.documentData as { complianceLinks?: Array<{ toolkitId: string }> } | undefined
  )?.complianceLinks;
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      purpose ? `Purpose: ${purpose}` : null,
      links?.length
        ? `Compliance: ${links.map((l) => l.toolkitId).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ")
  );
  return {
    module: "documents",
    id,
    reference,
    title,
    status,
    summary,
    href: repositoryId
      ? `/documents/repositories/${encodeURIComponent(repositoryId)}/nodes/${encodeURIComponent(id)}`
      : "/documents",
  };
}

export function ofiCard(doc: Record<string, unknown>): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const reference = doc.reference ? String(doc.reference) : null;
  const title = String(doc.title ?? reference ?? "OFI");
  const status = doc.status ? String(doc.status) : null;
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      doc.description ? String(doc.description) : null,
    ]
      .filter(Boolean)
      .join(" · ")
  );
  return {
    module: "ofi",
    id,
    reference,
    title,
    status,
    summary,
    href: `/ofi?ofi=${encodeURIComponent(id)}`,
  };
}

export function taskCard(doc: Record<string, unknown>): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const reference = doc.reference ? String(doc.reference) : null;
  const title = String(doc.name ?? reference ?? "Task");
  const status = doc.status ? String(doc.status) : null;
  const priority = doc.priority ? String(doc.priority) : null;
  const dueDate = doc.dueDate
    ? new Date(String(doc.dueDate)).toISOString().slice(0, 10)
    : null;
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      priority ? `Priority: ${priority}` : null,
      dueDate ? `Due: ${dueDate}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    LIST_SUMMARY_MAX
  );
  return {
    module: "tasks",
    id,
    reference,
    title,
    status,
    summary,
    href: `/tasks?task=${encodeURIComponent(id)}`,
  };
}

export function complianceControlCard(
  doc: Record<string, unknown>
): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const clause = doc.clause ? String(doc.clause) : null;
  const title = String(doc.title ?? clause ?? "Control");
  const toolkit = doc.name ? String(doc.name) : "compliance";
  const selected = doc.selected ? String(doc.selected) : null;
  const state = doc.state ? String(doc.state) : null;
  const status = [selected, state].filter(Boolean).join(" / ") || null;
  const summary = truncate(
    [
      toolkit,
      clause,
      title,
      status ? `Status: ${status}` : null,
      doc.compliancePercentage != null
        ? `Progress: ${doc.compliancePercentage}%`
        : null,
    ]
      .filter(Boolean)
      .join(" · ")
  );
  return {
    module: "compliance",
    id,
    reference: clause,
    title,
    status,
    summary,
    href: `/compliance/${encodeURIComponent(toolkit)}?control=${encodeURIComponent(id)}`,
  };
}

export function cardsToPromptBlock(
  cards: AiContextCard[],
  budget = RECORD_CONTEXT_CHAR_BUDGET
): string {
  if (cards.length === 0) {
    return (
      "No organisation records were retrieved for this question. " +
      "Tell the user none were found matching their request — do not invent references."
    );
  }
  const parts: string[] = [];
  let used = 0;
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index]!;
    const block =
      `[${index + 1}] ${card.module} ${card.reference ?? card.id} — ${card.title}\n` +
      `status: ${card.status ?? "n/a"}\n` +
      `href: ${card.href}\n` +
      `${card.summary}`;
    if (used + block.length + 2 > budget && parts.length > 0) break;
    parts.push(block);
    used += block.length + 2;
  }
  return parts.join("\n\n");
}
