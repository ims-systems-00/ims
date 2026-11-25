import type { TenderLogEntry } from "../types";
import {
  getTenderAuditLogModel,
  type TenderAuditLogDocument,
} from "./tender-audit-log.model";

function toDomain(doc: TenderAuditLogDocument): TenderLogEntry {
  return { t: doc.t, by: doc.by, what: doc.what };
}

export type TenderAuditLogRepository = ReturnType<
  typeof createTenderAuditLogRepository
>;

export function createTenderAuditLogRepository() {
  const Model = getTenderAuditLogModel();

  return {
    async append(
      organizationId: string,
      entry: TenderLogEntry
    ): Promise<void> {
      await Model.create({
        organizationId,
        t: entry.t,
        by: entry.by,
        what: entry.what,
      });
    },

    async appendMany(
      organizationId: string,
      entries: TenderLogEntry[]
    ): Promise<void> {
      if (!entries.length) return;
      await Model.insertMany(
        entries.map((e) => ({
          organizationId,
          t: e.t,
          by: e.by,
          what: e.what,
        }))
      );
    },

    async listRecent(
      organizationId: string,
      limit = 200
    ): Promise<TenderLogEntry[]> {
      const docs = await Model.find({ organizationId })
        .sort({ createdAt: -1 })
        .limit(Math.min(Math.max(limit, 1), 400))
        .lean();
      return docs.map((d) => toDomain(d as TenderAuditLogDocument));
    },
  };
}
