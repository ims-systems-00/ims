/**
 * Daily document review reminders (on-day).
 * Spec: docs/module-specifications/notifications.md / document-management.md
 */

import type { Logger } from "../../../infrastructure/logging/logger";
import type { DocumentNotificationPort } from "../ports";
import { getDocumentReviewReminderModel } from "../repositories/document-review-reminder.model";
import type { DocumentTreeStore } from "../repositories/document-tree.repository";

function utcDayRange(runDate: Date): { start: Date; end: Date; key: string } {
  const start = new Date(
    Date.UTC(
      runDate.getUTCFullYear(),
      runDate.getUTCMonth(),
      runDate.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const key = start.toISOString().slice(0, 10);
  return { start, end, key };
}

function formatReviewDate(date: Date): string {
  try {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export type DocumentReviewReminderService = {
  processRun: (runDate?: Date) => Promise<number>;
};

export function createDocumentReviewReminderService(deps: {
  trees: DocumentTreeStore;
  notifications: DocumentNotificationPort;
  logger?: Logger;
}): DocumentReviewReminderService {
  const { trees, notifications, logger } = deps;
  const Ledger = getDocumentReviewReminderModel();

  return {
    async processRun(runDate = new Date()) {
      const { start, end, key } = utcDayRange(runDate);
      const due = await trees.listDueForReviewOnDay(start, end);
      let sent = 0;

      for (const node of due) {
        const owners = node.documentData?.owners ?? [];
        const recipients = [...new Set(owners.length ? owners : [node.createdBy])]
          .filter(Boolean);
        if (recipients.length === 0) continue;

        try {
          await Ledger.create({
            organizationId: node.organizationId,
            documentNodeId: node.id,
            offset: "on_day",
            reviewDateKey: key,
            sentOn: new Date(),
          });
        } catch (error) {
          // Duplicate key → already reminded for this day.
          const code =
            error && typeof error === "object" && "code" in error
              ? (error as { code?: number }).code
              : undefined;
          if (code === 11000) continue;
          logger?.error(
            { err: error, documentNodeId: node.id },
            "Document review reminder ledger write failed"
          );
          continue;
        }

        const reviewLabel = node.documentData?.reviewDate
          ? formatReviewDate(node.documentData.reviewDate)
          : key;

        try {
          await notifications.notify({
            organizationId: node.organizationId,
            createdBy: node.createdBy,
            recipients: recipients.map((recipientUserId) => ({
              recipientUserId,
              title: "Document review due",
              message: `Document "${node.name}" is due for review today (${reviewLabel}).`.slice(
                0,
                150
              ),
              referenceModuleId: node.id,
            })),
          });
          sent += recipients.length;
        } catch (error) {
          logger?.error(
            { err: error, documentNodeId: node.id },
            "Document review reminder notify failed"
          );
        }
      }

      logger?.info(
        { dueCount: due.length, notificationsSent: sent, day: key },
        "Document review reminders processed"
      );
      return sent;
    },
  };
}

/**
 * Run once shortly after boot, then every 24 hours.
 * Returns a stop function.
 */
export function startDocumentReviewReminderSchedule(deps: {
  service: DocumentReviewReminderService;
  logger?: Logger;
  /** Delay before first run (ms). Default 30s. */
  initialDelayMs?: number;
  /** Interval between runs (ms). Default 24h. */
  intervalMs?: number;
}): () => void {
  const {
    service,
    logger,
    initialDelayMs = 30_000,
    intervalMs = 24 * 60 * 60 * 1000,
  } = deps;

  let stopped = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  const run = () => {
    if (stopped) return;
    void service.processRun().catch((error) => {
      logger?.error({ err: error }, "Document review reminder run failed");
    });
  };

  const initial = setTimeout(() => {
    if (stopped) return;
    run();
    interval = setInterval(run, intervalMs);
    interval.unref?.();
  }, initialDelayMs);
  initial.unref?.();

  logger?.info(
    { initialDelayMs, intervalMs },
    "Document review reminder schedule started"
  );

  return () => {
    stopped = true;
    clearTimeout(initial);
    if (interval) clearInterval(interval);
  };
}
