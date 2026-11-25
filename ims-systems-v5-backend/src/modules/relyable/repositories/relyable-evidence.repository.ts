import { createHash } from "node:crypto";
import type {
  EmitEvidenceInput,
  RelyableEvidenceItem,
  RelyableEvidenceSubject,
} from "../types";
import {
  getRelyableEvidenceModel,
  type RelyableEvidenceDocument,
} from "./relyable-evidence.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function subjectKey(subject: RelyableEvidenceSubject | null | undefined): string {
  if (!subject) return "";
  return `${subject.kind}:${subject.id}`;
}

export function evidenceIdempotencyKey(
  organizationId: string,
  input: EmitEvidenceInput
): string {
  // Content fingerprint so same-day Sync can supersede when ratios/status change,
  // while identical re-emits stay idempotent.
  const content = hashItem({
    status: input.status,
    payload: input.payload ?? {},
    level: input.level,
    validUntil: input.validUntil ?? null,
  });
  return [
    organizationId,
    input.type,
    subjectKey(input.subject),
    input.observedAt,
    input.source,
    content,
  ].join("|");
}

function hashItem(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function toDomain(doc: RelyableEvidenceDocument): RelyableEvidenceItem {
  const subject =
    doc.subject && typeof doc.subject === "object"
      ? {
          kind: String((doc.subject as { kind?: string }).kind ?? ""),
          id: String((doc.subject as { id?: string }).id ?? ""),
        }
      : null;
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    type: doc.type,
    subject: subject?.kind && subject.id ? subject : null,
    status: doc.status as RelyableEvidenceItem["status"],
    observedAt: String(doc.observedAt),
    validUntil: doc.validUntil ? String(doc.validUntil) : null,
    payload:
      doc.payload && typeof doc.payload === "object"
        ? (doc.payload as Record<string, unknown>)
        : {},
    level: Number(doc.level) as 0 | 1 | 2 | 3,
    source: doc.source,
    disputed: Boolean(doc.disputed),
    prevHash: doc.prevHash ?? null,
    hash: doc.hash,
    at: iso(doc.at) ?? new Date().toISOString(),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type RelyableEvidenceRepository = ReturnType<
  typeof createRelyableEvidenceRepository
>;

export function createRelyableEvidenceRepository() {
  const Model = getRelyableEvidenceModel();

  return {
    async emit(
      organizationId: string,
      input: EmitEvidenceInput
    ): Promise<{ item: RelyableEvidenceItem; duplicate: boolean }> {
      let key = evidenceIdempotencyKey(organizationId, input);
      const existing = await Model.findOne({
        organizationId,
        idempotencyKey: key,
      }).lean();
      if (existing) {
        // True duplicate only when this row is still the latest for type+subject.
        // If a later Sync changed the ratio and we are re-affirming a prior
        // same-day payload, append a fresh ledger entry so `current()` moves.
        const latest = await Model.findOne({
          organizationId,
          type: input.type,
          disputed: { $ne: true },
          $or: input.subject
            ? [
                {
                  "subject.kind": input.subject.kind,
                  "subject.id": input.subject.id,
                },
              ]
            : [{ subject: null }, { subject: { $exists: false } }],
        })
          .sort({ observedAt: -1, at: -1, _id: -1 })
          .lean();
        if (
          latest &&
          String((latest as { _id: unknown })._id) ===
            String((existing as { _id: unknown })._id)
        ) {
          return {
            item: toDomain(existing as RelyableEvidenceDocument),
            duplicate: true,
          };
        }
        key = `${key}|reaffirm:${Date.now()}`;
      }

      const tail = await Model.findOne({ organizationId })
        .sort({ at: -1, _id: -1 })
        .lean();
      const prevHash = tail ? String((tail as RelyableEvidenceDocument).hash) : null;
      const at = new Date();
      const base = {
        organizationId,
        type: input.type,
        subject: input.subject ?? null,
        status: input.status,
        observedAt: input.observedAt,
        validUntil: input.validUntil ?? null,
        payload: input.payload ?? {},
        level: input.level,
        source: input.source,
        disputed: Boolean(input.disputed),
        prevHash,
        at,
        idempotencyKey: key,
      };
      const hash = hashItem({ ...base, hash: undefined });
      try {
        const created = await Model.create({ ...base, hash });
        return {
          item: toDomain(created.toObject() as RelyableEvidenceDocument),
          duplicate: false,
        };
      } catch (err) {
        // Race on unique idempotency key
        const again = await Model.findOne({
          organizationId,
          idempotencyKey: key,
        }).lean();
        if (again) {
          return {
            item: toDomain(again as RelyableEvidenceDocument),
            duplicate: true,
          };
        }
        throw err;
      }
    },

    async emitMany(
      organizationId: string,
      inputs: EmitEvidenceInput[]
    ): Promise<{ emitted: number; duplicates: number; items: RelyableEvidenceItem[] }> {
      let emitted = 0;
      let duplicates = 0;
      const items: RelyableEvidenceItem[] = [];
      for (const input of inputs) {
        const result = await this.emit(organizationId, input);
        items.push(result.item);
        if (result.duplicate) duplicates += 1;
        else emitted += 1;
      }
      return { emitted, duplicates, items };
    },

    /** Latest non-disputed item per (type, subject). */
    async current(organizationId: string): Promise<RelyableEvidenceItem[]> {
      const rows = await Model.find({ organizationId, disputed: { $ne: true } })
        .sort({ observedAt: 1, at: 1, _id: 1 })
        .lean();
      const latest = new Map<string, RelyableEvidenceItem>();
      for (const row of rows) {
        const item = toDomain(row as RelyableEvidenceDocument);
        const k = `${item.type}|${subjectKey(item.subject)}`;
        const cur = latest.get(k);
        // Prefer newer observedAt; on the same day prefer later append time.
        if (
          !cur ||
          item.observedAt > cur.observedAt ||
          (item.observedAt === cur.observedAt && item.at >= cur.at)
        ) {
          latest.set(k, item);
        }
      }
      return [...latest.values()];
    },

    async list(
      organizationId: string,
      limit = 200
    ): Promise<RelyableEvidenceItem[]> {
      const rows = await Model.find({ organizationId })
        .sort({ at: -1 })
        .limit(Math.min(Math.max(limit, 1), 1000))
        .lean();
      return rows.map((r) => toDomain(r as RelyableEvidenceDocument));
    },

    async verifyChain(organizationId: string): Promise<boolean> {
      const rows = await Model.find({ organizationId }).sort({ at: 1, _id: 1 }).lean();
      let prev: string | null = null;
      for (const row of rows) {
        const doc = row as RelyableEvidenceDocument;
        if ((doc.prevHash ?? null) !== prev) return false;
        const payload = {
          organizationId: doc.organizationId,
          type: doc.type,
          subject: doc.subject ?? null,
          status: doc.status,
          observedAt: doc.observedAt,
          validUntil: doc.validUntil ?? null,
          payload: doc.payload ?? {},
          level: doc.level,
          source: doc.source,
          disputed: Boolean(doc.disputed),
          prevHash: doc.prevHash ?? null,
          at: doc.at,
          idempotencyKey: doc.idempotencyKey,
        };
        if (hashItem(payload) !== doc.hash) return false;
        prev = doc.hash;
      }
      return true;
    },
  };
}
