import type { RelyableBand, RelyableCap, RelyableExplainRow, RelyableSnapshot } from "../types";
import type { ScoreResult } from "../lib/relyable-rules";
import {
  getRelyableSnapshotModel,
  type RelyableSnapshotDocument,
} from "./relyable-snapshot.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: RelyableSnapshotDocument): RelyableSnapshot {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    score: doc.score,
    raw: doc.raw,
    band: doc.band as RelyableBand,
    bandName: doc.bandName,
    tier: doc.tier,
    verifiedRatio: doc.verifiedRatio,
    domains:
      doc.domains && typeof doc.domains === "object"
        ? (doc.domains as Record<string, number | null>)
        : {},
    caps: Array.isArray(doc.caps)
      ? (doc.caps as RelyableCap[])
      : [],
    explain: Array.isArray(doc.explain)
      ? (doc.explain as RelyableExplainRow[])
      : [],
    modelVersion: doc.modelVersion,
    computedAt: iso(doc.computedAt) ?? new Date().toISOString(),
    reason: doc.reason || "recompute",
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
  };
}

export type RelyableSnapshotRepository = ReturnType<
  typeof createRelyableSnapshotRepository
>;

export function createRelyableSnapshotRepository() {
  const Model = getRelyableSnapshotModel();

  return {
    async create(
      organizationId: string,
      result: ScoreResult,
      reason = "recompute"
    ): Promise<RelyableSnapshot> {
      const created = await Model.create({
        organizationId,
        score: result.score,
        raw: result.raw,
        band: result.band,
        bandName: result.bandName,
        tier: result.tier,
        verifiedRatio: result.verifiedRatio,
        domains: result.domains,
        caps: result.caps,
        explain: result.explain,
        modelVersion: result.modelVersion,
        computedAt: new Date(result.computedAt),
        reason,
      });
      return toDomain(created.toObject() as RelyableSnapshotDocument);
    },

    async latest(organizationId: string): Promise<RelyableSnapshot | null> {
      const doc = await Model.findOne({ organizationId })
        .sort({ computedAt: -1 })
        .lean();
      if (!doc) return null;
      return toDomain(doc as RelyableSnapshotDocument);
    },

    async weekAgo(
      organizationId: string,
      now = new Date()
    ): Promise<RelyableSnapshot | null> {
      const cutoff = new Date(now.getTime() - 7 * 86_400_000);
      const doc = await Model.findOne({
        organizationId,
        computedAt: { $lte: cutoff },
      })
        .sort({ computedAt: -1 })
        .lean();
      if (!doc) return null;
      return toDomain(doc as RelyableSnapshotDocument);
    },
  };
}
