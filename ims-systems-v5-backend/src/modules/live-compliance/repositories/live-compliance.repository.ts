/**
 * Live Compliance repository — advice lifecycle + activity feed.
 */

import type { AdviceItem, LiveActivity } from "../types";
import {
  getAdviceStateModel,
  getComplianceActivityModel,
  getLiveComplianceOrgStateModel,
} from "./live-compliance.models";

export type AdviceState = {
  adviceId: string;
  firstSeenAt: Date;
  snoozedUntil: Date | null;
  resolvedAt: Date | null;
};

export type LiveComplianceRepository = ReturnType<
  typeof createLiveComplianceRepository
>;

export function createLiveComplianceRepository() {
  const Advice = getAdviceStateModel();
  const Activity = getComplianceActivityModel();
  const OrgState = getLiveComplianceOrgStateModel();

  return {
    async listAdviceStates(organizationId: string): Promise<AdviceState[]> {
      const docs = await Advice.find(
        { organizationId },
        { adviceId: 1, firstSeenAt: 1, snoozedUntil: 1, resolvedAt: 1 }
      )
        .lean()
        .exec();
      return docs.map((d) => ({
        adviceId: d.adviceId,
        firstSeenAt: d.firstSeenAt,
        snoozedUntil: d.snoozedUntil ?? null,
        resolvedAt: d.resolvedAt ?? null,
      }));
    },

    /**
     * Upsert the advice items currently present (re-opening resolved ones) and
     * mark items no longer present as resolved. Returns ids seen for the first time.
     */
    async syncAdvice(
      organizationId: string,
      items: AdviceItem[],
      now: Date
    ): Promise<string[]> {
      const existing = new Map(
        (await this.listAdviceStates(organizationId)).map((s) => [s.adviceId, s])
      );
      const presentIds = new Set(items.map((i) => i.id));
      const fresh = items.filter((i) => !existing.has(i.id)).map((i) => i.id);

      const ops: Parameters<typeof Advice.bulkWrite>[0] = items.map((item) => ({
        updateOne: {
          filter: { organizationId, adviceId: item.id },
          update: {
            $set: {
              module: item.module,
              clause: item.clause,
              severity: item.severity,
              title: item.title,
              lastSeenAt: now,
              resolvedAt: null,
            },
            $setOnInsert: { firstSeenAt: now, snoozedUntil: null, snoozedBy: null },
          },
          upsert: true,
        },
      }));
      const resolved = [...existing.values()]
        .filter((s) => !presentIds.has(s.adviceId) && !s.resolvedAt)
        .map((s) => s.adviceId);
      if (resolved.length) {
        ops.push({
          updateMany: {
            filter: { organizationId, adviceId: { $in: resolved } },
            update: { $set: { resolvedAt: now } },
          },
        });
      }
      if (ops.length) await Advice.bulkWrite(ops, { ordered: false });
      return fresh;
    },

    async snooze(
      organizationId: string,
      adviceId: string,
      until: Date,
      userId: string
    ): Promise<boolean> {
      const result = await Advice.updateOne(
        { organizationId, adviceId },
        { $set: { snoozedUntil: until, snoozedBy: userId } }
      ).exec();
      return result.matchedCount > 0;
    },

    async addActivity(
      organizationId: string,
      entries: Array<{
        source: string;
        text: string;
        at: Date;
        actorUserId?: string | null;
        clause?: string | null;
      }>
    ): Promise<void> {
      if (!entries.length) return;
      await Activity.insertMany(
        entries.map((e) => ({
          organizationId,
          source: e.source,
          text: e.text,
          at: e.at,
          actorUserId: e.actorUserId ?? null,
          clause: e.clause ?? null,
        }))
      );
    },

    /**
     * Atomically claim the daily digest for `day`. Returns false when it was
     * already claimed (by this or another instance).
     */
    async claimDigest(organizationId: string, day: string): Promise<boolean> {
      try {
        const result = await OrgState.updateOne(
          { organizationId, lastDigestOn: { $ne: day } },
          { $set: { lastDigestOn: day } },
          { upsert: true }
        ).exec();
        return result.modifiedCount > 0 || result.upsertedCount > 0;
      } catch (error) {
        // Duplicate key: the row exists and already holds `day`.
        if ((error as { code?: number }).code === 11000) return false;
        throw error;
      }
    },

    async journeyCompleted(organizationId: string): Promise<string[]> {
      const doc = await OrgState.findOne({ organizationId }, { journeyCompleted: 1 }).lean().exec();
      return [...(doc?.journeyCompleted ?? [])];
    },

    async setJourneyStep(organizationId: string, stepId: string, done: boolean): Promise<void> {
      await OrgState.updateOne(
        { organizationId },
        done ? { $addToSet: { journeyCompleted: stepId } } : { $pull: { journeyCompleted: stepId } },
        { upsert: true }
      ).exec();
    },

    async listActivity(organizationId: string, limit: number): Promise<LiveActivity[]> {
      const docs = await Activity.find({ organizationId })
        .sort({ at: -1, _id: -1 })
        .limit(limit)
        .lean()
        .exec();
      return docs.map((d) => ({
        id: String(d._id),
        source: d.source,
        text: d.text,
        at: d.at.toISOString(),
      }));
    },
  };
}
