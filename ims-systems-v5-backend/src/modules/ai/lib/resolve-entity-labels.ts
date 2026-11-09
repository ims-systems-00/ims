/**
 * Replace Mongo ObjectIds in Alice card text / answers with display names
 * (users and functional units) and scrub leftover record ids.
 */

import mongoose from "mongoose";
import { getFunctionalUnitModel } from "../../functional-units/repositories/functional-unit.model";
import { getUserModel } from "../../users/repositories/user.model";
import type { AiContextCard, AiResolvedRef } from "../types/chat";

/** 24-char hex Mongo ObjectId. */
export const MONGO_OBJECT_ID_RE = /\b[a-f0-9]{24}\b/gi;

/** Explicit placeholder when a person/unit id cannot be joined. */
export const UNKNOWN_ENTITY_LABEL = "Unknown user";

function resolveRefName(
  ref: AiResolvedRef | null | undefined,
  labels: Map<string, string>
): AiResolvedRef | null {
  if (!ref?.id) return null;
  const mapped = labels.get(ref.id.trim().toLowerCase());
  return {
    id: ref.id,
    name: mapped ?? UNKNOWN_ENTITY_LABEL,
  };
}

const OBJECT_ID_ONLY_RE = /^[a-f0-9]{24}$/i;

export function isMongoObjectIdString(value: string): boolean {
  return OBJECT_ID_ONLY_RE.test(value.trim());
}

export function collectObjectIds(
  ...texts: Array<string | null | undefined>
): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    const matches = text.match(MONGO_OBJECT_ID_RE);
    if (!matches) continue;
    for (const id of matches) {
      found.add(id.toLowerCase());
    }
  }
  return [...found];
}

function toObjectIds(ids: string[]): mongoose.Types.ObjectId[] {
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    try {
      out.push(new mongoose.Types.ObjectId(id));
    } catch {
      /* ignore invalid */
    }
  }
  return out;
}

/**
 * Resolve user + functional-unit ids for an organisation into display labels.
 * Users win when the same id exists in both collections (should not happen).
 */
export async function resolveEntityLabels(
  organizationId: string,
  ids: string[]
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean)),
  ];
  const labels = new Map<string, string>();
  if (unique.length === 0 || !organizationId) return labels;

  const objectIds = toObjectIds(unique);
  if (objectIds.length === 0) return labels;

  const [users, units] = await Promise.all([
    getUserModel()
      .find({ _id: { $in: objectIds }, deletedAt: null })
      .select({ name: 1, firstName: 1, lastName: 1 })
      .lean()
      .catch(() => []),
    getFunctionalUnitModel()
      .find({
        _id: { $in: objectIds },
        organizationId,
        deletedAt: null,
      })
      .select({ name: 1, reference: 1 })
      .lean()
      .catch(() => []),
  ]);

  for (const unit of units as Array<{
    _id: unknown;
    name?: string;
    reference?: string;
  }>) {
    const id = String(unit._id).toLowerCase();
    const name = unit.name?.trim() || unit.reference?.trim();
    if (name) labels.set(id, name);
  }

  for (const user of users as Array<{
    _id: unknown;
    name?: string;
    firstName?: string;
    lastName?: string;
  }>) {
    const id = String(user._id).toLowerCase();
    const composed = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const name = user.name?.trim() || composed;
    if (name) labels.set(id, name);
  }

  return labels;
}

export function cardDisplayLabel(card: AiContextCard): string {
  const ref = card.reference?.trim();
  if (ref && !isMongoObjectIdString(ref)) return ref;
  const title = card.title?.trim();
  if (title && !isMongoObjectIdString(title)) return title;
  return card.module;
}

export function buildRecordIdLabelMap(
  cards: AiContextCard[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const card of cards) {
    const id = card.id?.trim().toLowerCase();
    if (!id) continue;
    map.set(id, cardDisplayLabel(card));
  }
  return map;
}

/**
 * Replace ObjectIds with labels. Optionally rewrite bare-ObjectId markdown
 * link labels while keeping href paths intact.
 */
export function applyEntityLabels(
  text: string,
  labels: Map<string, string>,
  options?: { rewriteLinkLabels?: boolean; unknownReplacement?: string }
): string {
  if (!text) return text;
  const unknown = options?.unknownReplacement;
  const rewriteLinkLabels = options?.rewriteLinkLabels === true;

  let next = text;
  if (rewriteLinkLabels) {
    next = next.replace(
      /\[([^\]]*)\]\(([^)]+)\)/g,
      (full, label: string, href: string) => {
        const trimmed = String(label).trim();
        if (!isMongoObjectIdString(trimmed)) return full;
        const mapped =
          labels.get(trimmed.toLowerCase()) ??
          (unknown !== undefined ? unknown : null);
        if (mapped == null) return full;
        const safeLabel =
          mapped === "—" ||
          mapped === "-" ||
          mapped === UNKNOWN_ENTITY_LABEL
            ? "View"
            : mapped;
        return `[${safeLabel}](${href})`;
      }
    );
  }

  if (labels.size === 0 && unknown === undefined) return next;

  const protectedChunks: string[] = [];
  const mask = (chunk: string) => {
    const token = `\u0000P${protectedChunks.length}\u0000`;
    protectedChunks.push(chunk);
    return token;
  };

  // Protect full markdown links and bare URLs so path ids stay for routing.
  const masked = next
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, (m) => mask(m))
    .replace(/https?:\/\/[^\s)\]>"']+/gi, (m) => mask(m));

  const replaced = masked.replace(MONGO_OBJECT_ID_RE, (id) => {
    const key = id.toLowerCase();
    if (labels.has(key)) return labels.get(key)!;
    if (unknown !== undefined) return unknown;
    return id;
  });

  return replaced.replace(/\u0000P(\d+)\u0000/g, (_, index: string) => {
    return protectedChunks[Number(index)] ?? "";
  });
}

/**
 * Replace known record/person/unit ids. Unresolved ids become an explicit
 * placeholder — never a silent blank — so tables keep a visible owner cell.
 */
export function sanitizeAliceAnswer(
  text: string,
  recordLabels: Map<string, string>,
  entityLabels: Map<string, string>
): string {
  if (!text) return text;
  const merged = new Map<string, string>([...recordLabels, ...entityLabels]);
  return applyEntityLabels(text, merged, {
    rewriteLinkLabels: true,
    unknownReplacement: UNKNOWN_ENTITY_LABEL,
  });
}

function collectCardEntityIds(cards: AiContextCard[]): string[] {
  const ids: string[] = [];
  for (const card of cards) {
    if (card.owner?.id) ids.push(card.owner.id);
    if (card.raisedBy?.id) ids.push(card.raisedBy.id);
    if (card.functionalUnit?.id) ids.push(card.functionalUnit.id);
    for (const row of card.assignees ?? []) {
      if (row.id) ids.push(row.id);
    }
  }
  return ids;
}

export async function enrichAliceCards(
  organizationId: string,
  cards: AiContextCard[]
): Promise<AiContextCard[]> {
  if (cards.length === 0) return cards;
  const ids = [
    ...collectObjectIds(
      ...cards.flatMap((card) => [card.summary, card.title, card.reference])
    ),
    ...collectCardEntityIds(cards),
  ];
  const labels = await resolveEntityLabels(organizationId, ids);
  return cards.map((card) => {
    const owner = resolveRefName(card.owner, labels);
    const raisedBy = resolveRefName(card.raisedBy, labels);
    const functionalUnit = resolveRefName(card.functionalUnit, labels);
    const assignees = (card.assignees ?? [])
      .map((row) => resolveRefName(row, labels))
      .filter((row): row is AiResolvedRef => row != null);
    return {
      ...card,
      owner,
      raisedBy,
      functionalUnit,
      assignees: assignees.length > 0 ? assignees : card.assignees,
      title: applyEntityLabels(card.title, labels, {
        unknownReplacement: UNKNOWN_ENTITY_LABEL,
      }),
      reference: card.reference
        ? applyEntityLabels(card.reference, labels, {
            unknownReplacement: UNKNOWN_ENTITY_LABEL,
          })
        : card.reference,
      summary: applyEntityLabels(card.summary, labels, {
        unknownReplacement: UNKNOWN_ENTITY_LABEL,
      }),
    };
  });
}

export async function enrichAliceCard(
  organizationId: string,
  card: AiContextCard | null
): Promise<AiContextCard | null> {
  if (!card) return null;
  const [enriched] = await enrichAliceCards(organizationId, [card]);
  return enriched ?? card;
}

export async function enrichAliceText(
  organizationId: string,
  text: string,
  cards: AiContextCard[] = []
): Promise<string> {
  if (!text) return text;
  const ids = collectObjectIds(text);
  const entityLabels = await resolveEntityLabels(organizationId, ids);
  const recordLabels = buildRecordIdLabelMap(cards);
  return sanitizeAliceAnswer(text, recordLabels, entityLabels);
}
