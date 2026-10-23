import type { ActivitiesApplicationPort } from "../../activities";
import type { ObjectStoragePort } from "../../files/ports";
import type { NotificationsApplicationPort } from "../../notifications";
import type { EmailSystem } from "../../../infrastructure/queue/create-email-system";
import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import type {
  DocumentActivityPort,
  DocumentEmailPort,
  DocumentFilesPort,
  DocumentMembershipPort,
  DocumentNotificationPort,
} from "../ports";

export function createDocumentMembershipAdapter(): DocumentMembershipPort {
  const memberships = createOrganisationMembershipRepository();
  return {
    async getRole(userId, organizationId) {
      const membership = await memberships.findByUserAndOrg(
        userId,
        organizationId
      );
      return membership?.role ?? null;
    },
    async listOrganizationIdsForUser(userId) {
      return memberships.listOrganizationIdsForUser(userId);
    },
  };
}

export function createDocumentEmailAdapter(
  email: EmailSystem | undefined
): DocumentEmailPort {
  return {
    async sendDocumentEmail(input) {
      if (!email) return;
      await email.sendTransactional({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        category: "transactional",
        organizationId: input.organizationId,
      });
    },
  };
}

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

    async createViewUrl(meta) {
      return storage.createViewUrl({
        bucket: meta.Bucket,
        key: meta.Key || meta.key,
        expiresInSeconds: 43_200,
        downloadFileName: meta.Name,
        // View links (share redirect, signed-copy email) must render in
        // the browser, not force a download.
        disposition: "inline",
      });
    },

    async readStoredFile(meta) {
      const url = await storage.createViewUrl({
        bucket: meta.Bucket,
        key: meta.Key || meta.key,
        expiresInSeconds: 600,
      });
      if (url.startsWith("memory://")) {
        throw new Error("Stored file bytes are not available (memory storage)");
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unable to read stored file (${response.status})`);
      }
      return Buffer.from(await response.arrayBuffer());
    },

    async writeStoredFile(input) {
      const { randomUUID } = await import("node:crypto");
      const extIndex = input.fileName.lastIndexOf(".");
      const ext = extIndex > 0 ? input.fileName.slice(extIndex + 1) : "";
      const key = ext ? `${randomUUID()}.${ext}` : randomUUID();
      const url = await storage.createUploadUrl({
        bucket: input.bucket,
        key,
        expiresInSeconds: 600,
        contentType: input.contentType,
        contentLength: input.body.byteLength,
      });
      if (url.startsWith("memory://")) {
        throw new Error("Stored file bytes are not available (memory storage)");
      }
      const response = await fetch(url, {
        method: "PUT",
        body: new Uint8Array(input.body),
        headers: { "Content-Type": input.contentType },
      });
      if (!response.ok) {
        throw new Error(`Unable to store file (${response.status})`);
      }
      return {
        Name: input.fileName,
        Key: key,
        key,
        Bucket: input.bucket,
      };
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
