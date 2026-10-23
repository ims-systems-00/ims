/**
 * Background migration runner — transforms rows and inserts in batches of 250.
 * Spec: docs/module-specifications/data-import.md §9
 */

import type { SecurityIdentity } from "../../../security";
import type { Logger } from "../../../infrastructure/logging/logger";
import type {
  DataImportNotificationPort,
  DataImportTargetWriterPort,
} from "../ports";
import type { DataImportJob } from "../types";
import { transformDataSet } from "./validation.service";

const BATCH_SIZE = 250;

function formatDuration(startedAt: Date, finishedAt: Date): string {
  const ms = Math.max(0, finishedAt.getTime() - startedAt.getTime());
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function createDataImportMigrator(deps: {
  writer: DataImportTargetWriterPort;
  notifications: DataImportNotificationPort;
  logger?: Logger;
}) {
  const { writer, notifications, logger } = deps;

  return {
    async run(job: DataImportJob): Promise<void> {
      const startedAt = new Date(job.startedAt);
      const identity: SecurityIdentity = {
        subjectId: job.importerId,
        organizationId: job.organizationId,
      };

      const rows = transformDataSet({
        module: job.module,
        dateFormat: job.dateFormat,
        dataMap: job.dataMap,
        dataSet: job.dataSet,
      });

      try {
        for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
          const batch = rows.slice(offset, offset + BATCH_SIZE);
          for (const row of batch) {
            await writer.insertRow({
              identity,
              module: job.module,
              row,
            });
          }
        }
      } catch (error) {
        logger?.error(
          {
            module: job.module,
            organizationId: job.organizationId,
            err: error instanceof Error ? error.message : String(error),
          },
          "Data import batch failed — earlier rows may already be committed"
        );
        // Spec: no failure notification on insertion error.
        return;
      }

      const finishedAt = new Date();
      await notifications.notifyImportCompleted({
        organizationId: job.organizationId,
        actorId: job.importerId,
        module: job.module,
        startedAt,
        durationLabel: formatDuration(startedAt, finishedAt),
      });
    },
  };
}

export type DataImportMigrator = ReturnType<typeof createDataImportMigrator>;
