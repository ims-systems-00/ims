/**
 * Daily document / folder / repository review reminders.
 * Spec: docs/module-specifications/document-management.md
 *
 * - on_day is always sent
 * - org-selected advance offsets are also sent
 * - in-app notification + transactional email per recipient
 */

import type { EmailBranding } from "../../../infrastructure/email/templates";
import {
  DEFAULT_IMS_EMAIL_BRANDING,
  renderEmail,
} from "../../../infrastructure/email/templates";
import type { Logger } from "../../../infrastructure/logging/logger";
import {
  buildReminderMessage,
  computeRepoReviewDateOnOrAfter,
  formatReviewDateLabel,
  getEffectiveReminderOffsets,
  getReviewDateTargetForOffset,
  reminderTitle,
  utcDayRange,
  type DocumentReviewReminderEntityType,
} from "../lib/document-review-reminder-offsets";
import type {
  DocumentEmailPort,
  DocumentNotificationPort,
  DocumentReviewReminderOrgPort,
  DocumentUsersPort,
} from "../ports";
import { getDocumentReviewReminderModel } from "../repositories/document-review-reminder.model";
import type { DocumentRepositoryStore } from "../repositories/document-repository.repository";
import type { DocumentTreeStore } from "../repositories/document-tree.repository";
import type { DocumentRepository, DocumentTreeNode } from "../types";

type ReminderCandidate = {
  entityType: DocumentReviewReminderEntityType;
  entityId: string;
  organizationId: string;
  name: string;
  reviewDate: Date;
  recipientUserIds: string[];
  createdBy: string;
  repositoryId?: string;
};

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id?.trim())))];
}

function documentRecipients(
  node: DocumentTreeNode,
  repo?: DocumentRepository | null
): string[] {
  const owners = node.documentData?.owners ?? [];
  if (owners.length) return uniqueIds(owners);
  if (repo?.owners?.length) return uniqueIds(repo.owners);
  return uniqueIds([node.createdBy]);
}

function folderRecipients(
  node: DocumentTreeNode,
  repo?: DocumentRepository | null
): string[] {
  if (repo?.owners?.length) return uniqueIds([...repo.owners, node.createdBy]);
  return uniqueIds([node.createdBy]);
}

function repositoryRecipients(repo: DocumentRepository): string[] {
  if (repo.owners?.length) return uniqueIds(repo.owners);
  return uniqueIds([repo.createdBy]);
}

function entityLabel(type: DocumentReviewReminderEntityType): string {
  if (type === "folder") return "Folder";
  if (type === "repository") return "Repository";
  return "Document";
}

function viewPath(candidate: ReminderCandidate, baseUrl?: string): string | undefined {
  if (!baseUrl?.trim()) return undefined;
  const root = baseUrl.replace(/\/$/, "");
  if (candidate.entityType === "repository") {
    return `${root}/document-management/repositories/${candidate.entityId}`;
  }
  if (candidate.repositoryId) {
    return `${root}/document-management/repositories/${candidate.repositoryId}?nodeId=${candidate.entityId}`;
  }
  return `${root}/document-management`;
}

export type DocumentReviewReminderService = {
  processRun: (runDate?: Date) => Promise<number>;
};

export function createDocumentReviewReminderService(deps: {
  trees: DocumentTreeStore;
  repositories: DocumentRepositoryStore;
  organisations: DocumentReviewReminderOrgPort;
  notifications: DocumentNotificationPort;
  email?: DocumentEmailPort;
  users?: DocumentUsersPort;
  resolveEmailBranding?: (organizationId: string) => Promise<EmailBranding>;
  accessLinkBaseUrl?: string;
  logger?: Logger;
}): DocumentReviewReminderService {
  const {
    trees,
    repositories,
    organisations,
    notifications,
    email,
    users,
    resolveEmailBranding,
    accessLinkBaseUrl,
    logger,
  } = deps;
  const Ledger = getDocumentReviewReminderModel();

  async function brandingFor(organizationId: string): Promise<EmailBranding> {
    if (!resolveEmailBranding) return DEFAULT_IMS_EMAIL_BRANDING;
    try {
      return await resolveEmailBranding(organizationId);
    } catch {
      return DEFAULT_IMS_EMAIL_BRANDING;
    }
  }

  async function collectCandidates(input: {
    organizationId: string;
    targetStart: Date;
    targetEnd: Date;
  }): Promise<ReminderCandidate[]> {
    const [docs, folders, repos] = await Promise.all([
      trees.listDocumentsDueForReviewOnDay(
        input.organizationId,
        input.targetStart,
        input.targetEnd
      ),
      trees.listFoldersDueForReviewOnDay(
        input.organizationId,
        input.targetStart,
        input.targetEnd
      ),
      repositories.listActiveForReviewReminders(input.organizationId),
    ]);

    const repoById = new Map(repos.map((repo) => [repo.id, repo]));
    const candidates: ReminderCandidate[] = [];

    for (const node of docs) {
      const reviewDate = node.documentData?.reviewDate;
      if (!reviewDate) continue;
      const repo = repoById.get(node.repositoryId) ?? null;
      candidates.push({
        entityType: "document",
        entityId: node.id,
        organizationId: node.organizationId,
        name: node.name,
        reviewDate,
        recipientUserIds: documentRecipients(node, repo),
        createdBy: node.createdBy,
        repositoryId: node.repositoryId,
      });
    }

    for (const node of folders) {
      const reviewDate = node.folderData?.reviewDate;
      if (!reviewDate) continue;
      const repo = repoById.get(node.repositoryId) ?? null;
      candidates.push({
        entityType: "folder",
        entityId: node.id,
        organizationId: node.organizationId,
        name: node.name,
        reviewDate,
        recipientUserIds: folderRecipients(node, repo),
        createdBy: node.createdBy,
        repositoryId: node.repositoryId,
      });
    }

    for (const repo of repos) {
      const anniversary = computeRepoReviewDateOnOrAfter(
        repo.createdOn,
        repo.reviewInterval,
        input.targetStart
      );
      if (!anniversary) continue;
      if (
        anniversary.getTime() < input.targetStart.getTime() ||
        anniversary.getTime() >= input.targetEnd.getTime()
      ) {
        continue;
      }
      candidates.push({
        entityType: "repository",
        entityId: repo.id,
        organizationId: repo.organizationId,
        name: repo.name,
        reviewDate: anniversary,
        recipientUserIds: repositoryRecipients(repo),
        createdBy: repo.createdBy,
        repositoryId: repo.id,
      });
    }

    return candidates;
  }

  async function claimLedger(input: {
    organizationId: string;
    entityType: DocumentReviewReminderEntityType;
    entityId: string;
    offset: string;
    reviewDateKey: string;
  }): Promise<boolean> {
    try {
      await Ledger.create({
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        documentNodeId: input.entityId,
        offset: input.offset,
        reviewDateKey: input.reviewDateKey,
        sentOn: new Date(),
      });
      return true;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: number }).code
          : undefined;
      if (code === 11000) return false;
      logger?.error(
        { err: error, entityId: input.entityId, offset: input.offset },
        "Document review reminder ledger write failed"
      );
      return false;
    }
  }

  async function deliver(input: {
    candidate: ReminderCandidate;
    offset: string;
    reviewDateKey: string;
  }): Promise<number> {
    const { candidate, offset } = input;
    const recipients = candidate.recipientUserIds;
    if (recipients.length === 0) return 0;

    const reviewLabel = formatReviewDateLabel(candidate.reviewDate);
    const title = reminderTitle(candidate.entityType);
    const message = buildReminderMessage({
      entityType: candidate.entityType,
      name: candidate.name,
      reviewDateLabel: reviewLabel,
      offset,
    }).slice(0, 150);

    try {
      await notifications.notify({
        organizationId: candidate.organizationId,
        createdBy: candidate.createdBy || recipients[0]!,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title,
          message,
          referenceModuleId: candidate.entityId,
        })),
      });
    } catch (error) {
      logger?.error(
        { err: error, entityId: candidate.entityId },
        "Document review reminder notify failed"
      );
    }

    if (email && users) {
      try {
        const profiles = await users.findIdentitySummariesByIds(recipients);
        const emails = [
          ...new Set(
            profiles
              .map((profile) => profile.email?.trim().toLowerCase())
              .filter((value): value is string => Boolean(value))
          ),
        ];
        if (emails.length > 0) {
          const viewUrl = viewPath(candidate, accessLinkBaseUrl);
          const rendered = renderEmail(
            "document-review-reminder",
            {
              title,
              entityLabel: entityLabel(candidate.entityType),
              entityName: candidate.name,
              reviewDateLabel: reviewLabel,
              body: message,
              ...(viewUrl ? { viewUrl } : {}),
            },
            { branding: await brandingFor(candidate.organizationId) }
          );
          await email.sendDocumentEmail({
            to: emails,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            organizationId: candidate.organizationId,
          });
        }
      } catch (error) {
        logger?.error(
          { err: error, entityId: candidate.entityId },
          "Document review reminder email failed"
        );
      }
    }

    return recipients.length;
  }

  return {
    async processRun(runDate = new Date()) {
      const orgs = await organisations.listForReminders();
      let sent = 0;
      let dueCount = 0;

      for (const org of orgs) {
        const offsets = getEffectiveReminderOffsets(
          org.documentReviewReminderOffsets
        );

        for (const offset of offsets) {
          const target = getReviewDateTargetForOffset(runDate, offset);
          if (!target) continue;
          const { start, end, key } = utcDayRange(target);

          let candidates: ReminderCandidate[] = [];
          try {
            candidates = await collectCandidates({
              organizationId: org.id,
              targetStart: start,
              targetEnd: end,
            });
          } catch (error) {
            logger?.error(
              { err: error, organizationId: org.id, offset },
              "Document review reminder collect failed"
            );
            continue;
          }

          dueCount += candidates.length;

          for (const candidate of candidates) {
            const claimed = await claimLedger({
              organizationId: candidate.organizationId,
              entityType: candidate.entityType,
              entityId: candidate.entityId,
              offset,
              reviewDateKey: key,
            });
            if (!claimed) continue;

            sent += await deliver({
              candidate,
              offset,
              reviewDateKey: key,
            });
          }
        }
      }

      logger?.info(
        {
          organisationCount: orgs.length,
          dueCount,
          notificationsSent: sent,
          day: utcDayRange(runDate).key,
        },
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
