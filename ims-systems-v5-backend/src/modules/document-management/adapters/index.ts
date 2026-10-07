import type { ActivitiesApplicationPort } from "../../activities";
import type { ObjectStoragePort } from "../../files/ports";
import type { NotificationsApplicationPort } from "../../notifications";
import type {
  DocumentActivityPort,
  DocumentFilesPort,
  DocumentNotificationPort,
} from "../ports";

export function createDocumentFilesAdapter(
  storage: ObjectStoragePort
): DocumentFilesPort {
  return {
    async deleteStoredFile(meta) {
      await storage.deleteObject({
        bucket: meta.Bucket,
        key: meta.Key || meta.key,
      });
    },
  };
}

export function createDocumentActivityAdapter(
  activities: ActivitiesApplicationPort
): DocumentActivityPort {
  return {
    async record(input) {
      await activities.recordAutomated(input.organizationId, {
        moduleType: "documenttrees",
        moduleId: input.moduleId,
        value: input.value,
        createdBy: input.createdBy,
        metaInfo: input.threadId
          ? { threadId: input.threadId }
          : undefined,
      });
    },
  };
}

export function createDocumentNotificationAdapter(
  notifications: NotificationsApplicationPort
): DocumentNotificationPort {
  return {
    async notify(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        recipients: input.recipients.map((recipient) => ({
          recipientUserId: recipient.recipientUserId,
          title: recipient.title,
          message: recipient.message,
          referenceType: "documents" as const,
          referenceModuleId: recipient.referenceModuleId,
          screenIdentifier: "document-repositories",
        })),
      });
    },
  };
}
