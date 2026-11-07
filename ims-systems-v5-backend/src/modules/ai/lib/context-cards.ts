/**
 * Compact prompt cards for grounded Alice chat.
 */

import type { AiContextCard, AiResolvedRef } from "../types/chat";

function refFromId(id: string | null | undefined): AiResolvedRef | null {
  if (!id) return null;
  return { id, name: id };
}

function refsFromIds(ids: string[]): AiResolvedRef[] {
  return ids.map((id) => ({ id, name: id }));
}

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

function riskLifecycleStatus(doc: Record<string, unknown>): string {
  if ((doc.mitigated as { status?: boolean } | undefined)?.status) {
    return "Mitigated";
  }
  if ((doc.accepted as { status?: boolean } | undefined)?.status) {
    return "Accepted";
  }
  if ((doc.escalated as { status?: boolean } | undefined)?.status) {
    return "Escalated";
  }
  return "Open";
}

function scorePairLabel(
  pair: { likelihood?: number; consequence?: number } | null | undefined,
  label: string
): string | null {
  if (!pair || pair.likelihood == null || pair.consequence == null) return null;
  const product = Number(pair.likelihood) * Number(pair.consequence);
  return `${label}: L${pair.likelihood}×C${pair.consequence}=${product}`;
}

export function riskCard(doc: Record<string, unknown>): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const reference = doc.reference ? String(doc.reference) : null;
  const title = String(doc.title ?? reference ?? "Risk");
  const status = doc.status ? String(doc.status) : riskLifecycleStatus(doc);
  const raisedOn = doc.raisedOn
    ? new Date(String(doc.raisedOn)).toISOString().slice(0, 10)
    : null;
  const raisedBy = refFromId(doc.raisedBy ? String(doc.raisedBy) : null);
  const owner = refFromId(doc.ownerId ? String(doc.ownerId) : null);
  const functionalUnit = refFromId(
    doc.businessUnitId ? String(doc.businessUnitId) : null
  );
  const current = doc.currentScore as
    | { likelihood?: number; consequence?: number }
    | undefined;
  const initial = doc.initialScore as
    | { likelihood?: number; consequence?: number }
    | undefined;
  const summary = truncate(
    [
      reference,
      title,
      `Status: ${status}`,
      raisedOn ? `Raised on: ${raisedOn}` : null,
      raisedBy ? `Raised by: ${raisedBy.name}` : null,
      scorePairLabel(current, "Current"),
      scorePairLabel(initial, "Initial"),
      owner ? `Owner: ${owner.name}` : null,
      functionalUnit ? `Functional unit: ${functionalUnit.name}` : null,
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
    owner,
    raisedBy,
    functionalUnit,
  };
}

export function incidentCard(doc: Record<string, unknown>): AiContextCard {
  const id = String(doc._id ?? doc.id);
  const reference = doc.reference ? String(doc.reference) : null;
  const title = String(doc.title ?? reference ?? "Incident");
  const status = doc.status ? String(doc.status) : null;
  const priority = doc.priority ? String(doc.priority) : null;
  const raisedBy = refFromId(doc.raisedBy ? String(doc.raisedBy) : null);
  const owner = refFromId(doc.ownerId ? String(doc.ownerId) : null);
  const functionalUnit = refFromId(
    doc.businessUnitId ? String(doc.businessUnitId) : null
  );
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      priority ? `Priority: ${priority}` : null,
      raisedBy ? `Raised by: ${raisedBy.name}` : null,
      owner ? `Owner: ${owner.name}` : null,
      functionalUnit ? `Functional unit: ${functionalUnit.name}` : null,
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
    owner,
    raisedBy,
    functionalUnit,
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
  const toolkitNames = (links ?? [])
    .map((l) => String(l.toolkitId ?? "").trim())
    .filter((name) => name.length > 0 && !/^[a-f0-9]{24}$/i.test(name));
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      purpose ? `Purpose: ${purpose}` : null,
      toolkitNames.length > 0
        ? `Compliance: ${toolkitNames.join(", ")}`
        : links?.length
          ? `Compliance links: ${links.length}`
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
  const owner = refFromId(doc.ownerId ? String(doc.ownerId) : null);
  const functionalUnit = refFromId(
    doc.businessUnitId ? String(doc.businessUnitId) : null
  );
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      owner ? `Owner: ${owner.name}` : null,
      functionalUnit ? `Functional unit: ${functionalUnit.name}` : null,
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
    owner,
    functionalUnit,
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
  const functionalUnit = refFromId(
    doc.businessUnitId ? String(doc.businessUnitId) : null
  );
  const assigneeIds = Array.isArray(doc.assignees)
    ? (doc.assignees as Array<{ userId?: unknown }>)
        .map((row) => (row?.userId ? String(row.userId) : ""))
        .filter(Boolean)
    : [];
  const assignees = refsFromIds(assigneeIds);
  const raisedBy = refFromId(doc.createdBy ? String(doc.createdBy) : null);
  const summary = truncate(
    [
      reference,
      title,
      status ? `Status: ${status}` : null,
      priority ? `Priority: ${priority}` : null,
      dueDate ? `Due: ${dueDate}` : null,
      assignees.length > 0
        ? `Assignees: ${assignees.map((a) => a.name).join(", ")}`
        : null,
      raisedBy ? `Created by: ${raisedBy.name}` : null,
      functionalUnit ? `Functional unit: ${functionalUnit.name}` : null,
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
    raisedBy,
    functionalUnit,
    assignees,
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
  const pct =
    doc.compliancePercentage != null
      ? Number(doc.compliancePercentage)
      : null;
  const owner = refFromId(
    doc.ownerId
      ? String(doc.ownerId)
      : doc.responsibleUserId
        ? String(doc.responsibleUserId)
        : null
  );
  const functionalUnit = refFromId(doc.groupId ? String(doc.groupId) : null);
  const updatedAt = doc.updatedAt
    ? new Date(String(doc.updatedAt)).toISOString().slice(0, 10)
    : null;
  const summary = truncate(
    [
      toolkit,
      clause,
      title,
      status ? `Status: ${status}` : null,
      pct != null && !Number.isNaN(pct) ? `Progress: ${pct}%` : null,
      owner ? `Owner: ${owner.name}` : null,
      functionalUnit ? `Functional unit: ${functionalUnit.name}` : null,
      updatedAt ? `Updated: ${updatedAt}` : null,
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
    owner,
    functionalUnit,
  };
}

export function cardsToPromptBlock(
  cards: AiContextCard[],
  budget = RECORD_CONTEXT_CHAR_BUDGET,
  clientAppOrigin?: string
): string {
  if (cards.length === 0) {
    return (
      "No organisation records were retrieved for this question. " +
      "Tell the user none were found matching their request — do not invent references."
    );
  }
  const origin = (clientAppOrigin ?? "").trim().replace(/\/+$/, "");
  const parts: string[] = [];
  let used = 0;
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index]!;
    const hrefPath = card.href.startsWith("/") ? card.href : `/${card.href}`;
    const href =
      origin && hrefPath.startsWith("/") && !hrefPath.startsWith("//")
        ? `${origin}${hrefPath}`
        : hrefPath;
    const label =
      card.reference && !/^[a-f0-9]{24}$/i.test(card.reference)
        ? card.reference
        : card.title;
    const peopleLines = [
      card.raisedBy
        ? `raisedBy: ${card.raisedBy.name}`
        : null,
      card.owner ? `owner: ${card.owner.name}` : null,
      card.functionalUnit
        ? `functionalUnit: ${card.functionalUnit.name}`
        : null,
      card.assignees && card.assignees.length > 0
        ? `assignees: ${card.assignees.map((a) => a.name).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    const block =
      `[${index + 1}] ${card.module} ${label} — ${card.title}\n` +
      `status: ${card.status ?? "n/a"}\n` +
      `recordId: ${card.id} (internal only — never show ObjectIds to the user)\n` +
      `href: ${href}\n` +
      (peopleLines ? `${peopleLines}\n` : "") +
      `${card.summary}`;
    if (used + block.length + 2 > budget && parts.length > 0) break;
    parts.push(block);
    used += block.length + 2;
  }
  return parts.join("\n\n");
}
