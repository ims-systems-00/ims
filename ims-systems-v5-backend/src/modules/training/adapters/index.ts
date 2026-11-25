import { randomUUID } from "node:crypto";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { ObjectStoragePort } from "../../files/ports";
import type {
  TrainingEmailPort,
  TrainingFilesPort,
  TrainingNotificationPort,
  TrainingOrgMember,
  TrainingOrgPort,
  TrainingUsersPort,
} from "../ports";

function toContentBase64(content: Buffer | string): string {
  if (typeof content === "string") {
    return Buffer.from(content, "utf8").toString("base64");
  }
  return content.toString("base64");
}

export function createTrainingEmailAdapter(
  email: EmailSystem | undefined
): TrainingEmailPort {
  return {
    async send(input) {
      if (!email) {
        throw new Error("Email system is not configured");
      }
      await email.sendTransactional({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        category: "transactional",
        organizationId: input.organizationId,
        attachments: input.attachments?.map((item) => ({
          filename: item.filename,
          contentBase64: toContentBase64(item.content),
          type: item.contentType,
          disposition: "attachment" as const,
        })),
      });
    },
  };
}

export function createTrainingFilesAdapter(
  storage: ObjectStoragePort,
  options?: {
    resolveBucket?: (organizationId: string) => string;
  }
): TrainingFilesPort {
  const resolveBucket =
    options?.resolveBucket ??
    ((organizationId: string) => `ims-v5-${organizationId}`);

  return {
    async createViewUrl(meta) {
      return storage.createViewUrl({
        bucket: meta.Bucket,
        key: meta.Key || meta.key || "",
        expiresInSeconds: 43_200,
        downloadFileName: meta.Name,
        disposition: "inline",
      });
    },
    async createSignedUpload(input) {
      const originalName = input.fileName.trim() || "upload.bin";
      const extIndex = originalName.lastIndexOf(".");
      const ext = extIndex > 0 ? originalName.slice(extIndex + 1) : "";
      const key = ext ? `${randomUUID()}.${ext}` : randomUUID();
      const bucket = resolveBucket(input.organizationId);
      const url = await storage.createUploadUrl({
        bucket,
        key,
        expiresInSeconds: 900,
        contentType: input.contentType,
        contentLength: input.fileSize,
      });
      return {
        url,
        storageInfo: {
          Name: originalName,
          Key: key,
          key,
          Bucket: bucket,
          Size: input.fileSize,
        },
      };
    },
  };
}

export function createTrainingOrgAdapter(deps: {
  getName: (organizationId: string) => Promise<string | null>;
}): TrainingOrgPort {
  return {
    async getOrganizationName(organizationId) {
      return (await deps.getName(organizationId)) || "Organisation";
    },
  };
}

export function createTrainingNotificationAdapter(deps: {
  notify: (input: {
    organizationId: string;
    userId?: string;
    title: string;
    body: string;
  }) => Promise<void>;
}): TrainingNotificationPort {
  return {
    async notifyPerson(input) {
      await deps.notify(input);
    },
  };
}

export function createTrainingUsersAdapter(deps: {
  listMembers: (organizationId: string) => Promise<TrainingOrgMember[]>;
}): TrainingUsersPort {
  return {
    async listOrgMembers(organizationId) {
      return deps.listMembers(organizationId);
    },
  };
}
